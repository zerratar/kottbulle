import { KsAppNode, KsTypeNode, KsFormNode, KsDatasourceNode,KsListNode,
         KsLiteralNode, KsLoadNode, KsFieldNode, KsStateNode, KsCaseNode,
         KsCaseBodyNode, KsEventNode, KsCreateNode, KsStateFieldSetNode,
         KsStoreNode, KsPrintNode, KsSituationNode, KsRemoveNode, KsShowNode } from "./nodes/ksnodes";
import { KsToken } from "./kslexer";
import { KsAst, KsAstNode } from "./ksast";

class KsTransformerContext {
    position              : number             = 0;
    datasourceDefinitions : KsDatasourceNode[] = [];
    situationDefinitions  : KsSituationNode[]  = [];
    stateDefinitions      : KsStateNode[]      = [];
    typeDefinitions       : KsTypeNode[]       = [];
    caseDefinitions       : KsCaseNode[]       = [];
    formDefinitions       : KsFormNode[]       = [];
    appDefinitions        : KsAppNode[]        = [];
    stack                 : KsAstNode[]        = [];
}

export class KsTransformer {

    /**
     * transform the tokens provided from the lexer and generates an ast
     * @param tokens
     * @returns {KsAst}
     */
    transform(tokens:KsToken[]): KsAst {
        let initialAst: KsAst = this.initialTransform(tokens);
        let finalAst  : KsAst = this.finalTransform(initialAst);
        return finalAst;
    }

