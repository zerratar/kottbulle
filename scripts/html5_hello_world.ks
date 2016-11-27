define case PrintHelloWorld {
    when {
        event app.HelloWorld loaded
    }
    do {
        print "<h1>hello world</h1>"
    }
    result {
        nothing
    }
}    

define app HelloWorld {
    meta {
        set title "Hello World App"
        set description "Hello world, I mean. Hi!"
        set version "0.1"
        set author "kaaruschmidt"
        set platform "web"
        set language "html5"
    }
    cases {
        PrintHelloWorld
    }
}  