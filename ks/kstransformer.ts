import { KsTypeNode, KsFormNode, KsDatasourceNode, KsLiteralNode, KsFieldNode, KsStateNode, KsCaseNode, KsCaseBodyNode, KsEventNode, KsCreateNode, KsStateFieldSetNode, KsStoreNode} from './nodes/ksnodes';
import { KsToken } from './kslexer';
import { KsAst, KsAstNode } from './ksast';

class KsTransformerContext {
    position              : number        = 0;
    stack                 : KsAstNode[]   = [];
    datasourceDefinitions : KsDatasourceNode[] = [];
    typeDefinitions       : KsTypeNode[]  = [];
    caseDefinitions       : KsCaseNode[]  = [];
    stateDefinitions      : KsStateNode[] = [];
    formDefinitions       : KsFormNode[]  = [];
}

export class KsTransformer {

    /**
     * transform the tokens provided from the lexer and generates an ast
     * @param tokens
     * @returns {KsAst}
     */
    transform(tokens:KsToken[]) : KsAst {        
        let initialAst = this.initialTransform(tokens);
        let finalAst  = this.finalTransform(initialAst);
        return finalAst;
    }

    /**
     * creates the initial ast using the tokens we got from the lexer
     * @param tokens
     * @returns {KsAst}
     */
    private initialTransform(tokens:KsToken[]) : KsAst {
        console.time("KsTransformer->initialTransform");
        let app  : KsAstNode            = new KsAstNode("program", "program");
        let ctx  : KsTransformerContext = new KsTransformerContext();        
        let node : KsAstNode            = null;

        while ((node = this.walkTokens(ctx, tokens)) !== null) {
            if (node !== undefined) {
                app.children.push(node);
            }
            if (ctx.position >= tokens.length) {
                break;
            }
        } 
        console.timeEnd("KsTransformer->initialTransform");
        return new KsAst(app);
    }

    private walkTokens(ctx: KsTransformerContext, tokens: KsToken[]) : KsAstNode {        
        let token = tokens[ctx.position];
        switch(token.type) {
            case "comment": 
            // we will skip comments
            ctx.position++;
            return undefined;

            case "string":
            // single or double quouted text. no apostrophes
            ctx.position++;
            return new KsAstNode("string", token.value);   

            case "literal":
            // can be number or name, keyword or whatnot   
            { 
                ctx.position++;
                if (this.isKeyword(token.value)) {                        
                    return new KsAstNode("keyword", token.value);
                }
                
                if (this.isNumber(token.value)) {
                    return new KsAstNode("number", token.value);
                }
                
                return new KsAstNode("name", token.value);
            }                   
            
            case "parens":
            case "bracket":
            case "curlybracket":
                if(token.value === this.getClosingChar(token.type)) {
                    throw new SyntaxError("Unexpected end of body character '"+token.value+"'");
                }
                token = tokens[++ctx.position];
                let bodyNode = new KsAstNode("body", null);
                while (token !== null && token.value !== this.getClosingChar(token.type)) {
                    bodyNode.children.push(this.walkTokens(ctx, tokens));
                    if (ctx.position >= tokens.length) {
                        throw new SyntaxError("No matching end of body character was found. Expected '"+ this.getClosingChar(token.type) + "'");
                    }
                    token = tokens[ctx.position];
                } 
                ctx.position++;
            return bodyNode;                                  
        }
        ctx.position++;
        return new KsAstNode(token.type, token.value);
    }

    private isKeyword(token: string): boolean {
        let lc = token.toLowerCase();
        return lc === "app"     || lc === "overrides" || lc === "from"
            || lc === "create"  || lc === "when"      || lc === "state"
            || lc === "event"   || lc === "form"      || lc === "case"
            || lc === "if"      || lc === "do"        || lc === "return"
            || lc === "loop"    || lc === "continue"  || lc === "forever"      
            || lc === "type"    || lc === "transform" || lc === "null"
            || lc === "define"  || lc === "set"       || lc === "with"
            || lc === "none"    || lc === "true"      || lc === "false"                         
            || lc === "nothing" || lc === "as"        || lc === "is"  
            || lc === "of"      || lc === "extends"   || lc === "implements"
            || lc === "use"     || lc === "import"    || lc === "include"
            || lc === "into"    || lc === "in"        || lc === "for"
            || lc === "store";
    }