    /**
     * creates the initial ast using the tokens we got from the lexer
     * @param tokens
     * @returns {KsAst}
     */
    private initialTransform(tokens:KsToken[]): KsAst {
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

    private walkTokens(ctx: KsTransformerContext, tokens: KsToken[]): KsAstNode {
        let token: KsToken = tokens[ctx.position];
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
                let bodyNode: KsAstNode = new KsAstNode("body", null);
                while (token !== null && token.value !== this.getClosingChar(token.type)) {
                    bodyNode.children.push(this.walkTokens(ctx, tokens));
                    if (ctx.position >= tokens.length) {
                        throw new SyntaxError("No matching end of body character was found. Expected '"
                                            + this.getClosingChar(token.type) + "'");
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
        let lc: string = token.toLowerCase();
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
            || lc === "store"   || lc === "meta"      || lc === "cases"
            || lc === "print"   || lc === "alert"     || lc === "situation"
            || lc === "first"   || lc === "init"      || lc === "main"
            || lc === "remove"  || lc === "load"      || lc === "list"
            || lc === "situations";
    }

    private isNumber(token: string): boolean {
        let n: number = parseFloat(token);
        return !isNaN(n) && isFinite(n);
    }

    private getClosingChar(ofType:string): string {
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
    private finalTransform(ast: KsAst): KsAst {
        console.time("KsTransformer->finalTransform");

        let ctx      : KsTransformerContext = new KsTransformerContext();
        let finalApp : KsAstNode            = new KsAstNode("program", "Köttbullescript");
        let finalAst : KsAst                = new KsAst(finalApp);
        let nodeCount: number               = ast.root.children.length;

        while (ctx.position < nodeCount) {
            this.walkNodes(ctx, ast.root.children);
            if (ctx.position >= nodeCount) { break; }
        }

        while (ctx.appDefinitions.length         > 0) { finalApp.children.splice(0, 0, ctx.appDefinitions.pop()); }
        while (ctx.typeDefinitions.length        > 0) { finalApp.children.splice(0, 0, ctx.typeDefinitions.pop()); }
        while (ctx.stateDefinitions.length       > 0) { finalApp.children.splice(0, 0, ctx.stateDefinitions.pop()); }
        while (ctx.caseDefinitions.length        > 0) { finalApp.children.splice(0, 0, ctx.caseDefinitions.pop()); }
        while (ctx.formDefinitions.length        > 0) { finalApp.children.splice(0, 0, ctx.formDefinitions.pop()); }
        while (ctx.datasourceDefinitions.length  > 0) { finalApp.children.splice(0, 0, ctx.datasourceDefinitions.pop()); }
        while (ctx.situationDefinitions.length   > 0) { finalApp.children.splice(0, 0, ctx.situationDefinitions.pop()); }
        while (ctx.stack.length                  > 0) { finalApp.children.splice(0, 0, ctx.stack.pop()); }

        console.timeEnd("KsTransformer->finalTransform");
        return finalAst;
    }

    private walkNodes(ctx: KsTransformerContext, nodes : KsAstNode[]): boolean {
        if (ctx.position >= nodes.length) { return false; }
        let node: KsAstNode = nodes[ctx.position];
        if (node === undefined) {
            // most likely a comment node that got skipped
            ctx.position++;
            return;
        }
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

    private walkKeyword(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        switch(node.name) {
            case "define"   : this.walkDefinition(ctx, nodes, node);    return;
            case "event"    : this.walkEvent(ctx, nodes, node);         return;
            case "create"   : this.walkCreate(ctx, nodes, node);        return;
            case "set"      : this.walkStateFieldSet(ctx, nodes, node); return;
            case "store"    : this.walkStore(ctx, nodes, node);         return;
            case "load"     : this.walkLoad(ctx, nodes, node);          return;
            case "remove"   : this.walkRemove(ctx, nodes, node);        return;
            case "show"     : this.walkShow(ctx, nodes, node);          return;
            case "list"     : this.walkList(ctx, nodes, node);          return;
            case "print"    : this.walkPrint(ctx, nodes, node);         return;
            case "transform": this.walkTransform(ctx, nodes, node);     return;
            case "nothing"  : case "none" : this.walkEmpty(ctx);        return;
            default         : throw new SyntaxError("The " + node.name + " definition is not implemented.");
        }
    }

    private walkPrint(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 1);
        // print <A>
        let toPrintNode: KsAstNode  = nodes[++ctx.position];
        ctx.stack.push(new KsPrintNode(toPrintNode.name, toPrintNode.type === "name"));
        ctx.position++;
    }

    private walkList(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 1);
        // list <collection_reference>
        // list <collection_reference> using <form_reference> [<args1> <args2> ...]
        // list <item_alias> from <collection_reference>        
        // list <item_alias> from <collection_reference> using <form_reference> [<args1> <args2> ...]
        let args:KsLiteralNode[] = [];
        let toListNode: string   = nodes[++ctx.position].name;
        let rowform   : string   = "";
        let itemalias : string   = "";

        if (ctx.position +1 < nodes.length && nodes[ctx.position+1].name === "from") {
            ctx.position++;
            itemalias  = toListNode;
            toListNode = nodes[++ctx.position].name;
        }

        if (ctx.position +1 < nodes.length && nodes[ctx.position+1].name === "using") {
            ctx.position++;
            rowform = nodes[++ctx.position].name;

            // read arguments until next keyword or end of nodes
            while (ctx.position < nodes.length) {
                let node: KsAstNode = nodes[++ctx.position];
                if (node === undefined || node === null || node.type === "keyword") {  ctx.position--; break; }
                args.push( new KsLiteralNode(node.name));
            }
        }

        ctx.stack.push(new KsListNode(toListNode, itemalias, rowform, args));
        ctx.position++;
    }

    private walkStore(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 1);
        // store <A>
        // store <A> in <B>
        let referenceNode : KsAstNode = nodes[++ctx.position];
        let datasourceName: string    = "";
        if (nodes.length - ctx.position > 1 && nodes[ctx.position+1].name === "in") {
            ctx.position++;
            datasourceName = nodes[++ctx.position].name;
        }

        ctx.stack.push(new KsStoreNode(referenceNode.name, datasourceName));
        ctx.position++;
    }

    private walkShow(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 3);
        // show <form> using <model_reference>
        let form : string = nodes[++ctx.position].name;
        if (nodes[ctx.position+1].name !== "using") {
            throw new SyntaxError("Expected 'using' but found '" + nodes[ctx.position+1].name + "'");
        }

        ctx.position++;
        let reference : string = nodes[++ctx.position].name;

        ctx.stack.push(new KsShowNode(form, reference));
        ctx.position++;
    }

    private walkRemove(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 3);
        // remove <item> from <datasource> | <collection_reference>
        let itemAlias : string = nodes[++ctx.position].name;
        let where     : string = "";
        if (nodes[ctx.position+1].name !== "from") {
            throw new SyntaxError("Expected 'from' but found '" + nodes[ctx.position+1].name + "'");
        }
        ctx.position++;
        let collection : string = nodes[++ctx.position].name;

        // . TODO(Kalle): implement 'where'  

        ctx.stack.push(new KsRemoveNode(itemAlias, collection, where));
        ctx.position++;
    }

