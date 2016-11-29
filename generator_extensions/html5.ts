/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './../generator/ksprojecttemplate';
import { IKsProjectCodeGenerator, KsProjectCodeGeneratorBase } from './../generator/ksprojectgenerator';
import { KsProjectTemplateProvider } from './../generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './../generator/ksprojectgeneratorsettings';
import { KsForm, KsType,KsFieldReference, KsDatasource,KsState, KsField, KsCase, KsArgument, KsCaseBody, KsPrintOperation, KsCreateOperation, KsStoreOperation, KsCaseBodyOperation } from './../ks/definitions';

class NavigationLink { 
    title : string;
    href  : string;
    constructor (title : string, href : string) {
        this.title = title;
        this.href  = href;
    }
}

class FormElement {
    tag         : string = "";
    type        : string = "";
    placeholder : string = "";
    innerHtml   : string = "";    
}

class EventHandler {
    reference : string;
    caseName  : string;
    eventName : string;    
    eventHandler : string;
    constructor (reference : string, caseName : string, eventName : string, eventHandler : string) {
        this.reference    = reference;
        this.caseName     = caseName;
        this.eventName    = eventName;
        this.eventHandler = eventHandler;        
    }
}

class ProjectGeneratorContext {
    settings : KsProjectGeneratorSettings;
    script   : Kottbullescript;
    private eventHandlers : EventHandler[] = []; 
    addEventHandler(reference : string, caseName : string, eventName : string, eventHandler : string) {
        this.eventHandlers.push(new EventHandler(reference, caseName, eventName, eventHandler));
    }
    getEventHandlers() : EventHandler[] {
        return this.eventHandlers;
    }
}

export class Html5CodeGenerator extends KsProjectCodeGeneratorBase {
    
    constructor() {
        super("html5");
    }

    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {
        // this.copyToProjectFolder()
        console.log("Generating html5 project code... ");
        let ctx = new ProjectGeneratorContext();
        ctx.settings = settings;
        ctx.script   = ks;
        let app = ks.getApp();
        if (!app) {
            throw new SyntaxError("PANIC!! No app defined, forgot something maybe?");
        }

        // determine our starting point case
        let startupCase = this.findStartupCase(ks);
        if (!startupCase) {
            throw new SyntaxError("PANIC!! Unable to find a suitable startup case. You MUST have at least one case defined! "
                                + "Maybe in the future you won't but we have not implemented that shizzle yet. " 
                                + "Just define a case with nothing in it. It should be alright.");                
        }
        
        let formsToExclude = this.generateFrontPage(ctx, startupCase);

        this.generateForms(ctx, formsToExclude, startupCase, template);                        

        this.copyToProjectFolder('src/css/site.css', './src/css/site.css', settings);

        this.writeProjectFile('src/js/site.js', this.generateSiteScript(ctx), ctx.settings);

        console.log("... And we're done!");
    }

    private generateSiteScript(ctx : ProjectGeneratorContext) : string {
        let sitejs        = "";        
        let types         = ctx.script.getTypes();
        let states        = ctx.script.getStates();
        // let transforms    = ctx.script.getTransforms();
        let datasources   = ctx.script.getDatasources();
        let eventHandlers = ctx.getEventHandlers();
        for (var ds of datasources) {
            sitejs += this.getDatasourceScript(ds) + "\n";
        }
        for (var type of types) {
            sitejs += this.getTypeClassScript(type) + "\n";
        }
        for (var state of states) {
            sitejs += this.getStateClassScript(state) + "\n";
        }
        for (var handler of eventHandlers) {
            let c      = ctx.script.getCase(handler.caseName);
            let doBody = c.getDo();

            let scriptFunction = this.getTemplateContent('/templates/event_template.js');
            sitejs += scriptFunction.split("$eventHandlerName$").join(handler.eventHandler)
                                    .split("$eventHandlerBody$").join(this.generateEventScriptBodyFromDo(doBody, ctx));
        }
        return sitejs;
    }

