// test test comment

// only memory based store works right now
/*
define datasource UserCollection for User {
    set type "filesystem"
    set source "c:\\my_folder\\"      
} */

define datasource MemoryUserCollection for User {
    set type "memory"
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
        store newUser in MemoryUserCollection                
    }
    result {
        nothing
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
    cases {
        UserSignup        
    }
}  