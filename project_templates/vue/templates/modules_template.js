<%  let datasources = model.datasources; if(datasources.length > 0) { %>
import { <%= datasources.map(function(ds) { return ds.datasourceName }).join(", ") %> } from './../models.js'
<% } %>

export default {
  state: {
    // Modules State
    name: '<%= model.app.appName %>',
    error: '',
    data: {}
  },
  mutations: {
    /*
    field (state, payload) {
      state.fields[payload.name] = payload.value
    },
    */
    create(state, context) {
      state.data[context.key] = context.value;
    },
    storeInCollection(state, context) {
      if(!state.data[context.collectionName]) {
        state.data[context.collectionName] = []
      }
      // we are not replacing existing items right now.
      // For that; We need to make sure that the item we pass in has a key we can compare with      
      state.data[context.collectionName].push(context.item)
    },    
    error(state, msg) {
      state.error = msg
    }
    /* storeInDatasource(state, context) { } */ // Will most likely never be used
  },
  actions: {
    /*
    event ({ commit }, payload) {
      commit(payload.mutation, payload)
    }
    */
    print({commit}, value) {
      console.log(value);
    },
    create({commit}, itemKey, itemValue) {
      commit('create', { "key": itemKey, "value": itemValue })
    },
    storeInCollection({commit}, collectionName, item) {
      commit('storeInCollection', {"collectionName":collectionName, "item": item})
    }, 
    storeInDatasource({commit}, datasource, item) {
      // at this point we should have the datasource instance
      datasource.store(item).then(function(identifier) {
        // yay. item stored!        
      }, function(error) {
        commit('error', error)
      })
    },
    loadFromDatasource({commit}, datasource, key) {
      return datasource.load(key)
    }
  },
  getters: {
    // key: state => state.key,
  }
}