    private getDatasourceScript(datasource:KsDatasource) : string {
        let type = datasource.getValue("type");
        let name = datasource.datasourceName;
        let t    = datasource.datasourceType;
        // TODO(Kalle): implement 
        // switch(type) {
        //     // internally predefined ones 
        //     case "memory": 
        //     break;
        //     case "fs":
        //     case "filesystem": 
        //         {
        //             let collectionFolder = datasource.getValue("source");                    
        //         }
        //     break;
        //     default: 
        //     break;
        // }
        let v   = this.getWindowRef(this.getVariableName(name, "instance"));
        let src = this.getTemplateContent('/templates/datasource_' + type + '_template.js');
        for (var value of datasource.values) {            
            src = src.split(`$` + value.fieldName + `$`).join(value.fieldValue);
        }

        return src.split("$datasourceName$").join(name)
                  .split("$instanceReference$").join(v);                          
    }

    private getTypeClassScript(type:KsType) : string {
        let argString = type.fields.map((f:KsField) => f.fieldName).join(", ");
        let fields    = type.fields.map((f:KsField) => "this." + f.fieldName + " = " + f.fieldName + ";").join("\n        ");
                
        return this.templateProcessor.process('/templates/type_template.js', 
        { "type": type, "$className$": type.typeName, "$parameters$": argString, "$fields$": fields });
    }

    private getStateClassScript(type:KsState) : string {
        let argString = type.fields.map((f:KsField) => f.fieldName).join(", ");
        let construct = type.fields.map((f:KsField) => "this." + f.fieldName + " = " + f.fieldName + ";").join("\n        ");
        let overrides = type.overrides.map((f:KsFieldReference) => "this." + f.fieldName + " = '" + f.fieldValue + "';").join("\n        ");        
        
        return this.templateProcessor.process('/templates/state_template.js', 
        { "state": type, "$className$": type.stateName, "$baseType$": type.stateType, "$parameters$": argString, "$fields$": construct, "$overrides$":overrides });        
    }

    private generateEventScriptBodyFromDo(doBody:KsCaseBody, ctx:ProjectGeneratorContext) : string {        
        return doBody.operations.map( (op : KsCaseBodyOperation) => this.getOperationScript(op,ctx)).join("\n    ");
    }

    private getOperationScript(op : KsCaseBodyOperation, ctx:ProjectGeneratorContext) : string {
        if (op instanceof KsPrintOperation) {
            let print = op as KsPrintOperation;
            if (print.byRef) {
                let printValue = print.toPrint;    
                if (print.toPrint.includes('.')) {
                    let refData = print.toPrint.split('.');
                    let objRef  = refData[0];
                    let field   = refData[1];
                    if (ctx.script.isForm(objRef)) {
                        printValue = this.getWindowRef(this.getVariableName(op.caseName, objRef)) + "." + field + ".value";
                    } else {
                        printValue = this.getWindowRef(this.getVariableName(op.caseName, objRef)) + "." + field;
                    }                    
                }            
                return `document.body.appendChild(document.createTextNode(` + printValue + `));`;
            }
            else {
                return `document.body.appendChild(document.createTextNode("` + print.toPrint + `"));`;                
            }
        }
        else if (op instanceof KsCreateOperation) {
            let create = op as KsCreateOperation;            
            return this.getWindowVariableReference(create) + ` = new ` + create.typeName + `(` 
            + this.getCreateArgumentsString(create, ctx) + `);`;
        }
        else if (op instanceof KsStoreOperation) {
            let store = op as KsStoreOperation;
            if (store.datasource && store.datasource.length > 0) {
                return store.datasource + ".getInstance().store(" + this.getWindowRef(this.getVariableName(op.caseName, store.reference)) + ");";
            } 
            else {
                return "// store " + store.reference + " in " + store.datasource;
            }
        }     
        return "// " + op.action  + " " + op.getArguments().join(", ");
    }

