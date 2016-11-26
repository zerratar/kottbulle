import { KsAst } from './ksast';
import { KsApp, KsType, KsCase, KsState, KsDatasource, KsForm } from './definitions';

export class KsProgramTree {
    private ast         : KsAst;
    private apps        : KsApp[];
    private types       : KsType[];
    private cases       : KsCase[];
    private states      : KsState[];
    private forms       : KsForm[];
    private datasources : KsDatasource[];
    constructor(ast: KsAst, apps : KsApp[], datasources: KsDatasource[], forms: KsForm[], types: KsType[], cases: KsCase[], states: KsState[]) {
        this.datasources = datasources;
        this.forms       = forms;
        this.types       = types;
        this.cases       = cases;
        this.states      = states;
        this.apps        = apps;
        this.ast         = ast;                
    }
    
    getAbstractSyntaxTree() : KsAst {
        return this.ast;
    }
    
    getApp() : KsApp {
        // we will only support one app definition for now, but we could potentially support more in the future
        // this would allow us to have multiple target outputs 
        if (!this.apps || this.apps.length === 0) 
            return null;

        return this.apps[0];
    }

    getDatasources() : KsDatasource[] {
        return this.datasources;
    }

    getForms() : KsForm[] {
        return this.forms;
    }    

    getTypes() : KsType[] {
        return this.types;
    }

    getCases() : KsCase[] {
        return this.cases;
    }

    getStates() : KsState[] {
        return this.states;
    }
}