import { KsAst } from './ksast';
import { KsType, KsCase, KsState, KsDatasource, KsForm } from './definitions';

export class KsProgramTree {
    private ast         : KsAst;
    private types       : KsType[];
    private cases       : KsCase[];
    private states      : KsState[];
    private forms       : KsForm[];
    private datasources : KsDatasource[];
    constructor(ast: KsAst, datasources: KsDatasource[], forms: KsForm[], types: KsType[], cases: KsCase[], states: KsState[]) {
        this.datasources = datasources;
        this.forms       = forms;
        this.types       = types;
        this.cases       = cases;
        this.states      = states;
        this.ast         = ast;        
    }
    
    getAbstractSyntaxTree() : KsAst {
        return this.ast;
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