    private getWindowVariableReference(create:KsCreateOperation) {
        return this.getWindowRef(this.getCreateVariableName(create));
    }
    private getWindowRef(ref:string) : string {
        return `window["`+ref+`"]`;
    }
    private getCreateArgumentsString(create:KsCreateOperation, ctx:ProjectGeneratorContext) {
        return create.args.map((arg:KsArgument) => arg.isRef ? `"` + arg.value + `"` : 
                this.getReferenceAccessScript(arg.value, create.caseName, ctx)
            ).join(", ");
    }

    private getCreateVariableName(create:KsCreateOperation){
        return this.getVariableName(create.caseName, create.alias);
    }

    private getVariableName(caseName : string, varName : string) {
        return caseName + `_` + varName;
    }

    private getReferenceAccessScript(varName:string, thisCaseName:string, ctx: ProjectGeneratorContext) : string {
        // try and locate the variable and then return the generated one. Most likely going to be window access
        // unless form, then we want to access the document element
        if (varName.includes(".")) {
            // reference access
            let data  = varName.split('.');
            let owner = data[0];
            let field = data[1];
            
            // shift once to the right
            if (owner === "form" && data.length > 2) {
                owner = data[1];
                field = data[2];
            }

            if (ctx.script.isForm(owner)) {
                return varName + ".value"; // testing purposes, can work :P
            }            
        } else {
            // variable created from current case
            return this.getWindowRef(this.getVariableName(thisCaseName, varName));
        }
        return varName;
    }

    private generateForms(ctx : ProjectGeneratorContext,
                          exclude : string[],                                                    
                          startup : KsCase,
                          template: KsProjectTemplate) { 
        
        let ks  = ctx.script;
        let app = ks.getApp();
        // NOTE(Kalle): check if we should generate a single page or multiple pages. (1 form per page or all in one) 
        let isSinglePage = app.meta.getValue("platform").includes("/single"); 
        if (isSinglePage) {
            throw new Error("Singlepage html5 is not yet supported!");
        } else {

        // NOTE(Kalle): Keep it simple, we will go through all defined forms (if any), and determine which atoms we need
        //              and dynamically generate molecules and organisms
            
            let forms = ks.getForms();
            let title = app.meta.getValue("title");

        // NOTE(Kalle): loop forms twice
        //              first time to build the navigation links
        //              second time to generate the actual html files 


            let links             = this.getNavigationLinks(forms, exclude);
            let navigationContent = this.generateNavigationContent(links);  
            for(var form of forms) {
                if (exclude.indexOf(form.formName) >= 0) continue;
                let filename  = form.formName + ".html";
                let content   = this.generatePageContent(title, navigationContent + this.generateFormContent(ctx, form, ks.getCases()))
                this.writeProjectFile('./src/' + filename, content, ctx.settings);
            }
                         
        }
    }

    private getNavigationLinks(forms:KsForm[], exclude:string[] = []) : NavigationLink[] {
        let links : NavigationLink[] = [new NavigationLink("Home", "index.html")];         
        for(var form of forms) {
            if (exclude.indexOf(form.formName) >= 0) continue;
            let filename  = form.formName + ".html";
            links.push(new NavigationLink(form.formName,  filename));
        }
        return links;
    }
 
    private generateFrontPage(ctx : ProjectGeneratorContext, startupCase : KsCase): string[] {                
        let formsToExclude : string[] = [];
        let ks    = ctx.script;
        let app   = ks.getApp();                
        let forms = ks.getForms();
        let doContent   = "";
        let whenContent = "";
        let whenBody  = startupCase.getWhen();
        let doBody    = startupCase.getDo();
        if (whenBody) {
            // NOTE(Kalle): determine which form(s) used and render those forms
            let formReferences = whenBody.getReferencesByType("form");            
            for(var form of forms) {
                for(var formRef of formReferences) { 
                     if (form.formName === formRef) {
                         whenContent += this.generateFormContent(ctx, form, ks.getCases());
                         formsToExclude.push(formRef);
                     }
                }
            }
                        
        }
                
        let navigationLinks   = this.getNavigationLinks(forms, formsToExclude);
        let navigationContent = this.generateNavigationContent(navigationLinks);  

        // NOTE(Kalle): templateFileProcessor is needed here
        //              but to keep it simple-dimple, we will just do simple replace        
        let pageContent = this.generatePageContent(app.meta.getValue("title"), navigationContent + whenContent);
        
        this.writeProjectFile('./src/index.html', pageContent, ctx.settings);
        return formsToExclude;
    }    

