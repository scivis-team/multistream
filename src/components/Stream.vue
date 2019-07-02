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
import Utils from '../utils';

export default {
  name: 'Stream',
  data() {
    return {
      colors: [],
      keys: ['a', 'b', 'c', 'd', 'e', 'f'],
      stream: [],
    };
  },
  mounted() {
    this.colors = Utils.color.getTreeColorsInOneLayer([0, 300], 80, 70, 6, true);

    const streamData = this.getTestStackData(30);
    const stackLayout = d3.stack().keys(this.keys).offset(d3.stackOffsetWiggle);
    const stream = stackLayout(streamData);
    this.drawStream(stream, this.colors);
  },
  methods: {
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

    // 绘制流图
    drawStream(stream, colors) {
      const rect = document.getElementById('detail').getBoundingClientRect();
      const streamBound = this.getStreamBound(stream);

      // 缩放
      const xScale = d3.scaleLinear().domain([0, 29]).range([75, rect.width - 50]);
      const yScale = d3.scaleLinear().domain(streamBound).range([40, rect.height - 60]);
      // 生成path区域字符串
      const area = d3.area()
        .x((d, i) => xScale(i))
        .y0(d => yScale(d[0]))
        .y1(d => yScale(d[1]))
        .curve(d3.curveNatural);
      // 绘制
      d3.select('#detail').select('svg').selectAll('path')
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
