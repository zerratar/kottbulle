import { KsLiteralNode, KsAppNode, KsTypeNode, KsFormNode, KsListNode, KsDatasourceNode,
         KsCaseNode, KsCaseBodyNode, KsStateNode, KsFieldNode, KsStateFieldSetNode,
         KsCreateNode, KsEventNode, KsStoreNode, KsLoadNode, KsPrintNode, KsSituationNode } from "./nodes/ksnodes";
import { KsAppMeta, KsApp, KsForm, KsDatasource, KsType, KsCase, KsCaseBody,
         KsListOperation, KsCreateOperation, KsLoadOperation, KsEventOperation, KsArgument ,
         KsState, KsField, KsFieldReference, KsStoreOperation, KsPrintOperation, KsSituation } from "./definitions";
import { KsProgramTree } from "./ksprogramtree";
import { KsTransformer } from "./kstransformer";
import { KsValidator } from "./ksvalidator";
import { KsLexer, KsToken } from "./kslexer";
import { KsAst,KsAstNode } from "./ksast";

export class KsInterpreter {
    private lexer       : KsLexer;
    private transformer : KsTransformer;
    private validator : KsValidator;
    constructor(lexer : KsLexer, transformer : KsTransformer, validator : KsValidator) {
        this.lexer       = lexer;
        this.transformer = transformer;
        this.validator   = validator;
    }

    /**
     * compiles the input source and generates a Kötbullescript Program Tree
     * @param source
     * @returns {KsProgramTree}
     */
    compile(source: string): KsProgramTree {
        let tokens: KsToken[]     = this.lexer.parse(source);
        let ast   : KsAst         = this.transformer.transform(tokens);
        let app   : KsProgramTree = this.buildProgramTree(ast);
        this.validator.validateAndThrowIfFailed(app);
        return app;
    }

    /**
     * takes the ast produced from the transformer and builds the program tree
     * @param ast
     * @returns {KsProgramTree}
     */
    private buildProgramTree(ast:KsAst): KsProgramTree {
        return new KsProgramTree(ast,
            this.buildApps(ast),
            this.buildDatasources(ast),
            this.buildSituations(ast),
            this.buildForms(ast),
            this.buildTypes(ast),
            this.buildCases(ast),
            this.buildStates(ast)
        );
    }

