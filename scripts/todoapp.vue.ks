// test test comment

define datasource TodoCollection for Todo {
    set type "localstorage"    
}

define form PostTodoForm {
    Text : input     
    Post_Button : button
}

define form EditTodoForm {
    Text : input     
    Update_Button : button
}

define form TodoRowForm {
    Text : label
    Edit_Button : button
    Delete_Button : button
}

define type Todo {
    Text : string
}

define case ShowUpdateTodo {
    when {
        event form.TodoRowForm.Edit_Button click
    }
    do {
        // todo: referenced from the list
        // show <form> using <model>
        // tell ks that we want the EditTodoForm to be shown and accessible
        // using the 'todo' model we received from the ListTodos.result
        show form.EditTodoForm using todo
    }
    result {
        // pass along model to next case that might want it
        todo
    }
}

define case UpdateTodo {
    when {
        event form.EditTodoForm.Update_Button click
    }
    do {
        // update the model and store it in our storage
        // this should update the view and "backend"
        set todo.Text form.EditTodoForm.Text
        store todo in TodoCollection 
    }
    result {
        nothing
    }
}

define case DeleteTodo {
    when {
        event form.TodoRowForm.Delete_Button click
    }
    do {
        // remove the todo from the view and the "backend"
        remove todo from todos
        remove todo from TodoCollection
    }
    result {
        nothing
    }
}

define case ListTodos {
    when {
        event app.MyTodoApp load
    }
    do {
        load todos from TodoCollection
        // list todo
        // list <alias> from <collection> using <form> [<args1> <args2> <args3> <args..>]
        list todo from todos using form.TodoRowForm todo
    }
    result {
        // pass along model to next case that might want it
        todos
        todo
    }
}

define case PostTodo {
    when {
        event form.PostTodoForm submit
    }
    do {
        create todo from Todo PostTodoForm.Text
        store todo in TodoCollection
    }
    result {
        nothing
    }
}

define situation TodoList {
    set main true
    cases {
        // only these cases are visible at start, so no need to list the others
        ListTodos
        PostTodo
    }
}

define app MyTodoApp {
    meta {
        set title "Todo"
        set description "I have too much todo"
        set version "0.0.1"
        set author "kaaruschmidt"
        set platform "web"
        set language "vue"
    }
    situations {
        TodoList
    }
}

/*
in PostTodoForm.vue

  methods: {
    submit () {      
      this.$store.create('TodoKeyName', new Todo(asdasd, asdasd));    
      this.$store.store('TodoKeyName', awesomeDataSource);
    },
  },

and in the myapp.js

export default {
  state: {    
    name: 'MyTodoApp',
    stack: []    
  },
  mutations: {
    create (state, context) {
      window[context.key] = context.value;
    },
    store (state, context) {      
      context.datasource.store(this.getItem(window[context.key]));      
    }
  },
  actions: {
    create({commit}, key, item) {
      commit('create', {"key": key, "value": item});
    },
    store({commit}, key, datasource) {
      commit('store', { "datasource": datasource, "key" : key});
    }
  },
  getters: {        
  }
}

*/