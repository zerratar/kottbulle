import Vue from 'vue'
import Vuex from 'vuex'
import { <%= model.app.appName %> } from 'modules'

Vue.use(Vuex)

/* eslint-disable no-new */
const store = new Vuex.Store({
  modules: {
    <%= model.app.appName %>
  }
})

export default store
