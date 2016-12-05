export class <%= model.state.stateName %> extends <%= model.state.stateType %> {
  constructor() {
    super()
        <% for(let i = 0; i < model.state.fields.length; i++) { %>
        this.<%= model.state.fields[i].fieldName %> = <%= model.getDefaultValue(model.state.fields[i].fieldType) %>
        <% } %>
        <% for(let i = 0; i < model.state.overrides.length; i++) { %>
        this.<%= model.state.overrides[i].fieldName %> = <%= model.state.overrides[i].fieldValue %>
        <% } %>
  }
  static create(<%= model.state.fields.map(function(f){ return f.fieldName }).join(", ") %>) {
    let s = new <%= model.state.stateName %>()
    <% for(let i = 0; i < model.state.fields.length; i++) { %>
    s.<%= model.state.fields[i].fieldName %> = <%= model.state.fields[i].fieldName %>
    <% } %>
    return s
  }

  toString() {
    return '<%= model.state.stateName %>';
  }
}