    private isNumber(token: string): boolean {
        let n = parseFloat(token);
        return !isNaN(n) && isFinite(n);
    }

    private getClosingChar(ofType:string):string {
        switch(ofType) {
            case "bracket"      : return "]";
            case "curlybracket" : return "}";
            case "parens"       : return ")";
        }
        return null;
    }

    /**
     * cleanup and finalizes the ast
     * @param ast
     * @returns {KsAst}
     */
    private finalTransform(ast: KsAst) : KsAst {        
        console.time("KsTransformer->finalTransform");
        
        let ctx       = new KsTransformerContext();
        let finalApp  = new KsAstNode("program", "Köttbullescript");
        let finalAst  = new KsAst(finalApp);        
        let nodeCount = ast.root.children.length;
        
        while (ctx.position < nodeCount) {
            this.walkNodes(ctx, ast.root.children);
            if (ctx.position >= nodeCount) break;
        }                

        while (ctx.typeDefinitions.length        > 0) finalApp.children.splice(0, 0, ctx.typeDefinitions.pop());        
        while (ctx.stateDefinitions.length       > 0) finalApp.children.splice(0, 0, ctx.stateDefinitions.pop());    
        while (ctx.caseDefinitions.length        > 0) finalApp.children.splice(0, 0, ctx.caseDefinitions.pop());
        while (ctx.formDefinitions.length        > 0) finalApp.children.splice(0, 0, ctx.formDefinitions.pop());
        while (ctx.datasourceDefinitions.length  > 0) finalApp.children.splice(0, 0, ctx.datasourceDefinitions.pop());
        while (ctx.stack.length                  > 0) finalApp.children.splice(0, 0, ctx.stack.pop());

        console.timeEnd("KsTransformer->finalTransform");
        return finalAst;
    }

    private walkNodes(ctx: KsTransformerContext, nodes : KsAstNode[]): boolean {
        if (ctx.position >= nodes.length) return false;
        let node = nodes[ctx.position];        
        switch (node.type) {
            case "comment": ctx.position++; break;
            case "colon"  : this.walkColon(ctx, nodes, node); return;
            case "keyword": this.walkKeyword(ctx, nodes, node); return;
            case "name"   : this.walkName(ctx, nodes, node); return;                    
            case "string" :
            case "number" : this.walkLiteral(ctx, nodes, node); return;
            case "body"   : this.walkBody(ctx, node); return;
        }
        return true;
    }    

    private walkKeyword(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        switch(node.name) {                        
            case "define"   : this.walkDefinition(ctx, nodes, node);    return;            
            case "event"    : this.walkEvent(ctx, nodes, node);         return;
            case "create"   : this.walkCreate(ctx, nodes, node);        return;            
            case "set"      : this.walkStateFieldSet(ctx, nodes, node); return;
            case "store"    : this.walkStore(ctx, nodes, node);         return;
            case "transform": this.walkTransform(ctx, nodes, node);     return;
            case "nothing"  : case "none": this.walkEmpty(ctx);         return;
            default         : throw new SyntaxError("The " + node.name + " definition is not implemented.");
        }
    }

    private walkStore(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        this.assertAvailableNodes(ctx, nodes, 1);
        // store <A>
        // store <A> in <B>
        let referenceNode  = nodes[++ctx.position];
        let datasourceName = "";
        if (nodes.length - ctx.position > 1 && nodes[ctx.position+1].name === "in") {
            ctx.position++;
            datasourceName = nodes[++ctx.position].name;
        }

        ctx.stack.push(new KsStoreNode(referenceNode.name, datasourceName));
        ctx.position++;        
    }

    private walkTransform(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        this.assertAvailableNodes(ctx, nodes, 3);
        // transform <A> into <B>
        throw new SyntaxError("The " + node.name + " definition is not implemented.");
    }    

