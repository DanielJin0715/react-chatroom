import _ from 'lodash';
import React from 'react';
import d3 from 'd3';
import TestUtils from 'react-addons-test-utils';
import {expect} from 'chai';

import {
  isValidScale,
  innerRangeX,
  innerRangeY
} from 'utils/Scale';

import resolveXYScales from '../../src/utils/resolveXYScales';

class NotImplementedError extends Error {
  constructor(message = "Not Implemented Yet") {
    super(message);
  }
}

function expectRefAndDeepEqual(a, b) {
  expect(a).to.equal(b);
  expect(a).to.deep.equal(b);
}

function expectXYScales(scales) {
  expect(scales).to.be.an('object');
  ['x', 'y'].forEach(k => {
    expect(scales).to.have.property(k);
    expect(isValidScale(scales[k])).to.equal(true);
  });
}

function expectXYScaledComponent(rendered, {width, height, scaleType, domain, margin, range}) {
  // checks that a given rendered component has been created with XY scales/margin
  // that match the expected domain, range & margin
  // if range not provided, it should be width/height minus margins
  range = range || {x: innerRangeX(width, margin), y: innerRangeY(height, margin)};
  expect(scaleType).to.be.an('object');

  expect(rendered.props).to.be.an('object');
  expect(rendered.props.margin).to.deep.equal(margin);

  const renderedScale = rendered.props.scale;
  expectXYScales(renderedScale);
  ['x', 'y'].forEach(k => {
    expect(rendered.props.scaleType[k]).to.equal(scaleType[k]);
    expect(renderedScale[k].domain()).to.deep.equal(domain[k]);
    expect(renderedScale[k].range()).to.deep.equal(range[k]);
  });
}

