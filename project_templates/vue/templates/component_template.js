/* eslint-disable comma-dangle */
<% if(model.component.references && model.component.references.length > 0) { %>import { <%= model.component.references.join(", ") %> } from './../../models.js'
<% } %><% for(let i = 0; i < model.components.length; i++) { %>import <%= model.components[i].name %> from './../../<%= model.components[i].location %>'
<% } %>
export default {
  data () {
    return {

    }
  },
  created () {
    console.log('<%= model.name %> created')
  },
  methods: {
  <% for(let j = 0; j < model.component.events.length; j++) { %>
    <%= model.component.events[j].eventHandler %> () {
      <% for(let i = 0; i < model.component.events[j].eventHandlerCode.length; i++) { %>
      <%= model.component.events[j].eventHandlerCode[i] %>
    <% } %>},<% }
  %>
  },
  components: {
    <%= model.components.map(function(c) {
      return "'" + c.tag + "': " + c.name
    }).join(',\n    ')
    %>
  }
}
