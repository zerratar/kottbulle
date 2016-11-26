export class KsAstNode {
    children : KsAstNode[] = [];
    parent   : KsAstNode;
    type     : string;
    name     : string;        
    constructor(type: string, name: string) {        
        this.type = type;
        this.name = name;
    }  

    reverseChildren() {
        this.children.reverse();
        for (var child of this.children) {
            child.reverseChildren();
        }
    }  
}

export class KsAst {    
    root : KsAstNode;
    constructor(programNode: KsAstNode) {
        this.root = programNode;
    }
}