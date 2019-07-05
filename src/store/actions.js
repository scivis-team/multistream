import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const actions = {
  async fetchData(ctx) {
    const resp = await fetch('/data/data.json');

    if (resp.status === 200) {
      const data = await resp.json();
      console.log(data);
      ctx.commit('setData', data);
    } else {
      console.log(`请求失败：${resp.status}`);
    }
  },
  setHoveringNodeName(ctx, nodeName) {
    ctx.commit('setHoveringNodeName', nodeName);
  },
};

export default actions;
