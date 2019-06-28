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
    this.$store.dispatch('fetchData');
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
  display: flex;
  flex-direction: row;
}

#tree {
  flex: 0 0 20%;
}

#stream {
  flex: 1 1;
}
</style>
