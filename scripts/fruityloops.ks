define type Fruit {
    name : string
}

define state Apple from Fruit {
    weight : number
    set name "Apple"
}

define case AddBanana {
    when {
        event my_awesome_button click
    }
    do {
        create myBanana from Fruit "Banana"
        create myApple from Apple
    }
    result {
        nothing
    }
}