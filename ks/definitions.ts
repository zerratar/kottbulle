import { Kottbullescript } from "./kottbullescript";

export class KsField {
    fieldName    : string;
    fieldType    : string;
    defaultValue : string;
    constructor (fieldName : string, fieldType : string, defaultValue : string = "") {
        this.fieldName    = fieldName;
        this.fieldType    = fieldType;
        this.defaultValue = defaultValue;
    }

    getEventsFromCases(formName : string, cases: KsCase[]): KsEventOperation[] {
        let ops : KsEventOperation[] = [];
        for(var c of cases) {
            this.getEventsFromCase(formName, c).filter((k:KsCaseBodyOperation) => (k instanceof KsEventOperation)
                                    && (k as KsEventOperation).reference.includes(formName + "." + this.fieldName))
                                    .forEach((k2:KsCaseBodyOperation) => ops.push(k2 as KsEventOperation));
        }
        return ops;
    }

    getEventsFromCase(formName : string, c: KsCase): KsEventOperation[] {
        let ops : KsEventOperation[] = [];
        for (var b of c.caseBodies) {
            b.operations.filter((k:KsCaseBodyOperation) => (k instanceof KsEventOperation)
                                                        && (k as KsEventOperation).reference.includes(formName + "." + this.fieldName))
                                     .forEach((k2:KsCaseBodyOperation) => ops.push(k2 as KsEventOperation));
        }
        return ops;
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

    getValue(key : string): string {
        for(var v of this.values) {
            if (v.fieldName === key) {
                return v.fieldValue;
            }
        }
    }
}

export class KsApp {
    appName    : string;
    meta       : KsAppMeta;
    situations : string[] = [];
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
    getEventsFromCases(cases: KsCase[]): KsEventOperation[] {
        let ops : KsEventOperation[] = [];
        for(var c of cases) {
            this.getEventsFromCase(c).filter((k:KsCaseBodyOperation) => (k instanceof KsEventOperation)
                                                                     && (k as KsEventOperation).reference.includes("form." + this.formName))
                                     .forEach((k2:KsCaseBodyOperation) => ops.push(k2 as KsEventOperation));
        }
        return ops;
    }

