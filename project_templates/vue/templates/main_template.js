import Vue from 'vue'
import VueResource from 'vue-resource'
import router from 'src/router'
import store from 'src/store'
import <%= model.app.appName %> from 'src/<%= model.app.appName %>'

Vue.use(VueResource)

/* eslint-disable no-new */
new Vue({
  el: '#<%= model.app.appName.toLowerCase() %>',
  http: {},
  store,
  router,
  template: '<<%= model.app.appName %>/>',
  components: { <%= model.app.appName %> }
})
