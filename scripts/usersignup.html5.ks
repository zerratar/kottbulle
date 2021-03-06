define datasource UserCollection for User {
    set type "localstorage"
    // implemented:     set type "memory"
    // not implemented: set type "filesystem"
    // you can define whatever value you want here
    // and then use it in the template by doing $nameOfValue$   
    //      ex: $debug$
    // or you can use <%= model.datasource.getValue("nameOfValue") %>
    //      ex: <%= model.datasource.getValue("debug") %> 
    set debug "true"
    // to use the debug value, you just use $debug$ in the datasource templates, it will print without the quoutes
}

define form UserSignupForm {
    username : input_email
    password : input_password
    signup_button : button
}

define type User {
    username : string
    password : string
}

define case UserSignup {
    when {
        event form.UserSignupForm submit
    }
    do {
        create newUser from User UserSignupForm.username UserSignupForm.password
        print newUser.username
        store newUser in UserCollection
    }
    result {
        nothing
    }
}

define situation UserLandsOnWebsite { 
    set main true
    cases {
        UserSignup
    }
}


define app MyApp {
    meta {
        set title "My awesome app"
        set description "My awesome app, that allows anyone. Even doges to register as a user!"
        set version "0.1"
        set author "kaaruschmidt"
        set platform "web"
        set language "html5"
    }
    situations {
        UserLandsOnWebsite
    }
}