    private walkStateFieldSet(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        this.assertAvailableNodes(ctx, nodes, 2);
        // set <field> <value>
        // stop getting args when we reach next keyword or when end of children
        let name = nodes[++ctx.position];
        let value = nodes[++ctx.position];                                                        
        ctx.stack.push(new KsStateFieldSetNode(name.name, value.name));        
        ctx.position++;
    }

    private walkEvent(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 2);
        // event <reference> <event_name>
        let ref   = nodes[++ctx.position];
        let event = nodes[++ctx.position];
        ctx.stack.push(new KsEventNode(ref.name, event.name));
        ctx.position++;
    }

    private walkCreate(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 1);
        // create <type|state> [<arg1> <arg2> <arg3> ...]
        // stop getting args when we reach next keyword or when end of children
        // check whether we have an alias or not
        let name  : KsAstNode;
        let alias : string;
        if (nodes[ctx.position + 2].name === "from") {
            alias = nodes[++ctx.position].name;
            ++ctx.position; // skip 'from'
            name  = nodes[++ctx.position];
        }
        else {
            name = nodes[++ctx.position];
        }
        

        let args = [];
        while (ctx.position < nodes.length) {
            let node = nodes[++ctx.position];
            if (node === undefined || node === null || node.type === "keyword") {  ctx.position--; break; } //  ??                        
            args.push( new KsLiteralNode(node.name)); // KsArgumentNode
        }

        ctx.stack.push(new KsCreateNode(name.name, alias, args));
        ctx.position++;
    }    

    private walkEmpty(ctx: KsTransformerContext) { 
        ctx.position++;
        ctx.stack.push(new KsAstNode("nop", "nop"));
    }    

    private walkDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        // next node should contain the type we want to define
        this.assertAvailableNodes(ctx, nodes, 1);
        let definitionType = nodes[++ctx.position];
        switch(definitionType.name) {
            case "case"      : this.walkCaseDefinition(ctx, nodes, node); return;
            case "type"      : this.walkTypeDefinition(ctx, nodes, node); return;            
            case "state"     : this.walkStateDefinition(ctx, nodes, node); return;
            case "form"      : this.walkFormDefinition(ctx, nodes, node); return;
            case "datasource": this.walkDatasourceDefinition(ctx, nodes, node); return;                                    
            case "transform" : throw new SyntaxError("Transforms have Not yet been implemented");      
            default          : throw new SyntaxError("What the hell is a '"+ definitionType.name +"'?");

        }
    }

    private walkDatasourceDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 3);
        // define datasurce <name> for <type> <body>             
        let nameNode  = nodes[++ctx.position];
        let decorator = nodes[++ctx.position];
        if (decorator.name !== "for") {
            throw new SyntaxError("Unexpected decorator keyword '" + decorator.name + "' was found.");
        }
        let typeNode  = nodes[++ctx.position];
        let datasource = new KsDatasourceNode(nameNode.name, typeNode.name);                
        let bodyNode = nodes[++ctx.position];
        let oldStackSize = ctx.stack.length;        
        this.walkBody(ctx, bodyNode);
        let newItems = ctx.stack.length - oldStackSize;
        for (let i = 0; i < newItems; i++) {
            datasource.children.push(ctx.stack.pop());
        }
        datasource.reverseChildren();
        ctx.datasourceDefinitions.push(datasource);
    }    

    private walkFormDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 2);
        // define form <name> <body>
        let nameNode = nodes[++ctx.position];
        let form = new KsFormNode(nameNode.name);                        

        // peek next to see if its a body        
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("Form decoration not yet implemented");    
        }

        let bodyNode = nodes[++ctx.position];
        let oldStackSize = ctx.stack.length;        
        this.walkBody(ctx, bodyNode);
        let newItems = ctx.stack.length - oldStackSize;        
        for (let i = 0; i < newItems; i++) {
            form.children.push(ctx.stack.pop());
        }
        form.reverseChildren();
        ctx.formDefinitions.push(form);
    }

    private walkTypeDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 2);
        // we expect at least a name and body (minimal)
        let type = new KsTypeNode();        
        let nameNode = nodes[++ctx.position];
        type.typeName = nameNode.name;
        // peek next to see if its a body        
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("Type decoration not yet implemented");    
        }
        let bodyNode = nodes[++ctx.position];
        let oldStackSize = ctx.stack.length;        
        this.walkBody(ctx, bodyNode);
        let newItems = ctx.stack.length - oldStackSize;        
        for (let i = 0; i < newItems; i++) {
            type.children.push(ctx.stack.pop());
        }
        type.reverseChildren();
        ctx.typeDefinitions.push(type);
    }

    private walkCaseDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 2);
        // we expect a name and body
        let nameNode = nodes[++ctx.position];
        let caseNode = new KsCaseNode(nameNode.name);        

        // peek next to see if its a body        
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("Case decoration not yet implemented");    
        }
    
        let bodyNode = nodes[++ctx.position];
        // a case has multiple bodies inside this one
        // so we will need to get each seperately
        for(let i = 0; i < bodyNode.children.length; i+=2) {
            let caseBodyName = bodyNode.children[i];
            let caseBodyNode = bodyNode.children[i+1];
            let caseBody = new KsCaseBodyNode(caseBodyName.name);  
            let oldStackSize = ctx.stack.length;        
            this.walkBody(ctx, caseBodyNode);
            let newItems = ctx.stack.length - oldStackSize;                  
            for (let i = 0; i < newItems; i++) {
                caseBody.children.push(ctx.stack.pop());
            }
            caseBody.reverseChildren();
            caseNode.children.push(caseBody);
        }
        ctx.caseDefinitions.push(caseNode);
    }

    private walkStateDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) { 
        this.assertAvailableNodes(ctx, nodes, 3);
        // define state <name> from <type> <body>          
        let nameNode  = nodes[++ctx.position];
        let decorator = nodes[++ctx.position];
        if (decorator.name !== "from") {
            throw new SyntaxError("Unexpected decorator keyword '" + decorator.name + "' was found.");
        }
        let typeNode  = nodes[++ctx.position];
        let state = new KsStateNode(nameNode.name, typeNode.name);                
        let bodyNode = nodes[++ctx.position];
        let oldStackSize = ctx.stack.length;        
        this.walkBody(ctx, bodyNode);
        let newItems = ctx.stack.length - oldStackSize;        
        for (let i = 0; i < newItems; i++) {
            state.children.push(ctx.stack.pop());
        }
        state.reverseChildren();
        ctx.stateDefinitions.push(state);
    }

    private walkColon(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        this.assertAvailableNodes(ctx, nodes, 1);        
        // expect the next node to be a type
        // something : typename
        // something : typename "default_value" << not implemented        
        let prev  = ctx.stack.pop();                
        if (!(prev instanceof KsLiteralNode)) {
            throw new SyntaxError("Only literals are currently allowed as left side hand of a colon");
            // TODO(Kalle): implement left-side keyword for single line operations
            //              ex: keyword: literal1 literal2 literal3 ... 
            //                  "when: event my_awesome_button click"
        }
        let left  = prev as KsLiteralNode;        
        let right = nodes[++ctx.position];

        ctx.stack.push(new KsFieldNode(left.value, right.name));
        ctx.position++;
    }    

    private walkName(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {
        ctx.stack.push(new KsLiteralNode(node.name));
        ctx.position++;        
    }
    
    private walkLiteral(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode) {        
        ctx.stack.push(new KsLiteralNode(node.name));
        ctx.position++;
    }
    
    private walkBody(ctx: KsTransformerContext, node : KsAstNode) {
        let bodyCtx = new KsTransformerContext();
        bodyCtx.stack = ctx.stack;
        for (var i = 0; i < node.children.length; i++) this.walkNodes(bodyCtx, node.children);        
        ctx.stack = bodyCtx.stack;
        ctx.position++;
    }    

    private assertAvailableNodes(ctx: KsTransformerContext, nodes : KsAstNode[], expectedNodeCount: number) {
        if (ctx.position + expectedNodeCount >= nodes.length) { 
            throw new SyntaxError("Unexpected end of source. '" + expectedNodeCount + 
                                  "' more nodes was expected but there is '" + (nodes.length - ctx.position) + "' nodes left.");
        }
    }                                      
}