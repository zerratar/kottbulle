import Vue from 'vue'
import VueResource from 'vue-resource'
import router from 'src/router'
import store from 'src/store'
import <%= model.app.appName %> from './<%= model.app.appName %>.vue';

Vue.use(VueResource)

new Vue({
  el: '#<%= model.app.appName.toLowerCase() %>',
  http: {},
  store,
  router,
  render: h => h(<%= model.app.appName %>)
});