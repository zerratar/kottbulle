export class KsAstNode {
    children : KsAstNode[] = [];
    parent   : KsAstNode;
    type     : string;
    name     : string;        
    constructor(type: string, name: string) {        
        this.type = type;
        this.name = name;
    }    
}

export class KsAst {    
    root : KsAstNode;
    constructor(programNode: KsAstNode) {
        this.root = programNode;
    }
}