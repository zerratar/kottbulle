export class KsField {
    fieldName    : string;
    fieldType    : string;
    defaultValue : string;
    constructor (fieldName : string, fieldType : string, defaultValue : string = "") {
        this.fieldName    = fieldName;
        this.fieldType    = fieldType; 
        this.defaultValue = defaultValue;
    }    
}

export class KsFieldReference {
    fieldName  : string;    
    fieldValue : string;
    constructor (fieldName : string, fieldValue : string = "") {
        this.fieldName    = fieldName;         
        this.fieldValue = fieldValue;
    }    
}

export class KsAppMeta {
    values : KsFieldReference[] = [];
    
    getValue(key : string) {
        for(var v of this.values) {
            if (v.fieldName === key) {
                return v.fieldValue;
            }
        }
    }
}

export class KsApp {
    appName : string;
    meta    : KsAppMeta;
    cases   : string[] = [];
    constructor (appName : string) {
        this.appName = appName;
    }        
}

export class KsForm {
    formName : string;
    fields   : KsField[] = [];
    constructor (formName : string) {
        this.formName = formName;
    }
}

export class KsDatasource {    
    datasourceName : string;
    datasourceType : string;
    values         : KsFieldReference[] = [];
    constructor (datasourceName : string, datasourceType : string) {
        this.datasourceName = datasourceName;
        this.datasourceType = datasourceType;
    }
}

export class KsState {
    stateName : string;
    stateType : string;
    fields    : KsField[] = [];
    overrides : KsFieldReference[] = [];
    constructor (stateName : string, stateType : string) {
        this.stateName = stateName;
        this.stateType = stateType;
    }    
}

export class KsType {
    typeName : string;
    fields   : KsField[] = [];
    constructor (typeName : string) {
        this.typeName = typeName;
    }
}

export class KsArgument {        
    value : string;
    isRef : boolean;
    constructor(value: string, isRef: boolean) {
        this.value = value;
        this.isRef = isRef;
    }
}

export class KsCaseBodyOperation {
    action : string;
    // args   : KsArgument[] = [];   
    constructor(action: string) {
        this.action = action;
    }
}

export class KsEventOperation extends KsCaseBodyOperation {
    reference : string;
    eventName : string;
    constructor(reference: string, eventName : string) {
        super("event");
        this.reference = reference;
        this.eventName = eventName;
    }
}

export class KsCreateOperation extends KsCaseBodyOperation {
    typeName : string;
    alias    : string;    
    args     : KsArgument[] = [];
    constructor(typeName: string, alias: string, args: KsArgument[]) {
        super("create");
        this.typeName = typeName;
        this.alias    = alias;
        this.args     = args;
    }    
}

export class KsTransformOperation extends KsCaseBodyOperation {
    constructor() {
        super("transform");
    }    
}

export class KsStoreOperation extends KsCaseBodyOperation {
    reference  : string;
    datasource : string;
    constructor(reference : string, datasource : string) {
        super("store");
        this.reference  = reference;
        this.datasource = datasource; 
    }
}

export class KsCaseBody {
    bodyName   : string;    
    operations : KsCaseBodyOperation[] = [];
    constructor(bodyName : string) {
        this.bodyName = bodyName;
    }
}

export class KsCase {
    caseName   : string;
    caseBodies : KsCaseBody[] = [];
    constructor (caseName : string) {
        this.caseName = caseName;
    }    
}