    private generatePageContent(title : string, body : string) : string {
        let content = this.getTemplateContent('/templates/page_template.html');        
        return content.split("{{app.meta.title}}").join(title)
                      .split("{{content}}").join(body);        
    }

    private generateFormContent(ctx : ProjectGeneratorContext, form : KsForm, cases: KsCase[]): string {
        let fields = ``;
        for(var field of form.fields) { 
            let elmEvents = field.getEventsFromCases(form.formName, cases);
            let elmType   = this.getElementByFieldType(field.fieldType);
            let elm = `            <` + elmType.tag;
            if(field.defaultValue && field.defaultValue.length > 0) {
                elm += ` value="` + field.defaultValue + `"`;
            }
            if (elmType.placeholder && elmType.placeholder.length > 0) {
                elm += ` placeholder="` + elmType.placeholder + `"`;
            }
            if (elmType.type && elmType.type.length > 0) {
                elm += ` type="` + elmType.type + `"`;
            }            
            elm += ` name="` + field.fieldName + `" id="` + field.fieldName + `"`;

            if (elmEvents && elmEvents.length > 0) {
                for(var ev of elmEvents) {
                    // console.log(field.fieldName + " on" + ev.eventName);
                    let eventHandlerName = ev.caseName + `_on_` + field.fieldName + `_` + ev.eventName;
                    ctx.addEventHandler(ev.reference, ev.caseName, ev.eventName, eventHandlerName);
                    elm += ` on` + ev.eventName + `="` + eventHandlerName + `(this);"`;
                }
            }

            elm += `>`+elmType.innerHtml+`</` + elmType.tag + `>`; // NOTE(Kalle): most would be satisfied with /> as ending. but to be safe
            fields += elm + `<br/>\n`;
        }

        let formEvents = form.getEventsFromCases(cases);
        let formEventsString = "";
        for(var fe of formEvents) {
            let prefix = "";
            if (fe.eventName === "submit") {
                prefix = "event.preventDefault(); ";
            }
            let eventHandlerName = fe.caseName + `_on_` + form.formName + `_` + fe.eventName;
            ctx.addEventHandler(fe.reference, fe.caseName, fe.eventName, eventHandlerName);
            formEventsString += ` on` + fe.eventName + `="` + prefix + eventHandlerName + `(this);"`;
        }
        // action="" method="get"
        return `
        <form name="`+ form.formName +`" id="`+ form.formName +`"` + formEventsString + `>
{{fields}}
        </form>`.replace("{{fields}}", fields);
    }

    private getElementByFieldType(fieldType : string) : FormElement {
        let elm = new FormElement();
        if (fieldType.startsWith("input")) {
            elm.tag = "input";            
            if (fieldType.endsWith("password")) {
                elm.placeholder = "Enter your password";
                elm.type = "password";
            }
            else if (fieldType.endsWith("email")) {
                elm.placeholder = "Enter your email";
                elm.type = "email";
            }        
            else if (fieldType.endsWith("number")) {
                elm.type = "number";
            }   
            else {                
                elm.type = "text";                
            }               
        }
        else if (fieldType.startsWith("button")) { 
            elm.tag = "button";
            elm.type = "submit";
        }
        else {
            elm.tag = "div";
            elm.innerHtml = "unsupported input for type: " + fieldType;
        }
        return elm;
    }


    private generateNavigationContent(navigationLinks: NavigationLink[]) : string {
        if (!navigationLinks || navigationLinks.length === 0) return "";        
        let navigation = "";
        
        for(var nav of navigationLinks) {
            navigation += `     <li><a href="` + nav.href + `">` + nav.title + `</a></li>\n`; 
        }        
        return `
    <nav>
        <ul>
    {{links}}
        </ul>
    </nav>\n`.replace("{{links}}",navigation);        
    }
}