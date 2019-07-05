import Vue from 'vue';
import Vuex from 'vuex';
import { hcl } from 'd3';


import mutations from './mutations';
import actions from './actions';
import Utils from '../utils';

Vue.use(Vuex);

const state = {
  data: null,
  hoveringNodeName: null,
};

const getters = {
  treeData({ data }) {
    if (!data) return null;

    const geoDivisions = {};
    data[0].data.forEach((p) => {
      if (!geoDivisions[p.gId]) {
        geoDivisions[p.gId] = { name: p.gName, children: [] };
      }
      geoDivisions[p.gId].children.push({ name: p.name });
    });

    const root = { name: '中国', children: [] };
    Object.values(geoDivisions).forEach((g) => {
      root.children.push(g);
    });

    return root;
  },

  // eslint-disable-next-line
  treeColors(state, { treeData }) {
    if (!treeData) return null;

    const colorDict = { 中国: '#fff' };
    (function recur(root, hMin, hMax) {
      if (root.children) {
        const { colors, hInterval } = Utils.color.getTreeColorsInOneLayer(
          [hMin, hMax], 70, 80, root.children.length, true,
        );

        root.children.forEach((child, i) => {
          colorDict[child.name] = colors[i];
          const { h } = hcl(colors[i]);
          recur(child, h, h + hInterval * 0.7);
        });
      }
    }(treeData, 0, 360));
    return colorDict;
  },
};

export default new Vuex.Store({
  state, getters, mutations, actions,
});
