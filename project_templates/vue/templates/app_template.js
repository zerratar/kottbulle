<% for(let i = 0; i < model.components.length; i++) { %>
import <%= model.components[i].name %> from './<%= model.components[i].location %>';
<% } %>

// tag: '<%= model.app.appName.toLowerCase() %>'
export default {
    data() {
        return {}
    },
    created() {
        console.log('<%= model.app.appName %> created')
    },
    components: {
        <%= model.components.map(function(c) { return "'" + c.tag + "': " + c.name }).join(", ") %>
    }
}