import { KsAstNode } from "./../ksast";

export class KsEventNode extends KsAstNode {
    reference : string;
    eventName : string;    
    constructor(reference: string, eventName: string) {
        super("operation", "event");
        this.reference = reference;
        this.eventName = eventName;
    }
}

export class KsStateFieldSetNode extends KsAstNode {
    fieldName  : string;
    fieldValue : string;
    constructor(fieldName: string, fieldValue: string) {
        super("operation", "set");
        this.fieldName  = fieldName;
        this.fieldValue = fieldValue;
    }
}

export class KsCreateNode extends KsAstNode {
    typeName : string;
    alias    : string;
    args     : KsLiteralNode[];
    constructor(typeName: string, alias: string, args: KsLiteralNode[]) {
        super("operation", "create");
        this.typeName = typeName;
        this.alias    = alias;
        this.args     = args; 
    }
}

export class KsPrintNode extends KsAstNode {
    toPrint : string;
    byRef   : boolean;
    constructor (toPrint : string, byRef : boolean) {
        super("operation", "print");
        this.toPrint = toPrint;
        this.byRef   = byRef;
    }
}

export class KsListNode extends KsAstNode {
    reference : string;
    rowform   : string;
    constructor(reference : string, rowform : string) {
        super("operation", "list");
        this.reference = reference;
        this.rowform   = rowform;
    } 
}

export class KsStoreNode extends KsAstNode {
    reference  : string;
    datasource : string;
    constructor(reference : string, datasource : string) {
        super("operation", "store");
        this.reference  = reference;
        this.datasource = datasource;
    } 
}

export class KsLoadNode extends KsAstNode {
    alias      : string;
    datasource : string;
    where      : string;
    constructor (alias : string, datasource : string, where : string) {
        super("operation", "load");
        this.alias      = alias;
        this.datasource = datasource;
        this.where      = where;
    }
}


export class KsTypeNode extends KsAstNode {
    typeName : string;
    constructor(typeName : string = "") {
        super("definition", "type");
    }    
}

export class KsFieldNode extends KsAstNode {
    fieldName    : string;
    fieldType    : string;
    defaultValue : string;
    constructor(fieldName : string, fieldType : string, defaultValue : string = "") {
        super("definition", "field");
        this.fieldName    = fieldName;
        this.fieldType    = fieldType;
        this.defaultValue = defaultValue;
    }
}

export class KsStateNode extends KsAstNode {
    stateName : string;
    stateType : string;
    constructor(stateName : string = "", stateType : string = "") {
        super("definition", "state");
        this.stateName = stateName;
        this.stateType = stateType;
    }
}

export class KsCaseBodyNode extends KsAstNode {
    bodyName : string;
    constructor(bodyName : string = "") {        
        super("definition", "casebody");
        this.bodyName = bodyName;
    }
}

export class KsAppNode extends KsAstNode {
    appName : string;
    constructor (appName : string = "") {
        super("definition", "app");
        this.appName = appName;
    }
}

export class KsDatasourceNode extends KsAstNode {
    datasourceName : string;
    datasourceType : string;
    constructor(datasourceName : string = "", datasourceType : string = "") {
        super("definition", "datasource");
        this.datasourceName = datasourceName;
        this.datasourceType = datasourceType;
    }    
}

export class KsFormNode extends KsAstNode {
    formName : string;
    constructor(formName : string = "") {
        super("definition", "form");
        this.formName = formName;
    }    
}

export class KsCaseNode extends KsAstNode {
    caseName : string;
    constructor(caseName : string = "") {
        super("definition", "case");
        this.caseName = caseName;
    }
}

export class KsLiteralNode extends KsAstNode {
    value : string;
    constructor(value : string) {        
        super("literal", "text");
        this.value = value;
    }
}