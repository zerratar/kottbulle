// test test comment

define datasource TodoCollection for Todo {
    set type "localstorage"    
}

define form PostTodoForm {
    Text : input     
    Post_Button : button
}

define type Todo {
    Text : string
}

define case ListTodos {
    when {
        event app.MyTodoApp load
    }
    do {
        load todos from TodoCollection
    }
}

define case PostTodo {
    when {
        event form.PostTodoForm submit
    }
    do {
        create todo from Todo PostTodoForm.Text
        print todo.Text
        store todo in TodoCollection
    }
    result {
        nothing
    }
}

define app MyTodoApp {
    meta {
        set title "Todo"
        set description "Just a bunch of todos"
        set version "0.0.1"
        set author "kaaruschmidt"
        set platform "web"
        set language "vue"
    }
    cases {
        ListTodos
        PostTodo
    }
}