    private walkLoad(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 3);
        // load <alias> from <datasource> [where (prop eq value)]
        let aliasNode     : KsAstNode = nodes[++ctx.position];
        let datasourceName: string    = "";
        let where         : string    = "";
        if (nodes.length - ctx.position > 1 && nodes[ctx.position+1].name === "from") {
            ctx.position++;
            datasourceName = nodes[++ctx.position].name;
            if (ctx.position + 1 < nodes.length && nodes[ctx.position+1].name === "where") {
                ctx.position++;
                let whereNode: KsAstNode = nodes[++ctx.position];
                if (whereNode) {
                    throw new SyntaxError("we have a where, but we don't know how. Sorry! Not implemented yet");
                }
            }
        } else {
            throw new SyntaxError("Nopes! you cannot load stuff without specifying a datasource."
                                + " You kinda missed the whole 'from <datasource>' part!");
        }

        ctx.stack.push(new KsLoadNode(aliasNode.name, datasourceName, where));
        ctx.position++;
    }

    private walkTransform(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 3);
        // transform <A> into <B>
        throw new SyntaxError("The " + node.name + " definition is not implemented.");
    }

    private walkStateFieldSet(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 2);
        // set <field> <value>
        // stop getting args when we reach next keyword or when end of children
        let name : KsAstNode = nodes[++ctx.position];
        let value: KsAstNode = nodes[++ctx.position];
        ctx.stack.push(new KsStateFieldSetNode(name.name, value.name));
        ctx.position++;
    }

    private walkEvent(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 2);
        // event <reference> <event_name>
        let ref  : KsAstNode = nodes[++ctx.position];
        let event: KsAstNode = nodes[++ctx.position];
        ctx.stack.push(new KsEventNode(ref.name, event.name));
        ctx.position++;
    }

    private walkCreate(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
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
        } else {
            name = nodes[++ctx.position];
        }


        let args:KsLiteralNode[] = [];
        while (ctx.position < nodes.length) {
            let node: KsAstNode = nodes[++ctx.position];
            if (node === undefined || node === null || node.type === "keyword") {  ctx.position--; break; } //  ??
            args.push( new KsLiteralNode(node.name));
        }

        ctx.stack.push(new KsCreateNode(name.name, alias, args));
        ctx.position++;
    }

    private walkEmpty(ctx: KsTransformerContext): void {
        ctx.position++;
        ctx.stack.push(new KsAstNode("nop", "nop"));
    }

    private walkDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        // next node should contain the type we want to define
        this.assertAvailableNodes(ctx, nodes, 1);
        let definitionType: KsAstNode = nodes[++ctx.position];
        switch(definitionType.name) {
            case "app"       : this.walkAppDefinition(ctx, nodes, node);        return;
            case "case"      : this.walkCaseDefinition(ctx, nodes, node);       return;
            case "form"      : this.walkFormDefinition(ctx, nodes, node);       return;
            case "type"      : this.walkTypeDefinition(ctx, nodes, node);       return;
            case "state"     : this.walkStateDefinition(ctx, nodes, node);      return;
            case "situation" : this.walkSituationDefinition(ctx, nodes, node);  return;
            case "datasource": this.walkDatasourceDefinition(ctx, nodes, node); return;
            case "transform" : throw new SyntaxError("Transforms have Not yet been implemented");
            default          : throw new SyntaxError("What the hell is a '"+ definitionType.name +"'?");

        }
    }

    private walkSituationDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 1);
        // define situation <name> 
        let nameNode      : KsAstNode       = nodes[++ctx.position];
        let situationNode : KsSituationNode = new KsSituationNode(nameNode.name);
        if (nodes[ctx.position + 1].type !== "body") {
            throw new SyntaxError("Situation expected a body node after the name");
        }
        let bodyNode: KsAstNode            = nodes[++ctx.position];
        let tmpCtx  : KsTransformerContext = new KsTransformerContext();
        for(tmpCtx.position = 0; tmpCtx.position < bodyNode.children.length; ) {
            let node: KsAstNode = bodyNode.children[tmpCtx.position];
            if (node.type === "body") {
                // although, this shouldnt happen but it CAN if for some reason "cases" has been omitted
                // lets be nice and correct ourselves if this happens, even if we don't recommend it.
                node.removeUndefinedChildren();
                for(let j:number = 0; j < node.children.length; j++) {
                    situationNode.cases.push(node.children[j].name);
                }
                tmpCtx.position++;
            } else if (node.type === "keyword" && node.name === "cases") {
                // build cases body
                let body: KsAstNode = bodyNode.children[++tmpCtx.position];
                body.removeUndefinedChildren();
                for(let j:number = 0; j < body.children.length; j++) {
                    situationNode.cases.push(body.children[j].name);
                }
                tmpCtx.position++;
            } else if(node.type === "keyword" && node.name === "set") {
                // add attribute
                this.walkStateFieldSet(tmpCtx, bodyNode.children, node);
                situationNode.children.push(tmpCtx.stack.pop());
            }
        }
        situationNode.children.reverse();
        ctx.situationDefinitions.push(situationNode);
        ctx.position++;
    }

    private walkAppDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 2);
        let nameNode: KsAstNode = nodes[++ctx.position];
        let appNode : KsAppNode = new KsAppNode(nameNode.name);
        // peek next to see if its a body
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("App decoration not yet implemented");
        }

        let bodyNode: KsAstNode = nodes[++ctx.position];
        // a case has multiple bodies inside this one
        // so we will need to get each seperately
        for(let i: number = 0; i < bodyNode.children.length; i+=2) {
            let appBodyName : KsAstNode      = bodyNode.children[i];
            let appBodyNode : KsAstNode      = bodyNode.children[i+1];
            let appBody     : KsCaseBodyNode = new KsCaseBodyNode(appBodyName.name);
            let oldStackSize: number         = ctx.stack.length;
            this.walkBody(ctx, appBodyNode);
            let newItems: number = ctx.stack.length - oldStackSize;
            for (let i: number = 0; i < newItems; i++) {
                appBody.children.push(ctx.stack.pop());
            }
            appBody.reverseChildren();
            appNode.children.push(appBody);
        }

        appNode.reverseChildren();
        ctx.position -= (appNode.children.length - 1);
        ctx.appDefinitions.push(appNode);
    }

    private walkDatasourceDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 4);
        // define datasurce <name> for <type> <body>
        let nameNode : KsAstNode = nodes[++ctx.position];
        let decorator: KsAstNode = nodes[++ctx.position];
        if (decorator.name !== "for") {
            throw new SyntaxError("Unexpected decorator keyword '" + decorator.name + "' was found.");
        }
        let typeNode  : KsAstNode        = nodes[++ctx.position];
        let datasource: KsDatasourceNode = new KsDatasourceNode(nameNode.name, typeNode.name);
        let bodyNode  : KsAstNode        = nodes[++ctx.position];
        let oldStackSize : number        = ctx.stack.length;
        this.walkBody(ctx, bodyNode);
        let newItems: number = ctx.stack.length - oldStackSize;
        for (let i: number = 0; i < newItems; i++) {
            datasource.children.push(ctx.stack.pop());
        }
        datasource.reverseChildren();
        ctx.datasourceDefinitions.push(datasource);
    }

    private walkFormDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 2);
        // define form <name> <body>
        let nameNode: KsAstNode  = nodes[++ctx.position];
        let form    : KsFormNode = new KsFormNode(nameNode.name);

        // peek next to see if its a body
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("Form decoration not yet implemented");
        }

        let bodyNode: KsAstNode = nodes[++ctx.position];
        let oldStackSize: number = ctx.stack.length;
        this.walkBody(ctx, bodyNode);
        let newItems: number = ctx.stack.length - oldStackSize;
        for (let i: number = 0; i < newItems; i++) {
            form.children.push(ctx.stack.pop());
        }
        form.reverseChildren();
        ctx.formDefinitions.push(form);
    }

    private walkTypeDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 2);
        // we expect at least a name and body (minimal)
        let type    : KsTypeNode = new KsTypeNode();
        let nameNode: KsAstNode  = nodes[++ctx.position];
        type.typeName = nameNode.name;
        // peek next to see if its a body
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("Type decoration not yet implemented");
        }
        let bodyNode    : KsAstNode = nodes[++ctx.position];
        let oldStackSize: number    = ctx.stack.length;
        this.walkBody(ctx, bodyNode);
        let newItems: number = ctx.stack.length - oldStackSize;
        for (let i: number = 0; i < newItems; i++) {
            type.children.push(ctx.stack.pop());
        }
        type.reverseChildren();
        ctx.typeDefinitions.push(type);
    }

    private walkCaseDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 2);
        // we expect a name and body
        let nameNode: KsAstNode  = nodes[++ctx.position];
        let caseNode: KsCaseNode = new KsCaseNode(nameNode.name);

        // peek next to see if its a body
        if (nodes[ctx.position + 1].type !== "body") {
            // do something with the extra type decoration
            // 'implements' 'extends' 'overrides' 'whatever'
            throw new SyntaxError("Case decoration not yet implemented");
        }

        let bodyNode: KsAstNode = nodes[++ctx.position];
        // a case has multiple bodies inside this one
        // so we will need to get each seperately
        for(let i: number = 0; i < bodyNode.children.length; i+=2) {
            let caseBodyName: KsAstNode      = bodyNode.children[i];
            let caseBodyNode: KsAstNode      = bodyNode.children[i+1];
            let caseBody    : KsCaseBodyNode = new KsCaseBodyNode(caseBodyName.name);
            let oldStackSize: number         = ctx.stack.length;
            this.walkBody(ctx, caseBodyNode);
            let newItems: number = ctx.stack.length - oldStackSize;
            for (let i: number = 0; i < newItems; i++) {
                caseBody.children.push(ctx.stack.pop());
            }
            caseBody.reverseChildren();
            caseNode.children.push(caseBody);
        }

        // seem like we are jumping ahead of ourselves
        ctx.position -= (caseNode.children.length - 1);
        ctx.caseDefinitions.push(caseNode);
    }

    private walkStateDefinition(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 3);
        // define state <name> from <type> <body>
        let nameNode : KsAstNode = nodes[++ctx.position];
        let decorator: KsAstNode = nodes[++ctx.position];
        if (decorator.name !== "from") {
            throw new SyntaxError("Unexpected decorator keyword '" + decorator.name + "' was found.");
        }
        let typeNode: KsAstNode   = nodes[++ctx.position];
        let state   : KsStateNode = new KsStateNode(nameNode.name, typeNode.name);
        let bodyNode: KsAstNode   = nodes[++ctx.position];
        let oldStackSize: number  = ctx.stack.length;
        this.walkBody(ctx, bodyNode);
        let newItems: number = ctx.stack.length - oldStackSize;
        for (let i: number = 0; i < newItems; i++) {
            state.children.push(ctx.stack.pop());
        }
        state.reverseChildren();
        ctx.stateDefinitions.push(state);
    }

    private walkColon(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        this.assertAvailableNodes(ctx, nodes, 1);
        // expect the next node to be a type
        // something : typename
        // something : typename "default_value" << not implemented
        let prev: KsAstNode  = ctx.stack.pop();
        if (!(prev instanceof KsLiteralNode)) {
            throw new SyntaxError("Only literals are currently allowed as left side hand of a colon");
            // . TODO(Kalle): implement left-side keyword for single line operations
            //              ex: keyword: literal1 literal2 literal3 ...
            //                  "when: event my_awesome_button click"
        }
        let left : KsLiteralNode = prev as KsLiteralNode;
        let right: KsAstNode     = nodes[++ctx.position];

        ctx.stack.push(new KsFieldNode(left.value, right.name));
        ctx.position++;
    }

    private walkName(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        ctx.stack.push(new KsLiteralNode(node.name));
        ctx.position++;
    }

    private walkLiteral(ctx: KsTransformerContext, nodes : KsAstNode[], node : KsAstNode): void {
        ctx.stack.push(new KsLiteralNode(node.name));
        ctx.position++;
    }

    private walkBody(ctx: KsTransformerContext, node : KsAstNode): void {
        let bodyCtx: KsTransformerContext = new KsTransformerContext();
        bodyCtx.stack = ctx.stack;
        node.removeUndefinedChildren();
        for (var i: number = 0; i < node.children.length; i++) { this.walkNodes(bodyCtx, node.children); }
        ctx.stack = bodyCtx.stack;
        ctx.position++;
    }

    private assertAvailableNodes(ctx: KsTransformerContext, nodes : KsAstNode[], expectedNodeCount: number): void {
        if (ctx.position + expectedNodeCount >= nodes.length) {
            throw new SyntaxError("Unexpected end of source. '" + expectedNodeCount +
                                  "' more nodes was expected but there is '" + (nodes.length - ctx.position)
                                  + "' nodes left.");
        }
    }
}