// test test comment

define datasource UserCollection for User {
    set type "filesystem"
    set source "c:\\my_folder\\"      
}

define datasource MemoryUserCollection for User {
    set type "memory"
}

define form UserSignupForm { 
    signup_button : button
    username : input_email
    password : input_password
}

define type User {
    username : string
    password : string
}

define case UserSignup {
    when {
        event signup_button clicked
    }
    do {
        create newUser from User UserSignupForm.email UserSignupForm.password
    }
    result {
        store newUser
        store newUser in MemoryUserCollection
    }
}    

define app MyApp {
    meta {
        set title "My awesome app"
        set description "My awesome app, that allows anyone. Even doges to register as a user!"
        set version "0.1"
        set author "kaaruschmidt"            
        set platform "web"            
        set langauge "typescript"                        
    }
    cases {
        UserSignup
    }
}  