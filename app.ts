import { Kottbullescript } from './ks/kottbullescript';
import { KsEventOperation, KsCreateOperation, KsStoreOperation } from './ks/definitions';

let file = Kottbullescript.loadFile('./scripts/usersignup.ks');

let script = Kottbullescript.load(`
    // test test comment
    /*
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
    }*/

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
`);

/*
 * Test case
 */
// let script = Kottbullescript.load(`
//     define type Fruit {
//         name : string
//     }

//     define state Apple from Fruit {
//         weight : number
//         set name "Apple"
//     }

//     define case AddBanana {
//         when {
//             event my_awesome_button click
//         }
//         do {
//             create myBanana from Fruit "Banana"
//             create myApple from Apple
//         }
//         result {
//             nothing
//         }
//     }
// `);


let app   = script.getApp();
if (app) {
    console.log("define app: " + app.appName);
    console.log();
}

let types  = script.getTypes();
let cases  = script.getCases();
let states = script.getStates();

console.log(types.length + " type(s) loaded.");
for(let i = 0; i < types.length; i++) {
    console.log("type: " + types[i].typeName);
    for(let j = 0; j < types[i].fields.length; j++) {
        let field = types[i].fields[j];
        console.log("\tdefine field: " + field.fieldName + ", of type: " + field.fieldType);
    }
}
console.log();
console.log(states.length + " state(s) loaded.");
for(let i = 0; i < states.length; i++) {
    console.log("state: " + states[i].stateName + ", of type: " + states[i].stateType);
    for(let j = 0; j < states[i].fields.length; j++) {
        let field = states[i].fields[j];
        console.log("\tdefine field: " + field.fieldName + ", of type: " + field.fieldType);
    }
    for(let j = 0; j < states[i].overrides.length; j++) {
        let field = states[i].overrides[j];
        console.log("\tset field: " + field.fieldName + ", value: " + field.fieldValue);
    }
}
console.log();
console.log(cases.length + " cases(s) loaded.");
for(let i = 0; i < cases.length; i++) {
    console.log("case: " + cases[i].caseName);
    for (let j = 0; j < cases[i].caseBodies.length; j++) {
        let caseBody = cases[i].caseBodies[j];
        console.log("\tcase body: " + caseBody.bodyName);
        for (let k = 0; k < caseBody.operations.length; k++) {
            let op = caseBody.operations[k];

            if (op instanceof KsEventOperation) {
                let eventOperation = op as KsEventOperation;
                console.log("\t\toperation ["+op.action+"]: " + eventOperation.reference + " on " + eventOperation.eventName);
            }

            if (op instanceof KsStoreOperation) {
                let eventOperation = op as KsStoreOperation;
                if (eventOperation.datasource.length > 0) {
                    console.log("\t\toperation ["+op.action+"]: " + eventOperation.reference + " in " + eventOperation.datasource);
                } else {
                    console.log("\t\toperation ["+op.action+"]: " + eventOperation.reference + " in <first matching datasource>");
                }
            }

            if (op instanceof KsCreateOperation) {
                let createOperation = op as KsCreateOperation;
                let args = [];
                for (let l = 0; l < createOperation.args.length; l++) {
                    args.push("{ isRef: " + createOperation.args[l].isRef + ", value: '"+ createOperation.args[l].value + "'}");
                }
                console.log("\t\toperation ["+op.action+"]: " + createOperation.typeName + ", alias: " + createOperation.alias +
                            ", args: [" + args.join(", ") + "]");
            }

        }
    }
}
