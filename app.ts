import { Kottbullescript as KS } from './ks/kottbullescript';
import { KsProjectGenerator, KsProjectCodeGeneratorProvider } from './generator/ksprojectgenerator';
import { Html5CodeGenerator } from './generator_extensions/html5';
import { TypescriptCodeGenerator } from './generator_extensions/typescript';
import { KsProjectTemplateProvider } from './generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './generator/ksprojectgeneratorsettings';
import { KsEventOperation, KsCreateOperation, KsStoreOperation } from './ks/definitions';

let verbose : boolean = false;

/*
    Load our awesome user signup script
 */

// let script = KS.loadFile(`./scripts/usersignup.ks`);
let script = KS.loadFile(`./scripts/html5_hello_world.ks`);

/*
    setup and generate our project based on the user signup script
 */

let codeGeneratorProvider = new KsProjectCodeGeneratorProvider();
codeGeneratorProvider.register("typescript", new TypescriptCodeGenerator());
codeGeneratorProvider.register("html5", new Html5CodeGenerator());


let templateProvider = new KsProjectTemplateProvider();
let generator        = new KsProjectGenerator(codeGeneratorProvider, templateProvider);
let projectSettings  = new KsProjectGeneratorSettings("./out/", "My first Html 5 project");

generator.generate(script, projectSettings);

/*
    If verbose is set to true, print out the loaded script details
 */

if (verbose) {

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
}