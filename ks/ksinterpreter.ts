import { KsLiteralNode,KsAppNode,KsTypeNode,KsFormNode, KsDatasourceNode, KsCaseNode, KsCaseBodyNode, KsStateNode, KsFieldNode, KsStateFieldSetNode, KsCreateNode, KsEventNode, KsStoreNode, KsPrintNode } from './nodes/ksnodes';
import { KsAppMeta, KsApp, KsForm, KsDatasource, KsType, KsCase, KsCaseBody, KsCaseBodyOperation, KsCreateOperation, KsEventOperation, KsArgument ,KsState, KsField, KsFieldReference, KsStoreOperation, KsPrintOperation } from './definitions';
import { KsProgramTree } from './ksprogramtree';
import { KsTransformer } from './kstransformer';
import { KsValidator } from './ksvalidator';
import { KsLexer } from './kslexer';
import { KsAst } from './ksast';

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
        let tokens = this.lexer.parse(source);
        let ast    = this.transformer.transform(tokens);
        let app    = this.buildProgramTree(ast);
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
            this.buildForms(ast),            
            this.buildTypes(ast),
            this.buildCases(ast),
            this.buildStates(ast)            
        );
    }

    private buildApps(ast: KsAst): KsApp[] {
        let apps : KsApp[] = [];        
        for (let i = 0; i < ast.root.children.length; i++){
            let node = ast.root.children[i];                    
            if (node instanceof KsAppNode) {
                let appNode = node as KsAppNode;                    
                let app = new KsApp(appNode.appName);                
                for (let j = 0; j < appNode.children.length; j++) {
                    let caseBodyInfo = appNode.children[j];
                    if (caseBodyInfo instanceof KsCaseBodyNode) {
                        let caseBodyNode = caseBodyInfo as KsCaseBodyNode;
                        if (caseBodyNode.bodyName === "meta") {
                            let meta = new KsAppMeta();
                            for (let j = 0; j < caseBodyNode.children.length; j++) {
                                let fieldInfo = caseBodyNode.children[j];                    
                                if (fieldInfo instanceof KsStateFieldSetNode) {                        
                                    let fieldSet = fieldInfo as KsStateFieldSetNode;
                                    meta.values.push(new KsFieldReference(fieldSet.fieldName, fieldSet.fieldValue));
                                }
                            }           
                            app.meta = meta;     
                        }
                        else if(caseBodyNode.bodyName === "cases") {
                            let cases : string[] = [];
                             for (let j = 0; j < caseBodyNode.children.length; j++) {
                                let n = caseBodyNode.children[j];
                                if (n instanceof KsLiteralNode) {
                                    cases.push((n as KsLiteralNode).value);
                                }
                                else {
                                    cases.push(n.name);
                                }
                            }               
                            app.cases = cases; 
                        }
                        else {
                            throw SyntaxError("Unknown app body '" + caseBodyNode.bodyName + "'");
                        }                                              
                    }                    
                }        
                apps.push(app);        
            }
        }
        return apps;
    }

    private buildDatasources(ast: KsAst): KsDatasource[] {
        let datasources : KsDatasource[] = [];
        for (let i = 0; i < ast.root.children.length; i++){
            let node     = ast.root.children[i];                   
            if (node instanceof KsDatasourceNode) {
                let dsNode = node as KsDatasourceNode;                     
                let datasource = new KsDatasource(dsNode.datasourceName, dsNode.datasourceType);
                
                for (let j = 0; j < dsNode.children.length; j++) {
                    let fieldInfo = dsNode.children[j];                    
                    if (fieldInfo instanceof KsStateFieldSetNode) {                        
                        let fieldSet = fieldInfo as KsStateFieldSetNode;
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
        for (let i = 0; i < ast.root.children.length; i++){
            let node = ast.root.children[i];                        
            if (node instanceof KsFormNode) {
                let formNode = node as KsFormNode;
                let form     = new KsForm(formNode.formName);
                for(let j = 0; j < formNode.children.length; j++) {
                    let fieldNode = formNode.children[j] as KsFieldNode;
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
        for (let i = 0; i < ast.root.children.length; i++){
            let node = ast.root.children[i];                        
            if (node instanceof KsTypeNode) {
                let typeNode = node as KsTypeNode;
                let type     = new KsType(typeNode.typeName);
                for(let j = 0; j < typeNode.children.length; j++) {
                    let fieldNode = typeNode.children[j] as KsFieldNode;
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
        for (let i = 0; i < ast.root.children.length; i++){
            let node = ast.root.children[i];                    
            if (node instanceof KsCaseNode) {
                let caseNode = node as KsCaseNode;                    
                let _case = new KsCase(caseNode.caseName);                
                for (let j = 0; j < caseNode.children.length; j++) {
                    let caseBodyInfo = caseNode.children[j];
                    if (caseBodyInfo instanceof KsCaseBodyNode) {
                        let caseBodyNode = caseBodyInfo as KsCaseBodyNode;
                        let caseBody     = new KsCaseBody(caseBodyNode.bodyName);
                        for (let k = 0; k < caseBodyNode.children.length; k++) {
                            // TODO(Kalle): implement operations
                            if (caseBodyNode.children[k] instanceof KsEventNode) {
                                let eventNode = caseBodyNode.children[k] as KsEventNode;
                                caseBody.operations.push(new KsEventOperation(caseNode.caseName, eventNode.reference, eventNode.eventName));
                            }

                            if (caseBodyNode.children[k] instanceof KsCreateNode) {                                                                                            
                                let args = [];
                                let createNode = caseBodyNode.children[k] as KsCreateNode;
                                for (let n = 0; n < createNode.args.length; n++) {
                                    args.push(new KsArgument(createNode.args[n].value, 
                                                             createNode.args[n].type === "name"));
                                }                                                                
                                caseBody.operations.push(new KsCreateOperation(caseNode.caseName, createNode.typeName, createNode.alias, args));
                            }

                            if (caseBodyNode.children[k] instanceof KsStoreNode) {                                
                                let storeNode = caseBodyNode.children[k] as KsStoreNode;
                                caseBody.operations.push(new KsStoreOperation(caseNode.caseName, storeNode.reference, storeNode.datasource));
                            }
                            
                            if (caseBodyNode.children[k] instanceof KsPrintNode) {                                
                                let printNode = caseBodyNode.children[k] as KsPrintNode;
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
        for (let i = 0; i < ast.root.children.length; i++){
            let node     = ast.root.children[i];                   
            if (node instanceof KsStateNode) {
                let stateNode = node as KsStateNode;                     
                let state = new KsState(stateNode.stateName, stateNode.stateType);
                
                for (let j = 0; j < stateNode.children.length; j++) {
                    let fieldInfo = stateNode.children[j];
                    if (fieldInfo instanceof KsFieldNode) {
                        // field definition
                        let fieldDefinition = fieldInfo as KsFieldNode;
                        state.fields.push(new KsField(fieldDefinition.fieldName, fieldDefinition.fieldType, fieldDefinition.defaultValue));
                    }
                    if (fieldInfo instanceof KsStateFieldSetNode) {                        
                        let fieldSet = fieldInfo as KsStateFieldSetNode;
                        state.overrides.push(new KsFieldReference(fieldSet.fieldName, fieldSet.fieldValue));
                    }
                }                
                states.push(state);
            }
        }
        return states;
    }
}