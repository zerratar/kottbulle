define case PrintHelloWorld {
    when {
        event app.HelloWorld load
    }
    do {
        print "hello world"
    }
    result {
        nothing
    }
}    

define app HelloWorld {
    meta {
        set title "Hello World App"
        set description "Hello world, I mean. Hi!"
        set version "0.0.1"
        set author "kaaruschmidt"        
        set platform "desktop/console"        
        set language "csharp"        
    }
    cases {
        PrintHelloWorld
    }
}  