    getEventsFromCase(c: KsCase): KsEventOperation[] {
        let ops : KsEventOperation[] = [];
        for (var b of c.caseBodies) {
            b.operations.filter((k:KsCaseBodyOperation) => (k instanceof KsEventOperation)
                                                        && (k as KsEventOperation).reference.includes("form." + this.formName))
                                     .forEach((k2:KsCaseBodyOperation) => ops.push(k2 as KsEventOperation));
        }
        return ops;
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
    getValue(key : string): string {
        for(var v of this.values) {
            if (v.fieldName === key) {
                return v.fieldValue;
            }
        }
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

export abstract class KsCaseBodyOperation {
    action   : string;
    caseName : string;
    // args   : KsArgument[] = [];   
    constructor(action: string, caseName : string) {
        this.action   = action;
        this.caseName = caseName;
    }

    abstract getArguments(): string[];
}

export class KsEventOperation extends KsCaseBodyOperation {
    reference      : string;
    eventName      : string;
    constructor(caseName : string, reference: string, eventName : string) {
        super("event", caseName);
        this.reference = reference;
        this.eventName = eventName;
    }
    getArguments(): string[] {
        return [this.reference, this.eventName];
    }
}

export class KsCreateOperation extends KsCaseBodyOperation {
    typeName : string;
    alias    : string;
    args     : KsArgument[] = [];
    constructor(caseName : string, typeName: string, alias: string, args: KsArgument[]) {
        super("create", caseName);
        this.typeName = typeName;
        this.alias    = alias;
        this.args     = args;
    }
    getArguments(): string[] {
        let a: string[] = [];
        for(var j of this.args) {
            a.push(j.value);
        }
        return  a;
    }
}

export class KsTransformOperation extends KsCaseBodyOperation {
    constructor(caseName : string) {
        super("transform", caseName);
    }
    getArguments(): string[] {
        return [];
    }
}

export class KsPrintOperation extends KsCaseBodyOperation {
    toPrint : string;
    byRef   : boolean;
    constructor(caseName : string, toPrint : string, byRef : boolean) {
        super("print", caseName);
        this.toPrint = toPrint;
        this.byRef   = byRef;
    }
    getArguments(): string[] {
        return [this.toPrint];
    }
}

export class KsListOperation extends KsCaseBodyOperation {
    reference : string;
    rowform   : string;
    constructor(caseName : string, reference : string, rowform : string) {
        super("list", caseName);
        this.reference = reference;
        this.rowform   = rowform;
    }
    getArguments(): string[] {
        return [this.reference, this.rowform];
    }
}

export class KsStoreOperation extends KsCaseBodyOperation {
    reference  : string;
    datasource : string;
    constructor(caseName : string, reference : string, datasource : string) {
        super("store", caseName);
        this.reference  = reference;
        this.datasource = datasource;
    }
    getArguments(): string[] {
        return [this.reference, this.datasource];
    }
}

export class KsLoadOperation extends KsCaseBodyOperation {
    alias      : string;
    datasource : string;
    where      : string;
    constructor(caseName : string, alias : string, datasource : string, where : string) {
        super("load", caseName);
        this.alias      = alias;
        this.datasource = datasource;
        this.where      = where;
    }
    getArguments(): string[] {
        return [this.alias, this.datasource, this.where];
    }
}

export class KsCaseBody {
    bodyName   : string;
    operations : KsCaseBodyOperation[] = [];
    constructor(bodyName : string) {
        this.bodyName = bodyName;
    }

    getReferencesByType(refType : string, ks : Kottbullescript = null): string[] {
        let refs  : string[] = [];
        // let app     = ks.getApp();
        // let types   = ks.getTypes();
        // let cases   = ks.getCases();
        // let forms   = ks.getForms();
        // let states  = ks.getStates();
        // let sources = ks.getDatasources();
        for (var op of this.operations) {
            let args: string[] = op.getArguments();
            for (var arg of args) {
                // let value : string;
                if(arg.startsWith(refType + ".")) {
                    refs.push(arg.split(".")[1]);
                }
                // else {
                //     let ref = this.findReference(arg,app,types,cases,forms,states,sources);
                //     if (ref) {
                //         refs.push(ref);
                //     }
                // }
            }
        }
        return refs;
    }

    // private findReference(inputArg: string, app:KsApp, types:KsType[], cases:KsCase[], 
    //                       forms:KsForm[], states:KsState[], datasources:KsDatasource[]) : string {
    //     let argValues : string[] = [];
    //     if (inputArg.includes('.')) {
    //         argValues = inputArg.split('.');
    //     } else {
    //         argValues = [inputArg];
    //     }
    //     for(var arg of argValues) {
    //         if (app.appName === arg) {
    //             return app.appName;
    //         }
    //         for (var type of types) {
    //             if (type.typeName === arg) {
    //                 return type.typeName
    //             }
    //         }
    //     }
    //     return null;
    // }
}

export class KsSituation {
    situationName : string;
    cases         : string[];
    attributes    : KsFieldReference[] = [];
    constructor(situationName: string, cases: string[] = [], attributes: KsFieldReference[] = []) {
        this.situationName = situationName;
        this.cases         = cases;
        this.attributes    = attributes;
    }

    isMain(): boolean {
        return this.getAttribute("main") === "true";
    }

    getAttribute(key : string): string {
        for(var v of this.attributes) {
            if (v.fieldName === key) {
                return v.fieldValue;
            }
        }
    }
}

export class KsCase {
    caseName   : string;
    caseBodies : KsCaseBody[] = [];
    constructor (caseName : string) {
        this.caseName = caseName;
    }

    getBody(name : string): KsCaseBody {
        if (!this.caseBodies || this.caseBodies.length === 0) {
            return null;
        }
        return this.caseBodies.find((k : KsCaseBody) => k.bodyName === name);
    }

    getDo(): KsCaseBody {
        return this.getBody("do");
    }

    getWhen(): KsCaseBody {
        return this.getBody("when");
    }

    getResult(): KsCaseBody {
        return this.getBody("result");
    }
}