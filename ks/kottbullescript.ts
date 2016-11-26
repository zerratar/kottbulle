/// <reference path="../typings/node/node.d.ts" />
import fs = require('fs');
import { KsProgramTree } from './ksprogramtree';
import { KsInterpreter } from './ksinterpreter';
import { KsTransformer } from './kstransformer';
import { KsValidator } from './ksvalidator';
import { KsLexer } from './kslexer';
import { KsApp, KsType, KsCase, KsState, KsForm, KsDatasource } from './definitions';

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
    getApp() : KsApp {
        return this.program.getApp();
    }

    /**     
     * get all defined forms in this script
     * 
     * @returns {KsForm[]}     
     * @memberOf Kottbullescript
     */
    getForms() : KsForm[] {
        return this.program.getForms();
    }

    /**
     * get all datasources defined in this script
     * 
     * @returns {KsDatasource[]}     
     * @memberOf Kottbullescript
     */
    getDatasources() : KsDatasource[] {
        return this.program.getDatasources();
    }

    /**
     * get all types defined in this script
     * 
     * @returns {KsType[]}     
     * @memberOf Kottbullescript
     */
    getTypes() : KsType[] {
        return this.program.getTypes();
    }

    /**
     * get all cases defined in this script
     * 
     * @returns {KsCase[]}     
     * @memberOf Kottbullescript
     */
    getCases() : KsCase[] {
        return this.program.getCases();
    }

    /**
     * get all states defined in this script
     * 
     * @returns {KsState[]}     
     * @memberOf Kottbullescript
     */
    getStates() : KsState[] {
        return this.program.getStates();
    }

    /**
     * loads the target kotbullescript source code and compiles it into a Köttbullescript object
     * @param source
     * @returns {Kottbullescript}
     */
    static load(source: string): Kottbullescript {
        console.log("loading script...");
        console.log("=============[SOURCE CODE]===========");
        console.log(source);
        console.log("=====================================");
        console.log();
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

    static loadFile(source: string) {
        let file = fs.readFile(source, 'utf8', (err, data) => {
            if (err) throw err;
            console.log(data); // returns the data
            return data;
        });

        console.log(file); // undefined

        /*
        TODO: T___T can't get this to work...
        let lexer       = new KsLexer();
        let transformer = new KsTransformer();
        let validator   = new KsValidator();
        let interpreter = new KsInterpreter(lexer, transformer, validator);
        let program     = interpreter.compile(file);

        return new Kottbullescript(file, program);
        */
    }
}