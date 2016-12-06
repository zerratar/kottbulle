/// <reference path="../typings/node/node.d.ts" />
import fs = require("fs");
import { KsProgramTree } from "./ksprogramtree";
import { KsInterpreter } from "./ksinterpreter";
import { KsTransformer } from "./kstransformer";
import { KsValidator } from "./ksvalidator";
import { KsLexer } from "./kslexer";
import { KsApp, KsType, KsCase, KsState, KsForm, KsDatasource, KsSituation } from "./definitions";

/**
 * Kottbullescript Kottbullescript Kottbullescript Kottbullescript Kottbullescript Kottbullescript   
 * 
 * @export
 * @class Kottbullescript
 */
export class Kottbullescript {

    private source  : string;
    private program : KsProgramTree;

    constructor(src: string, program: KsProgramTree) {
        this.source  = src;
        this.program = program;
    }

    /**
     * get the defined app in this script
     * 
     * @returns {KsApp}     
     * @memberOf Kottbullescript
     */
    getApp(): KsApp {
        return this.program.getApp();
    }

    /**     
     * get all defined forms in this script
     * 
     * @returns {KsForm[]}     
     * @memberOf Kottbullescript
     */
    getForms(): KsForm[] {
        return this.program.getForms();
    }

    getForm(name : string): KsForm {
        return this.getForms().find((f:KsForm) => f.formName === name);
    }

    isForm(name : string): boolean {
        let form = this.getForm(name);
        return form !== null && form !== undefined;
    }

    /**
     * get all datasources defined in this script
     * 
     * @returns {KsDatasource[]}     
     * @memberOf Kottbullescript
     */
    getDatasources(): KsDatasource[] {
        return this.program.getDatasources();
    }

    getDatasource(name : string): KsDatasource {
        return this.getDatasources().find((f:KsDatasource) => f.datasourceName === name);
    }

    /**
     * get all types defined in this script
     * 
     * @returns {KsType[]}     
     * @memberOf Kottbullescript
     */
    getTypes(): KsType[] {
        return this.program.getTypes();
    }

    getType(name : string): KsType {
        return this.getTypes().find((f:KsType) => f.typeName === name);
    }

    /**
     * get all situations defined in this script
     * 
     * @returns {KsSituation[]}     
     * @memberOf Kottbullescript
     */
    getSituations(): KsSituation[] {
        return this.program.getSituations();
    }

    getSituation(situationName: string): KsSituation {
        return this.getSituations().find((s:KsSituation) => s.situationName === situationName);
    }

    /**
     * get all cases defined in this script
     * 
     * @returns {KsCase[]}     
     * @memberOf Kottbullescript
     */
    getCases(): KsCase[] {
        return this.program.getCases();
    }

    getCase(name : string): KsCase {
        return this.getCases().find((f:KsCase) => f.caseName === name);
    }

    /**
     * get all states defined in this script
     * 
     * @returns {KsState[]}     
     * @memberOf Kottbullescript
     */
    getStates(): KsState[] {
        return this.program.getStates();
    }

    getState(name : string): KsState {
        return this.getStates().find((f:KsState) => f.stateName === name);
    }

    /**
     * loads the target kotbullescript source code and compiles it into a Köttbullescript object
     * @param source
     * @returns {Kottbullescript}
     */
    static load(source: string): Kottbullescript {
        // console.log("loading script...");
        // console.log("=============[SOURCE CODE]===========");
        // console.log(source);
        // console.log("=====================================");
        // console.log(); 
        console.time("Köttbullescript->load");

        let lexer       = new KsLexer();
        let transformer = new KsTransformer();
        let validator   = new KsValidator();
        let interpreter = new KsInterpreter(lexer, transformer, validator);
        let program     = interpreter.compile(source);

        console.timeEnd("Köttbullescript->load");
        console.log();
        return new Kottbullescript(source, program);
    }

    static loadFile(file: string): Kottbullescript {
        let source = fs.readFileSync(file, "utf8");
        return this.load(source);
    }
}