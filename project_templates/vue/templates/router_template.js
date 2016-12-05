import Vue from 'vue'
import VueRouter from 'vue-router'
import <%= model.app.appName %> from './<%= model.app.appName %>.vue';

Vue.use(VueRouter)

const routes = [
  { path: '/', component: <%= model.app.appName %> }
]

/* eslint-disable no-new */
export default new VueRouter({
  routes,
  mode: 'history'
})
