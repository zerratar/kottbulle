define form LoginForm {
    username : input_email
    password : input_password
    loginButton : button
}

define form CreatePostForm {
    title : input
    body : input
    something : input
    somethingMore : input
    postButton : button
}

define case PrintHelloWorld {
    when {
        event app.HelloWorld load
    }
    do {
        print "<h1>hello world</h1>"
    }
    result {
        nothing
    }
}    

define situation UserLandsOnWebsite { 
    set main true
    cases {
        PrintHelloWorld
    }
}

define app HelloWorld {
    meta {
        set title "Hello World App"
        set description "Hello world, I mean. Hi!"
        set version "0.1"
        set author "kaaruschmidt"
        // set platform "web/singlepage"
        set platform "web"
        set language "html5"        
    }
    situations {
        UserLandsOnWebsite
    }
}  