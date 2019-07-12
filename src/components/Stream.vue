<template>
  <div id="stream">
    <div id="detail">
      <svg></svg>
      <div id="info"></div>
    </div>
    <div id="overview">
      <svg></svg>
    </div>
  </div>
</template>
<script>
import * as d3 from 'd3';
import { mapState, mapGetters, mapActions } from 'vuex';
import { lusolve } from 'mathjs';
import { getCubicRoots } from 'cubic-roots';
import Utils from '../utils';

export default {
  name: 'Stream',
  data() {
    return {
      streams: {},
      isHighlight: {},
      splitPoints: [],
      detailSvg: null,
      detailSvgRect: null,
      detailPadding: { left: 75, right: 50, top: 40, bottom: 60 },
      detailRange: [],
    };
  },
  computed: {
    ...mapState(['data', 'hoveringNodeName']),
    ...mapGetters(['treeData', 'treeColors']),

    tree() {
      if (!this.treeData) return null;
      return d3.hierarchy(this.treeData);
    },

    // 省级的记录，{name: [val, val, ...]}
    recordsLev2() {
      if (!this.tree) return null;

      const records = {};
      this.tree.children.forEach((g) => {
        g.children.forEach((p) => {
          records[p.data.name] = [];
        });
      });
      this.data.forEach((dataItem) => {
        dataItem.data.forEach((p) => {
          records[p.name].push(p.sum);
        });
      });

      return records;
    },

    // 大区级的记录，{name: [val, val, ...]}
    recordsLev1() {
      if (!this.tree) return null;

      const records = {};
      this.tree.children.forEach((g) => {
        records[g.data.name] = new Array(this.data.length).fill(0)
          .map((v, i) => g.children.reduce((pre, cur) => pre + this.recordsLev2[cur.data.name][i], 0));
      });

      return records;
    },

    // 大区级的d3流数据
    streamLev1() {
      return this.getStream(this.recordsLev1);
    },

    // 省级的d3流数据
    streamLev2() {
      return this.getStream(this.recordsLev2);
    },

    // 基于分辨率划分点的分段xScale函数，用vue的reactive自动更新
    detailXScale() {
      return this.getXScale(this.splitPoints, this.detailRange);
    },

    detailYScale() {
      const streamBound = this.getStreamBound(this.streamLev1);
      const scope = {
        top: this.detailPadding.top,
        bottom: this.detailSvgRect.height - this.detailPadding.bottom,
      };
      return d3.scaleLinear()
        .domain(streamBound)
        .range([scope.top, scope.bottom]);
    },
  },
  mounted() {
    const svg = document.querySelector('#detail svg');
    this.detailSvg = d3.select(svg);
    const rect = this.detailSvgRect = svg.getBoundingClientRect();
    this.detailRange = [
      this.detailPadding.left,
      rect.width - this.detailPadding.right,
    ];
  },
  watch: {
    recordsLev1() {
      // 初始化划分点
      const portions = [0, 0.4, 0.46, 0.54, 0.6, 1];
      this.splitPoints = portions.map(v => Math.floor((this.data.length - 1) * v));

      // 初始化是否高亮的字典
      Object.keys(this.recordsLev1).forEach(k => this.isHighlight[k] = false);
      Object.keys(this.recordsLev2).forEach(k => this.isHighlight[k] = false);

      // 画overview
      const target = document.querySelector('#overview svg');
      this.drawOverview(target, this.recordsLev1, this.treeColors, this.splitPoints);

      // 画detail
      this.updateDetail(this.splitPoints);
    },

    hoveringNodeName() {
      // 每当鼠标悬停需要高亮时
      const isHighlight = this.isHighlight;
      if (this.hoveringNodeName) {
        let names = null;
        this.tree.each((n) => {
          if (n.data.name === this.hoveringNodeName) {
            names = n.descendants().map(d => d.data.name);
          }
        });
        Object.keys(isHighlight).forEach((k) => {
          const index = names.indexOf(k);
          if (index >= 0) {
            isHighlight[k] = true;
          } else {
            isHighlight[k] = false;
          }
        });
      } else {
        Object.keys(isHighlight).forEach((k) => {
          isHighlight[k] = true;
        });
      }
      d3.selectAll('#detail path')
        .attr('fill-opacity', d => (isHighlight[d.key] ? 1 : 0.3));
    },
  },
  methods: {
    ...mapActions(['setHoveringNodeName']),
    // 测试数据随机生成：一个4层的流图
    // num：每个layer中包含的points数量
    // 返回值：数组
    getTestStackData(num) {
      return new Array(num).fill(0).map((v, i) => ({
        id: i,
        a: Utils.math.getRandomInteger(10, 100),
        b: Utils.math.getRandomInteger(10, 100),
        c: Utils.math.getRandomInteger(10, 100),
        d: Utils.math.getRandomInteger(10, 100),
        e: Utils.math.getRandomInteger(10, 100),
        f: Utils.math.getRandomInteger(10, 100),
      }));
    },

    getStackData(data) {
      const len = this.data.length;
      const keys = Object.keys(data);
      return new Array(len).fill(0).map((v, i) => {
        const elem = { id: i };
        keys.forEach((k) => {
          elem[k] = data[k][i];
        });
        return elem;
      });
    },

    getStream(data) {
      const streamData = this.getStackData(data);
      const keys = Object.keys(data);
      const stackLayout = d3.stack().keys(keys).offset(d3.stackOffsetWiggle);
      return stackLayout(streamData);
    },

    drawOverview(target, records, colorDict, points) {
      // 画大区级别的流
      const stream = this.streamLev1;
      const colors = Object.keys(records).map(k => colorDict[k]);
      const rect = target.getBoundingClientRect();
      const padding = { left: 75, right: 50, top: 50, bottom: 50 };
      const scope = { top: padding.top, bottom: rect.height - padding.bottom };
      const len = Object.values(records)[0].length;
      const xScale = d3.scaleLinear()
        .domain([0, len - 1])
        .range([padding.left, rect.width - padding.right]);

      this.drawStream(stream, colors, target, scope, xScale);

      d3.select('#overview svg').append('rect');

      // 画那些可以拖的bar
      const barColors = ['red', 'blue', 'grey', 'grey', 'blue', 'red'];
      let draggingPointId = null;
      d3.select('#overview svg').selectAll('.bar')
        .data(points)
        .enter()
        .append('line')
        .classed('bar', true)
        .attr('x1', xScale)
        .attr('x2', xScale)
        .attr('y1', padding.top)
        .attr('y2', rect.height - padding.bottom)
        .attr('stroke', (d, i) => barColors[i])
        .attr('stroke-width', 5)
        .style('cursor', 'e-resize')
        .on('mousedown', (d, i) => draggingPointId = i);

      // 画brush里的那个rect
      let rectStart = null;
      d3.select('#overview rect')
        .attr('x', xScale(points[2]))
        .attr('y', scope.top)
        .attr('width', xScale(points[3]) - xScale(points[2]))
        .attr('height', scope.bottom - scope.top)
        .attr('fill', 'grey')
        .attr('opacity', 0.5)
        .style('cursor', 'move')
        .on('mousedown', () => {
          rectStart = {
            mouseX: d3.event.x,
            p1X: xScale(points[1]),
            p2X: xScale(points[2]),
            p3X: xScale(points[3]),
            p4X: xScale(points[4]),
          };
        });

      // 把mouseup和mousemove事件绑定到整个overview上了，防止错位
      d3.select('#overview')
        .on('mouseup', () => {
          draggingPointId = null;
          rectStart = null;
        })
        .on('mousemove', () => {
          // 对于拖bar的情况
          if (draggingPointId !== null) {
            // 更新划分点
            let point = xScale.invert(d3.event.x - rect.left);
            const left = points[draggingPointId - 1] || -1;
            const right = points[draggingPointId + 1] || xScale.domain()[1] + 1;
            point = Math.max(left + 1, point);
            point = Math.min(right - 1, point);

            points.splice(draggingPointId, 1, Math.round(point));

            // 更新bar的位置和rect的位置
            d3.selectAll('#overview .bar')
              .data(points)
              .attr('x1', xScale)
              .attr('x2', xScale);

            d3.select('#overview rect')
              .attr('x', xScale(points[2]))
              .attr('width', xScale(points[3]) - xScale(points[2]));

            // 更新detail视图
            this.updateDetail(points);
          }
          // 拖动rect的情况
          if (rectStart) {
            // 更新划分点位置
            const deltaX = d3.event.x - rectStart.mouseX;
            [1, 2, 3, 4].forEach((v) => {
              let p = xScale.invert(rectStart[`p${v}X`] + deltaX);
              const left = points[v - 1];
              const right = points[v + 1];
              p = Math.max(left + 1, p);
              p = Math.min(right - 1, p);

              points.splice(v, 1, Math.round(p));
            });

            // 更新bar的位置和rect的位置
            d3.selectAll('#overview .bar')
              .data(points)
              .attr('x1', xScale)
              .attr('x2', xScale);

            d3.select('#overview rect')
              .attr('x', xScale(points[2]))
              .attr('width', xScale(points[3]) - xScale(points[2]));

            // 更新detail视图
            this.updateDetail(points);
          }
        });
    },

    updateDetail(points) {
      const svg = this.detailSvg;
      const xScale = this.detailXScale;
      const yScale = this.detailYScale;
      svg.selectAll('*').remove();
      this.streams = {};

      const scope = {
        top: this.detailPadding.top,
        bottom: this.detailSvgRect.height - this.detailPadding.bottom,
      };

      // 五段啊五段 三段?
      const slices = new Array(5).fill(0).map((v, i) => [points[i], points[i + 1] + 1]);

      // 分段画流
      slices.forEach((s, i) => {
        const data = this[`recordsLev${i === 0 || i === 4 ? 1 : 2}`];
        const stream = this[`streamLev${i === 0 || i === 4 ? 1 : 2}`]
          .map((band) => {
            const sliced = band.slice(s[0], s[1]);
            sliced.key = band.key;
            return sliced;
          });
        const keys = Object.keys(data);
        const colors = keys.map(k => this.treeColors[k]);
        const target = svg.append('g').node();
        this.drawStream(stream, colors, target, scope, xScale, yScale, s[0]);
      });

      // 给detail的流加描边，highlight的时候显眼一些
      // 响应hover高亮
      svg.selectAll('path')
        .attr('stroke', d => this.treeColors[d.key])
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.4)
        .on('mouseover', (d) => {
          this.setHoveringNodeName(d.key);
        })
        .on('mouseout', () => {
          this.setHoveringNodeName(null);
        });

      // 画和overview对应的那几条bar
      const barColors = ['red', 'blue', 'grey', 'grey', 'blue', 'red'];
      svg.selectAll('.bar')
        .data(points).enter().append('line')
        .classed('bar', true)
        .attr('x1', d => xScale(d))
        .attr('x2', d => xScale(d))
        .attr('y1', scope.top)
        .attr('y2', scope.bottom)
        .attr('stroke', (d, i) => barColors[i])
        .attr('stroke-width', 3)
        .style('pointer-events', 'none');

      // 画overview和detail的bar之间的虚线
      const overviewBarPos = [];
      const detailPadding = this.detailPadding;
      d3.selectAll('#overview .bar').each(function () {
        const elem = d3.select(this);
        overviewBarPos.push([
          elem.attr('x1'),
          +elem.attr('y1') + scope.bottom + detailPadding.bottom,
        ]);
      });
      svg.selectAll('.dashed')
        .data(points).enter().append('line')
        .classed('dashed', true)
        .attr('x1', d => xScale(d))
        .attr('y1', scope.bottom)
        .attr('x2', (d, i) => overviewBarPos[i][0])
        .attr('y2', (d, i) => overviewBarPos[i][1])
        .attr('stroke-dasharray', '5,5')
        .attr('stroke', (d, i) => barColors[i])
        .attr('stroke-width', 1);

      // 画显示hover位置的竖线
      svg.append('line')
        .classed('hover', true)
        .attr('stroke', 'black')
        .attr('stroke-width', 2)
        .style('pointer-events', 'none');

      // 响应mousemove，更新上面的竖线，以及tooltip
      svg.on('mousemove', () => {
        const name = this.hoveringNodeName;
        if (name) {
          const band =
            this.streamLev1.find(s => s.key === name) ||
            this.streamLev2.find(s => s.key === name);
          const point = Math.round(xScale.invert(d3.event.x - this.detailSvgRect.left));
          const y = band[point];
          svg.select('.hover')
            .attr('x1', xScale(point))
            .attr('x2', xScale(point))
            .attr('y1', yScale(y[0]))
            .attr('y2', yScale(y[1]));

          let left = d3.event.x + 10;
          const rightBorder = this.detailSvgRect.right - this.detailPadding.right;
          if (left + 130 > rightBorder) {
            left = rightBorder - 130;
          }

          d3.select('#info')
            .style('top', `${d3.event.y + 10}px`)
            .style('left', `${left}px`)
            .style('visibility', 'visible')
            .html(`
              <p>名称：${name}</p>
              <p>数值：${Math.round(y[1] - y[0])}</p>
            `);
        } else {
          svg.select('.hover')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', 0)
            .attr('y2', 0);
          d3.select('#info')
            .style('visibility', 'hidden');
        }
      });
    },

    // 绘制流图
    drawStream(stream, colors, target, scope, xScale, yScale, xOffset = 0) {
      // 缩放
      if (yScale === undefined) {
        const streamBound = this.getStreamBound(stream);
        yScale = d3.scaleLinear()
          .domain(streamBound).range([scope.top, scope.bottom]);
      }
      // 生成path区域字符串
      const area = d3.area()
        .x((d, i) => xScale(i + xOffset))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveNatural);

      d3.select(target).selectAll('line')
        .data(stream[0].map((v, i) => i))
        .enter()
        .append('line')
        .attr('x1', d => xScale(d + xOffset))
        .attr('x2', d => xScale(d + xOffset))
        .attr('y1', scope.top)
        .attr('y2', scope.bottom)
        .attr('stroke', '#ccc');

      // 输出轴上的label
      d3.select(target).selectAll('.month')
        .data(stream[0].map((v, i) => i))
        .enter()
        .append('text')
        .classed('month', true)
        .attr('x', d => xScale(d + xOffset))
        .attr('dx', -3)
        .attr('dy', -3)
        .attr('y', scope.top)
        .style('font-size', '10px')
        .style('user-select', 'none')
        .text(d => ((d + xOffset) % 12) + 1);
      d3.select(target).selectAll('.year')
        .data(stream[0].map((v, i) => i))
        .enter()
        .append('text')
        .classed('year', true)
        .attr('x', d => xScale(d + xOffset))
        .attr('dx', -12)
        .attr('dy', -15)
        .attr('y', scope.top)
        .style('font-size', '10px')
        .style('user-select', 'none')
        .text((d) => {
          if ((d + xOffset) % 12 === 0) {
            return 2013 + (d + xOffset) / 12;
          }
          return '';
        });

      // 绘制
      d3.select(target).selectAll('path')
        .data(stream)
        .enter()
        .append('path')
        .attr('d', area)
        .attr('fill', (d, i) => colors[i]);
    },

    // 获取流图y值上下边界
    getStreamBound(stream) {
      const topBound = stream[stream.length - 1].map(v => v[1]);
      const bottomBound = stream[0].map(v => v[0]);
      return [Math.min(...bottomBound), Math.max(...topBound)];
    },

    // 获取分段的xScale
    getXScale(points, range) {
      const domains = new Array(5).fill(0).map((v, i) => [points[i], points[i + 1]]);

      // 算分段的ranges
      const ratios = [0.6, 1.3, 2.5, 1.3, 0.6];
      const portions = domains.map((v, i) => (v[1] - v[0]) * ratios[i]);
      const total = portions.reduce((pre, cur) => pre + cur, 0);
      const rangePoints = [0];
      portions.forEach((v, i) => {
        rangePoints.push(rangePoints[i] + v / total);
      });
      const interval = range[1] - range[0];
      const ranges = rangePoints.map((v, i) => [
        range[0] + interval * v,
        range[0] + interval * rangePoints[i + 1],
      ]);

      // 做5个分段的scale
      const scales = new Array(5);

      [0, 2, 4].forEach((v) => {
        scales[v] = d3.scaleLinear().domain(domains[v]).range(ranges[v]);
      });

      [1, 3].forEach((v) => {
        const x1 = domains[v][0];
        const x2 = domains[v][1];
        const y1 = ranges[v][0];
        const y2 = ranges[v][1];
        const slope1 = (ranges[v - 1][1] - ranges[v - 1][0]) / (domains[v - 1][1] - domains[v - 1][0]);
        const slope2 = (ranges[v + 1][1] - ranges[v + 1][0]) / (domains[v + 1][1] - domains[v + 1][0]);
        const func = this.solveCubic(x1, x2, y1, y2, slope1, slope2);
        func.domain = () => domains[v];
        func.range = () => ranges[v];

        scales[v] = func;
      });


      // 拼起来，按照x的值调用
      const xScale = (x) => {
        let scale = null;
        scales.forEach((s) => {
          const domain = s.domain();
          if (x >= domain[0] && x < domain[1]) {
            scale = s;
          }
        });

        if (scale) {
          return scale(x);
        }
        if (x < points[0]) {
          return range[0];
        }
        return range[1];
      };

      // 强行invert（d3原生scale自带invert
      xScale.invert = (xPx) => {
        let scale = null;
        scales.forEach((s) => {
          const r = s.range();
          if (xPx >= r[0] && xPx < r[1]) {
            scale = s;
          }
        });

        if (scale) {
          return scale.invert(xPx);
        }
        if (xPx < range[0]) {
          return points[0];
        }
        return points[points.length - 1];
      };

      return xScale;
    },

    // emm不知道怎么描述，总之让detail里的xScale更正常了
    solveCubic(x1, x2, y1, y2, slope1, slope2) {
      const a = [
        [x1 ** 3, x1 * x1, x1, 1],
        [x2 ** 3, x2 * x2, x2, 1],
        [3 * x1 * x1, 2 * x1, 1, 0],
        [3 * x2 * x2, 2 * x2, 1, 0],
      ];
      const b = [y1, y2, slope1, slope2];
      const res = lusolve(a, b);
      const func = x => (x ** 3) * res[0][0] + x * x * res[1][0] + x * res[2][0] + res[3][0];
      func.invert = y => getCubicRoots(res[0][0], res[1][0], res[2][0], res[3][0] - y)[0].real;

      return func;
    },
  },
};
</script>

<style scoped>
#stream {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

#detail {
  flex: 1 1;
}

#detail svg {
  overflow: visible;
}

#info {
  width: 130px;
  height: 90px;
  position: absolute;
  padding: 20px;
  background: #fff;
  border: 0.5px solid #ccc;
  opacity: 0.8;
  visibility: hidden;
  pointer-events: none;
}

#overview {
  flex: 0 0 200px;
}

svg {
  width: 100%;
  height: 100%;
}
</style>
