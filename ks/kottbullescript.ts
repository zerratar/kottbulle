/// <reference path="../typings/node/node.d.ts" />
import fs = require('fs');
import { KsProgramTree } from './ksprogramtree';
import { KsInterpreter } from './ksinterpreter';
import { KsTransformer } from './kstransformer';
import { KsValidator } from './ksvalidator';
import { KsLexer } from './kslexer';
import { KsType, KsCase, KsState, KsForm, KsDatasource } from './definitions';


export class Kottbullescript {

    private source  : string;
    private program : KsProgramTree;

    constructor(src: string, program: KsProgramTree) {
        this.source  = src;
        this.program = program;
    }

    getForms() : KsForm[] {
        return this.program.getForms();
    }

    getDatasources() : KsDatasource[] {
        return this.program.getDatasources();
    }

    getTypes() : KsType[] {
        return this.program.getTypes();
    }

    getCases() : KsCase[] {
        return this.program.getCases();
    }

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
        console.log('LOADING FILE ================================');
        fs.readFile(source, (err, data) => {
            if (err) throw err;
            console.log(data);
        });
        console.log('FILE LOADED? ================================');
    }
}