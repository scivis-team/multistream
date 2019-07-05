import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const mutations = {
  setData(state, data) {
    // eslint-disable-next-line
    state.data = data;
  },
  setHoveringNodeName(state, nodeName) {
    // eslint-disable-next-line
    state.hoveringNodeName = nodeName;
  },
};

export default mutations;
