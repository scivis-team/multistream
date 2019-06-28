import Vue from 'vue';
import Vuex from 'vuex';

Vue.use(Vuex);

const actions = {
  async fetchData() {
    const resp = await fetch('/data/test.csv');

    if (resp.status === 200) {
      const data = await resp.text();
      console.log(data);
      // TODO: parse csv
    } else {
      console.log(`请求失败：${resp.status}`);
    }
  },
};

export default actions;