    private buildApps(ast: KsAst): KsApp[] {
        let apps : KsApp[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsAppNode) {
                let appNode: KsAppNode = node as KsAppNode;
                let app    : KsApp     = new KsApp(appNode.appName);
                for (let j: number = 0; j < appNode.children.length; j++) {
                    let caseBodyInfo: KsAstNode = appNode.children[j];
                    if (caseBodyInfo instanceof KsCaseBodyNode) {
                        let caseBodyNode: KsCaseBodyNode = caseBodyInfo as KsCaseBodyNode;
                        if (caseBodyNode.bodyName === "meta") {
                            let meta: KsAppMeta = new KsAppMeta();
                            for (let j: number = 0; j < caseBodyNode.children.length; j++) {
                                let fieldInfo: KsAstNode = caseBodyNode.children[j];
                                if (fieldInfo instanceof KsStateFieldSetNode) {
                                    let fieldSet: KsStateFieldSetNode = fieldInfo as KsStateFieldSetNode;
                                    meta.values.push(new KsFieldReference(fieldSet.fieldName, fieldSet.fieldValue));
                                }
                            }
                            app.meta = meta;
                        } else if(caseBodyNode.bodyName === "situations") {
                            let situations : string[] = [];
                             for (let j: number = 0; j < caseBodyNode.children.length; j++) {
                                let n: KsAstNode = caseBodyNode.children[j];
                                if (n instanceof KsLiteralNode) {
                                    situations.push((n as KsLiteralNode).value);
                                } else {
                                    situations.push(n.name);
                                }
                            }
                            app.situations = situations;
                        } else {
                            throw SyntaxError("Unknown app body '" + caseBodyNode.bodyName + "'");
                        }
                    }
                }
                apps.push(app);
            }
        }
        return apps;
    }

    private buildSituations(ast: KsAst): KsSituation[] {
        let situations: KsSituation[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsSituationNode) {
                let situationNode : KsSituationNode = node as KsSituationNode;
                let situation     : KsSituation     = new KsSituation(situationNode.situationName, situationNode.cases);
                for (let j: number = 0; j < situationNode.children.length; j++) {
                    let caseBodyInfo: KsAstNode = situationNode.children[j];
                    if(caseBodyInfo instanceof KsStateFieldSetNode) {
                        let fieldSet: KsStateFieldSetNode = caseBodyInfo as KsStateFieldSetNode;
                        situation.attributes.push(new KsFieldReference(fieldSet.fieldName, fieldSet.fieldValue));
                    }
                }
                situations.push(situation);
            }
        }
        return situations;
    }

    private buildDatasources(ast: KsAst): KsDatasource[] {
        let datasources : KsDatasource[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsDatasourceNode) {
                let dsNode    : KsDatasourceNode = node as KsDatasourceNode;
                let datasource: KsDatasource     = new KsDatasource(dsNode.datasourceName, dsNode.datasourceType);

                for (let j: number = 0; j < dsNode.children.length; j++) {
                    let fieldInfo: KsAstNode = dsNode.children[j];
                    if (fieldInfo instanceof KsStateFieldSetNode) {
                        let fieldSet : KsStateFieldSetNode = fieldInfo as KsStateFieldSetNode;
                        datasource.values.push(new KsFieldReference(fieldSet.fieldName, fieldSet.fieldValue));
                    }
                }
                datasources.push(datasource);
            }
        }
        return datasources;
    }

    private buildForms(ast: KsAst): KsForm[] {
        let forms : KsForm[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsFormNode) {
                let formNode: KsFormNode = node as KsFormNode;
                let form    : KsForm     = new KsForm(formNode.formName);
                for(let j: number = 0; j < formNode.children.length; j++) {
                    let fieldNode: KsFieldNode = formNode.children[j] as KsFieldNode;
                    if (fieldNode) {
                        form.fields.push(new KsField(fieldNode.fieldName, fieldNode.fieldType));
                    }
                }
                forms.push(form);
            }
        }
        return forms;
    }

    private buildTypes(ast: KsAst): KsType[] {
        let types : KsType[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsTypeNode) {
                let typeNode: KsTypeNode = node as KsTypeNode;
                let type    : KsType     = new KsType(typeNode.typeName);
                for(let j: number = 0; j < typeNode.children.length; j++) {
                    let fieldNode: KsFieldNode = typeNode.children[j] as KsFieldNode;
                    if (fieldNode) {
                        type.fields.push(new KsField(fieldNode.fieldName, fieldNode.fieldType));
                    }
                }
                types.push(type);
            }
        }
        return types;
    }

    private buildCases(ast: KsAst): KsCase[] {
        let cases : KsCase[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsCaseNode) {
                let caseNode: KsCaseNode = node as KsCaseNode;
                let _case   : KsCase     = new KsCase(caseNode.caseName);
                for (let j: number = 0; j < caseNode.children.length; j++) {
                    let caseBodyInfo: KsAstNode = caseNode.children[j];
                    if (caseBodyInfo instanceof KsCaseBodyNode) {
                        let caseBodyNode: KsCaseBodyNode = caseBodyInfo as KsCaseBodyNode;
                        let caseBody    : KsCaseBody     = new KsCaseBody(caseBodyNode.bodyName);
                        for (let k: number = 0; k < caseBodyNode.children.length; k++) {
                            // . TODO(Kalle): implement operations
                            if (caseBodyNode.children[k] instanceof KsEventNode) {
                                let eventNode: KsEventNode = caseBodyNode.children[k] as KsEventNode;
                                caseBody.operations.push(new KsEventOperation(caseNode.caseName,
                                                                              eventNode.reference,
                                                                              eventNode.eventName));
                            }

                            if (caseBodyNode.children[k] instanceof KsCreateNode) {
                                let args      : KsArgument[] = [];
                                let createNode: KsCreateNode = caseBodyNode.children[k] as KsCreateNode;
                                for (let n: number = 0; n < createNode.args.length; n++) {
                                    args.push(new KsArgument(createNode.args[n].value,
                                                             createNode.args[n].type === "name"));
                                }
                                caseBody.operations.push(new KsCreateOperation(caseNode.caseName,
                                                                               createNode.typeName,
                                                                               createNode.alias, args));
                            }

                            if (caseBodyNode.children[k] instanceof KsListNode) {
                                let listNode: KsListNode = caseBodyNode.children[k] as KsListNode;
                                caseBody.operations.push(new KsListOperation(caseNode.caseName, listNode.reference, listNode.rowform));
                            }

                            if (caseBodyNode.children[k] instanceof KsStoreNode) {
                                let storeNode: KsStoreNode = caseBodyNode.children[k] as KsStoreNode;
                                caseBody.operations.push(new KsStoreOperation(caseNode.caseName,
                                                                              storeNode.reference,
                                                                              storeNode.datasource));
                            }

                            if (caseBodyNode.children[k] instanceof KsLoadNode) {
                                let loadNode: KsLoadNode = caseBodyNode.children[k] as KsLoadNode;
                                caseBody.operations.push(new KsLoadOperation(caseNode.caseName,
                                                                             loadNode.alias,
                                                                             loadNode.datasource,
                                                                             loadNode.where));
                            }

                            if (caseBodyNode.children[k] instanceof KsPrintNode) {
                                let printNode: KsPrintNode = caseBodyNode.children[k] as KsPrintNode;
                                caseBody.operations.push(new KsPrintOperation(caseNode.caseName, printNode.toPrint, printNode.byRef));
                            }

                            /* 
                            if (caseBodyNode.children[k] instanceof KsTransformNode) {                                
                                
                            }  
                            
                            if (caseBodyNode.children[k] instanceof KsLoadNode) {                                
                                
                            }                            
                            */

                        }
                        _case.caseBodies.push(caseBody);
                    }
                }
                cases.push(_case);
            }
        }
        return cases;
    }

    private buildStates(ast: KsAst): KsState[] {
        let states : KsState[] = [];
        for (let i: number = 0; i < ast.root.children.length; i++) {
            let node: KsAstNode = ast.root.children[i];
            if (node instanceof KsStateNode) {
                let stateNode: KsStateNode = node as KsStateNode;
                let state    : KsState     = new KsState(stateNode.stateName, stateNode.stateType);

                for (let j: number = 0; j < stateNode.children.length; j++) {
                    let fieldInfo: KsAstNode = stateNode.children[j];
                    if (fieldInfo instanceof KsFieldNode) {
                        // field definition
                        let fieldDefinition: KsFieldNode = fieldInfo as KsFieldNode;
                        state.fields.push(new KsField(fieldDefinition.fieldName, fieldDefinition.fieldType, fieldDefinition.defaultValue));
                    }
                    if (fieldInfo instanceof KsStateFieldSetNode) {
                        let fieldSet: KsStateFieldSetNode = fieldInfo as KsStateFieldSetNode;
                        state.overrides.push(new KsFieldReference(fieldSet.fieldName, fieldSet.fieldValue));
                    }
                }
                states.push(state);
            }
        }
        return states;
    }
}