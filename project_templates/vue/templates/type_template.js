export class <%= model.type.typeName %> {
  constructor () {
    <% for(let i = 0; i < model.type.fields.length; i++) { %>
    this.<%= model.type.fields[i].fieldName %> = <%= model.getDefaultValue(model.type.fields[i].fieldType) %><% } %>
  }

  static create (<%= model.type.fields.map(function(f){ return f.fieldName }).join(", ") %>) {
    let t = new <%= model.type.typeName %>()
    <% for(let i = 0; i < model.type.fields.length; i++) { %>t.<%= model.type.fields[i].fieldName %> = <%= model.type.fields[i].fieldName %>
    <% } %>return t
  }

  toString () {
    return '<%= model.type.typeName %>'
  }
}
