<template>
  <div id="stream">
    <div id="detail">
      <svg></svg>
    </div>
    <div id="overview">
      <svg></svg>
    </div>
  </div>
</template>
<script>
import * as d3 from 'd3';
import { mapState, mapGetters, mapActions } from 'vuex';
import Utils from '../utils';

export default {
  name: 'Stream',
  data() {
    return {
      colors: [],
      keys: [],
      streams: [],
      splitPoints: [],
      detailSvg: null,
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

    recordsLev1() {
      if (!this.tree) return null;

      const records = {};
      this.tree.children.forEach((g) => {
        records[g.data.name] = new Array(this.data.length).fill(0)
          .map((v, i) => g.children.reduce((pre, cur) => pre + this.recordsLev2[cur.data.name][i], 0));
      });

      return records;
    },

    streamLev1() {
      return this.getStream(this.recordsLev1);
    },

    streamLev2() {
      return this.getStream(this.recordsLev2);
    },

    detailXScale() {
      return this.getXScale(this.splitPoints, this.detailRange);
    },
  },
  mounted() {
    this.detailSvg = document.querySelector('#detail svg');
    const rect = this.detailSvg.getBoundingClientRect();
    this.detailRange = [
      this.detailPadding.left,
      rect.width - this.detailPadding.right,
    ];
  },
  watch: {
    data() {
      const portions = [0, 0.4, 0.45, 0.55, 0.6, 1];
      this.splitPoints = portions.map(v => Math.floor((this.data.length - 1) * v));
    },
    recordsLev1() {
      // draw overview
      const target = document.querySelector('#overview svg');
      this.drawOverview(target, this.recordsLev1, this.treeColors, this.splitPoints);

      // draw detail
      this.updateDetail(this.splitPoints);
    },

    hoveringNodeName() {
      if (this.hoveringNodeName) {
        let hoveringNodes = null;
        this.tree.each((n) => {
          if (n.data.name === this.hoveringNodeName) {
            hoveringNodes = n.descendants();
          }
        });
        this.streams.forEach((s) => {
          s.highlight = false;
          hoveringNodes.forEach((n) => {
            if (n.data.name === s.key) {
              s.highlight = true;
            }
          });
        });
      } else {
        this.streams.forEach(s => s.highlight = true);
      }
      d3.selectAll('#detail path')
        .attr('opacity', d => (d.highlight ? 1 : 0.2));
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

      const barColors = ['blue', 'red', 'grey', 'grey', 'red', 'blue'];
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

      d3.select('#overview')
        .on('mouseup', () => draggingPointId = null)
        .on('mousemove', () => {
          if (draggingPointId !== null) {
            let point = xScale.invert(d3.event.x - rect.left);
            const left = points[draggingPointId - 1] || -1;
            const right = points[draggingPointId + 1] || xScale.domain()[1] + 1;
            point = Math.max(left + 1, point);
            point = Math.min(right - 1, point);

            points.splice(draggingPointId, 1, Math.round(point));

            d3.selectAll('#overview .bar')
              .data(points)
              .attr('x1', xScale)
              .attr('x2', xScale);

            this.updateDetail(points);
          }
        });
    },

    updateDetail(points) {
      d3.select(this.detailSvg).selectAll('*').remove();

      // 五段啊五段 三段?
      const slices = new Array(5).fill(0).map((v, i) => [points[i], points[i + 1] + 1]);

      // const slices = [
      //   [points[0], points[5] + 1],
      //   [points[1], points[4] + 1],
      //   [points[2], points[3] + 1],
      // ];

      console.log(slices);
      const streamBound = this.getStreamBound(this.streamLev1);
      const rect = this.detailSvg.getBoundingClientRect();
      const scope = {
        top: this.detailPadding.top,
        bottom: rect.height - this.detailPadding.bottom,
      };
      const yScale = d3.scaleLinear()
        .domain(streamBound)
        .range([scope.top, scope.bottom]);

      slices.forEach((s, i) => {
        const data = this[`recordsLev${i === 0 || i === 4 ? 1 : 2}`];
        const stream = this[`streamLev${i === 0 || i === 4 ? 1 : 2}`]
          .map((band) => {
            const sliced = band.slice(s[0], s[1]);
            sliced.key = band.key;
            return sliced;
          });
        this.streams.push(...stream);
        const keys = Object.keys(data);
        const colors = keys.map(k => this.treeColors[k]);
        const target = d3.select(this.detailSvg).append('g').node();
        this.drawStream(stream, colors, target, scope, this.detailXScale, yScale, s[0]);
      });

      d3.select(this.detailSvg).selectAll('path')
        .on('mouseover', (d) => {
          this.setHoveringNodeName(d.key);
        })
        .on('mouseout', () => {
          this.setHoveringNodeName(null);
        });
    },

    // 绘制流图
    drawStream(stream, colors, target, scope, xScale, yScale, xOffset) {
      if (xOffset === undefined) {
        xOffset = 0;
      }

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
      // 绘制
      d3.select(target).selectAll('line')
        .data(stream[0].map((v, i) => i))
        .enter()
        .append('line')
        .attr('x1', d => xScale(d + xOffset))
        .attr('x2', d => xScale(d + xOffset))
        .attr('y1', scope.top)
        .attr('y2', scope.bottom)
        .attr('stroke', '#ccc');
      d3.select(target).selectAll('text')
        .data(stream[0].map((v, i) => i))
        .enter()
        .append('text')
        .attr('x', d => xScale(d + xOffset))
        .attr('y', scope.top)
        .style('font-size', '10px')
        .text(d => d + xOffset);

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
      const ratios = [0.7, 1.3, 2, 1.3, 0.7];
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
      const scales = new Array(5).fill(0).map((v, i) => (i % 2 ? d3.scaleSqrt() : d3.scaleLinear()).domain(domains[i]).range(ranges[i]));

      // 拼起来，按照x的值调用
      return (x) => {
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

#overview {
  flex: 0 0 200px;
}

svg {
  width: 100%;
  height: 100%;
}
</style>
