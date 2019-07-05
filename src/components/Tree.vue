<template>
  <div id="tree">
    <svg></svg>
  </div>
</template>
<script>
import * as d3 from 'd3';
import { mapState, mapGetters, mapActions } from 'vuex';
import Utils from '../utils';

export default {
  name: 'Tree',
  data() {
    return {
      boundingRect: null,
    };
  },
  computed: {
    ...mapState(['hoveringNodeName']),
    ...mapGetters(['treeData', 'treeColors']),
    tree() {
      if (!this.treeData) return null;
      return d3.hierarchy(this.treeData);
    },
  },
  mounted() {
    const rect = document.getElementById('tree').getBoundingClientRect();
    this.boundingRect = rect;
  },

  watch: {
    tree() {
      // const tree = this.getTestTreeData(5);
      // x、y对调
      // 注：tree nodes中的x、y并未对调，所以需要反过来理解
      const svgPadding = 60;
      const rect = this.boundingRect;
      const treeLayout = d3.tree().size([
        rect.height - svgPadding * 2,
        rect.width - svgPadding * 2,
      ]);
      treeLayout(this.tree);
      this.drawTree(this.tree, svgPadding);
    },

    hoveringNodeName() {
      this.tree.each(n => n.highlight = false);
      if (this.hoveringNodeName) {
        let hoveringNode = null;
        this.tree.each((n) => {
          if (n.data.name === this.hoveringNodeName) {
            hoveringNode = n;
          }
        });
        hoveringNode.each(n => n.highlight = true);
      }
      d3.select('svg').selectAll('circle')
        .attr('stroke-width', d => (d.highlight ? 3 : 1));
    },
  },
  methods: {
    ...mapActions(['setHoveringNodeName']),

    // 测试数据随机生成：一个3层的树
    // maxChildrenNum：每个节点最多子节点数量
    // 返回值：树
    getTestTreeData(maxChildrenNum) {
      const tree = { name: 'root', children: [] };

      const childrenNum = Utils.math.getRandomInteger(1, maxChildrenNum);

      for (let i = 0; i < childrenNum; i += 1) {
        tree.children.push({ name: `child(${1},${i})`, children: [] });
        const num = Utils.math.getRandomInteger(1, maxChildrenNum);
        for (let j = 0; j < num; j += 1) {
          tree.children[i].children.push({ name: `child(${2},${j})` });
        }
      }

      return d3.hierarchy(tree);
    },

    // 绘制树
    drawTree(tree, svgPadding) {
      const nodes = tree.descendants();
      const links = tree.links();

      // 绘制线
      d3.select('svg').selectAll('path')
        .data(links)
        .enter()
        .append('path')
        .attr('d', d3.linkHorizontal().x(d => d.y).y(d => d.x))
        .attr('stroke', '#555')
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.4)
        .attr('fill', 'none');

      // 绘制节点
      d3.select('svg').selectAll('circle')
        .data(nodes)
        .enter()
        .append('circle')
        .attr('id', d => d.data.name)
        .attr('stroke', '#555')
        .attr('stroke-width', 1)
        .attr('fill', d => this.treeColors[d.data.name])
        .attr('cx', d => d.y)
        .attr('cy', d => d.x)
        .attr('r', 10)
        .on('click', () => {
          console.log(d3.event);
        })
        .on('mouseover', (d) => {
          this.setHoveringNodeName(d.data.name);
        })
        .on('mouseout', () => {
          this.setHoveringNodeName(null);
        });

      // 绘制字
      d3.select('svg').selectAll('text')
        .data(nodes)
        .enter()
        .append('text')
        .attr('fill', '#555')
        .attr('font-size', 14)
        .attr('font-family', 'sans-serif')
        .attr('transform', d => `translate(${d.y + svgPadding + 15}, ${d.x + svgPadding + 5})`)
        .text(d => d.data.name);

      // 平移放正
      d3.select('svg').selectAll('circle')
        .attr('transform', `translate(${svgPadding}, ${svgPadding})`);
      d3.select('svg').selectAll('path')
        .attr('transform', `translate(${svgPadding}, ${svgPadding})`);
    },
  },
};
</script>

<style scoped>
#tree {
  overflow: hidden;
}

svg {
  width: 100%;
  height: 100%;
}

</style>
