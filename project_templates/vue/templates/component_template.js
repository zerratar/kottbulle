<% for(let i = 0; i < model.components.length; i++) { %>
import <%= model.components[i].name %> from './../../<%= model.components[i].location %>';
<% } %>

// tag: '<%= model.component.tag %>'
export default {
    data() {
      return {}
    },
    created() {
        console.log('<%= model.name %> created')
    },
    components: {
        <%= model.components.map(function(c) { return "'" + c.tag + "': " + c.name }).join(", ") %>
    }
}