describe('resolveXYScales', () => {
  const testScaleType = {x: 'ordinal', y: 'linear'};
  const testDomain = {x: [-5, 5], y: [0, 10]};
  const testMargin = {top: 10, bottom: 20, left: 30, right: 40};
  const width = 500;
  const height = 400;

  // test fixture component classes
  class ComponentWithChildren extends React.Component {
    render() {
      console.log('props', this.props);
      console.log('scale', this.props.scale.x.domain(), this.props.scale.y.domain());
      console.log('domain', this.props.domain.x, this.props.domain.y);
      return <div>{this.props.children}</div>;
    }
  }

  class XYChart extends React.Component {
    render() {
      console.log('props', this.props);
      console.log('scale', this.props.scale.x.domain(), this.props.scale.y.domain());
      return <div>{this.props.children}</div>;
    }
  }
  const ScaledXYChart = resolveXYScales(XYChart);

  class ChartWithCustomScaleType extends ComponentWithChildren {
    static getScaleType(props) { return testScaleType; }
  }
  const ScaledChartWithCustomScaleType = resolveXYScales(ChartWithCustomScaleType);

  class ChartWithCustomDomain extends ComponentWithChildren {
    static getDomain(props) { return testDomain; }
  }
  const ScaledChartWithCustomDomain = resolveXYScales(ChartWithCustomDomain);

  class ChartWithCustomMargin extends ComponentWithChildren {
    static getMargin(props) { return testMargin; }
  }
  const ScaledChartWithCustomMargin = resolveXYScales(ChartWithCustomMargin);

  class ContainerChart extends React.Component {
    render() {
      const {scale, scaleType, margin, domain} = this.props;
      const newChildren = React.Children.map(this.props.children, (child, i) => {
        return React.cloneElement(child, {scale, scaleType, margin, domain});
      });
      return <div>{newChildren}</div>;
    }
  }
  const ScaledContainerChart = resolveXYScales(ContainerChart);

  class XYPlot extends React.Component {
    static defaultProps = {};
    static getDomain(props) {
      return testDomain;
    }
    static getMargin(props) {
      return testMargin;
    }
    render() {
      return <div>{this.props.children}</div>;
    }
  }
  const ScaledXYPlot = resolveXYScales(XYPlot);



  function renderAndGetXYPlot(plotProps, chartProps) {
    const wrapped = TestUtils.renderIntoDocument(
      //<ScaledXYChart {...plotProps}><LineChart {...chartProps}/></ScaledXYChart>
      <ScaledXYPlot {...plotProps} />
    );
    return TestUtils.findRenderedComponentWithType(wrapped, XYPlot);
  }


  it('passes XY scales and margins through if both are provided', () => {
    const props = {
      scale: {
        x: d3.scale.linear().domain([-1, 1]).range([0, 400]),
        y: d3.scale.linear().domain([-2, 2]).range([10, 300])
      },
      margin: {top: 11, bottom: 21, left: 31, right: 41}
    };
    const rendered = renderAndGetXYPlot(props);

    ['scale', 'margin'].forEach(propKey => {
      expectRefAndDeepEqual(rendered.props[propKey], props[propKey]);
    })
  });

  it('creates scales from scaleType, size, domain & margins', () => {
    const props = {
      width, height,
      scaleType: {x: 'linear', y: 'ordinal'},
      domain: {x: [-50, 50], y: [-100, 100]},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledXYChart {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, XYChart);
    expectXYScaledComponent(rendered, props);
  });


  it('infers scaleType from Component.getScaleType, creates scales from size, domain and margins', () => {
    const props = {
      width, height,
      domain: {x: [-50, 50], y: [-100, 100]},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledChartWithCustomScaleType {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ChartWithCustomScaleType);
    expectXYScaledComponent(rendered, {scaleType: testScaleType, ...props});
  });

  it('infers scaleType from data, creates scales from size, domain and margins', () => {
    const props = {
      width, height,
      data: [[12, 'a'], [18, 'b'], [22, 'c']],
      getValue: {x: 0, y: 1},
      domain: {x: [12, 22], y: ['a', 'b', 'c']},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledXYChart {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, XYChart);
    expectXYScaledComponent(rendered, {scaleType: {x: 'linear', y: 'ordinal'}, ...props});
  });

  it('infers scaleType from children getScaleType, creates scales from size, domain & margins', () => {
    const props = {
      width, height,
      domain: {x: [12, 22], y: [2, 3]},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const tree = <ScaledContainerChart {...props}><ScaledChartWithCustomScaleType a="1"/></ScaledContainerChart>;
    const wrapped = TestUtils.renderIntoDocument(tree);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ContainerChart);
    expectXYScaledComponent(rendered, {scaleType: testScaleType, ...props});
  });

  it('infers scaleType from children data, creates scales from size, domain & margins', () => {
    const props = {
      width, height,
      domain: {x: [12, 22], y: ['a', 'b', 'c']},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const chartProps = {
      data: [[12, 'a'], [18, 'b'], [22, 'c']],
      getValue: {x: 0, y: 1}
    };
    const tree = <ScaledContainerChart {...props}><ScaledXYChart {...chartProps}/></ScaledContainerChart>;
    const wrapped = TestUtils.renderIntoDocument(tree);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ContainerChart);
    expectXYScaledComponent(rendered, {scaleType: {x: 'linear', y: 'ordinal'}, ...props});
  });


  it('infers domain from Component.getDomain, creates scales from scaleType, size and margins', () => {
    const props = {
      width, height,
      scaleType: {x: 'linear', y: 'linear'},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledChartWithCustomDomain {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ChartWithCustomDomain);
    expectXYScaledComponent(rendered, {domain: testDomain, ...props});
  });

  it('infers domain from data, creates scales from scaleType, size and margins', () => {
    const props = {
      width, height,
      scaleType: {x: 'linear', y: 'linear'},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledChartWithCustomDomain {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ChartWithCustomDomain);
    expectXYScaledComponent(rendered, {domain: testDomain, ...props});
  });

  it('infers domain from children getDomain, creates scales from scaleType, size and margins', () => {
    const props = {
      width, height,
      scaleType: {x: 'linear', y: 'linear'},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const tree = <ScaledContainerChart {...props}><ScaledChartWithCustomDomain /></ScaledContainerChart>;
    const wrapped = TestUtils.renderIntoDocument(tree);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ContainerChart);
    expectXYScaledComponent(rendered, {domain: testDomain, ...props});
  });

  it('infers domain from children data, creates scales from scaleType, size and margins', () => {
    const props = {
      width, height,
      scaleType: {x: 'linear', y: 'linear'},
      margin: {top: 11, bottom: 22, left: 33, right: 44}
    };
    const tree = <ScaledContainerChart {...props}>
      <ScaledXYChart data={[[0, 2], [3, 5]]} getValue={{x: 0, y: 1}} />
      <ScaledXYChart data={[[-2, 0], [2, 4]]} getValue={{x: 0, y: 1}} />
    </ScaledContainerChart>;
    const wrapped = TestUtils.renderIntoDocument(tree);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, ContainerChart);
    expectXYScaledComponent(rendered, {domain: {x: [-2, 3], y: [0, 5]}, ...props});
  });


  /*

  it('resolves XY scales from size, data and margins', () => {
    const props = {
      width: 500,
      height: 300,
      margin: {top: 11, bottom: 22, left: 33, right: 44},
      // data doesn't actually matter, since XYChart.getDomain returns a constant
      data: [{x: 10, y: 20}]
    };
    const rendered = renderAndGetXYPlot(props);
    expectXYScaledComponent(rendered, {domain: testDomain, ...props});
  });

  it('resolves XY scales and margins from data and size', () => {
    const props = {
      width: 500,
      height: 300,
      data: [{x: 10, y: 20}]
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledXYChart {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, XYPlot);

    expect(rendered.props.margin).to.equal(testMargin);
    expectXYScaledComponent(rendered, {margin: testMargin, domain: testDomain, ...props});
  });

  it('resolves XY scales and margins from domain and size', () => {
    const props = {
      width: 500,
      height: 300,
      domain: {x: [-50, 50], y: [-100, 100]}
    };
    const wrapped = TestUtils.renderIntoDocument(<ScaledXYChart {...props} />);
    const rendered = TestUtils.findRenderedComponentWithType(wrapped, XYPlot);

    expect(rendered.props.margin).to.equal(testMargin);
    expectXYScaledComponent(rendered, {margin: testMargin, ...props});
  });

  it('sets margins to zero if they are neither provided nor resolvable', () => {
    console.log('not implemented');
    //throw new NotImplementedError();
  });

  it('throws if domains are neither provided nor resolvable', () => {
    //throw new NotImplementedError();
    console.log('not implemented');
  });

  it('throws if neither XY scales nor size are provided', () => {
    console.log('not implemented');
    //throw new NotImplementedError();
  });

  it('throws if neither XY scales nor (domain or data) are provided', () => {
    console.log('not implemented');
    //throw new NotImplementedError();
  });

  */

  // todo test partially specified margins
  // todo test partially specified scales
  // todo resolve internal chart padding also
  // todo: resolves margins if scales are present?
  // todo: handle resolving different types of scales? use axisType
  // todo: test with thin layers of components (w/o getDomain) in between?
  // todo: test when one scale or domain is passed but not the other?
});
