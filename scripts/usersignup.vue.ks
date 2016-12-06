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
    Username : input_email
    Password : input_password
    Signup_Button : button
}

define type User {
    Username : string
    Password : string
}

define case UserSignup {
    when {
        event form.UserSignupForm submit
    }
    do {
        create newUser from User UserSignupForm.Username UserSignupForm.Password
        print newUser.Username
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
        set title "Awesomenezz"
        set description "My awesome app, that allows anyone. Even doges to register as a user!"
        set version "0.0.1"
        set author "kaaruschmidt"
        set platform "web"
        set language "vue"
    }
    situations {
        UserLandsOnWebsite
    }
}