import Vue from 'vue';
import <%= model.app.appName %> from './<%= model.app.appName %>.vue';

let app = new Vue({
    el: '#<%= model.app.appName.toLowerCase() %>',
    render: h => h(<%= model.app.appName %>)
});