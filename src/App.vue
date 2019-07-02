<template>
  <div id="app">
    <Tree />
    <Stream />
  </div>
</template>

<script>
import Tree from './components/Tree.vue';
import Stream from './components/Stream.vue';

export default {
  name: 'app',
  mounted() {
    // this.$store.dispatch('fetchData');
  },
  components: {
    Tree, Stream,
  },
};
</script>

<style>
body {
  margin: 0;
}

#app {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: row;
}

#tree {
  flex: 0 0 450px;
  border-right: 1px dashed #000;
}

#stream {
  flex: 1 1;
}
</style>
