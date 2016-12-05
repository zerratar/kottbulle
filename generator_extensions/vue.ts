/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './../generator/ksprojecttemplate';
import { KsProjectTemplateProvider } from './../generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './../generator/ksprojectgeneratorsettings';
import { KsProjectGeneratorContext, KsFormElement, KsEventHandler, IKsProjectCodeGenerator, KsProjectCodeGeneratorBase } from './../generator/ksprojectgenerator';
import { KsForm, KsType, KsEventOperation, KsFieldReference, KsDatasource,KsState, KsField, KsCase, KsArgument, KsCaseBody, KsLoadOperation, KsPrintOperation, KsCreateOperation, KsStoreOperation, KsCaseBodyOperation,KsListOperation } from './../ks/definitions';

class KsComponent {
    ctx            : KsProjectGeneratorContext;
    events         : KsEventHandler[] = [];
    childComponents: KsComponent[] = [];
    isForm         : boolean = false;
    location       : string;
    form           : KsForm;
    name           : string;
    tag            : string;
    references     : string[] = [];

    addReference(ds:string) {
        if(!this.references.find((s:string) => s === ds)) {
            this.references.push(ds);
        }
    }
}

export class VueCodeGenerator extends KsProjectCodeGeneratorBase {
    constructor() {
        super("vue");
    }

    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {
        console.log("Generating vue project code... ");
        let ctx = new KsProjectGeneratorContext(ks, template, settings);
        let app = ks.getApp();
        if (!app) {
            throw new SyntaxError("PANIC!! No app defined, forgot something maybe?");
        }

        let startupCase = this.findStartupCase(ks);
        if (!startupCase) {
            throw new SyntaxError("PANIC!! Unable to find a suitable startup case. You MUST have at least one case defined! "
                                + "Maybe in the future you won't but we have not implemented that shizzle yet. "
                                + "Just define a case with nothing in it. It should be alright.");
        }

        this.generateMainJs(ctx);
        this.generateStoreJs(ctx);
        this.generateModulesJs(ctx);
        this.generateRouterJs(ctx);
        this.generateIndex(ctx, startupCase);
        this.generateModels(ctx);
        this.generateApp(ctx, startupCase);
        this.generateComponentsIndex(ctx);
        this.generatePackageJsonAndReadme(ctx);

        this.copyFolderToProjectFolder('build/', './build', settings);
        this.copyFolderToProjectFolder('config/', './config', settings);


        this.copyToProjectFolder('static/css/site.css', './static/css/site.css', settings);

        //this.writeProjectFile('src/js/site.js', this.generateSiteScript(ctx), ctx.settings);

        console.log("... And we're done!");
    }

    getOrganismComponent(ctx : KsProjectGeneratorContext, form : KsForm, cases: KsCase[]): KsComponent {
        let events      = this.generateEventHandlers(form.getEventsFromCases(ctx.script.getCases()));
        events.forEach((ke:KsEventHandler)=> ctx.addEventHandlerRef(ke));
        let name        = form.formName;
        let tag         = name.toLowerCase().split('_').join("-");
        let fieldType   = name.split('_').map((v:string) => v[0].toUpperCase() + v.substring(1)).join("");
        let component   = new KsComponent();
        component.isForm   = true;
        component.events   = events;
        component.form     = form;
        component.ctx      = ctx;
        component.name     = fieldType;
        component.tag      = tag;
        component.location = 'components/organisms/' + component.name  + '.vue';
        for(var field of form.fields) {
            component.childComponents.push(this.getMoleculeComponent(ctx, form, field));
        }
        return component;
    }

    getMoleculeComponent(ctx : KsProjectGeneratorContext, form : KsForm, field : KsField) : KsComponent {
        let fieldEvents = this.generateEventHandlers(field.getEventsFromCases(form.formName, ctx.script.getCases()));
        fieldEvents.forEach((ke:KsEventHandler)=> ctx.addEventHandlerRef(ke));
        let name      = field.fieldName;
        let tag       = name.toLowerCase().split('_').join("-");
        let fieldType = name.split('_').map((v:string) => v[0].toUpperCase() + v.substring(1)).join("");
        let component = new KsComponent();
        component.events   = fieldEvents;
        component.form     = form;
        component.ctx      = ctx;
        component.name     = fieldType;
        component.tag      = tag;
        component.location = 'components/molecules/' + component.name  + '.vue';
        component.childComponents = this.getAtomComponents(ctx, form, field);
        return component;
    }

    getAtomComponents(ctx : KsProjectGeneratorContext, form : KsForm, field : KsField) : KsComponent[] {
        if (field.fieldType.includes("button")) {
            return [this.getAtomComponent(ctx, form, "ks" + field.fieldType)];
        }
        let fieldType = field.fieldType;
        return [
            this.getAtomComponent(ctx, form, "kslabel"),
            this.getAtomComponent(ctx, form, fieldType)
        ];
    }

    getAtomComponent(ctx : KsProjectGeneratorContext, form : KsForm, name : string) : KsComponent {
        let tag       = name.toLowerCase().split('_').join("-");
        let fieldType = name.split('_').map((v:string) => v[0].toUpperCase() + v.substring(1)).join("");
        let component = new KsComponent();
        component.form     = form;
        component.ctx      = ctx;
        component.name     = fieldType;
        component.tag      = tag;
        component.location = 'components/atoms/' + component.name  + '.vue';
        return component;
    }

    generateEventHandlers(events:KsEventOperation[]):KsEventHandler[]{
        let out:KsEventHandler[] = [];
        for(let e of events) {
            let n = e.reference.split('.');
            let name = n[n.length -1];
            out.push(new KsEventHandler(e.reference, e.caseName, e.eventName,
                ( `${e.eventName}`).split('.').join('_')

            ))
        }
        return out;
    }

    generateEventHandlerCode(eventHandlerName : string, ctx: KsProjectGeneratorContext, currentComponent: KsComponent){
        let src : string[] = [];
        let handler = ctx.getEventHandler(eventHandlerName);
        if (handler) {
            let c = ctx.script.getCase(handler.caseName);
            handler.eventHandlerCode = this.generateEventScriptBodyFromDo(c.getDo(), ctx, currentComponent);
        }
    }

    private generateEventScriptBodyFromDo(doBody:KsCaseBody, ctx:KsProjectGeneratorContext, currentComponent: KsComponent) : string[] {
        return doBody.operations.map( (op : KsCaseBodyOperation) => this.getOperationScript(op,ctx,currentComponent));
    }

    private getOperationScript(op : KsCaseBodyOperation, ctx:KsProjectGeneratorContext, currentComponent: KsComponent) : string {
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
            return `document.body.appendChild(document.createTextNode("` + print.toPrint + `"));`;
        }
        if (op instanceof KsCreateOperation) {
            let create = op as KsCreateOperation;
            currentComponent.addReference(create.typeName);
            return this.getWindowVariableReference(create) + ` = ` + create.typeName + `.create(`
                 + this.getCreateArgumentsString(create, ctx) + `);`;
        }
        if (op instanceof KsStoreOperation) {
            let store = op as KsStoreOperation;
            if (store.datasource && store.datasource.length > 0) {
                currentComponent.addReference(store.datasource);
                return store.datasource + ".getInstance().store(" + this.getWindowRef(this.getVariableName(op.caseName, store.reference)) + ");";
            }
            return "/* store " + store.reference + " in " + store.datasource + " */";
        }
        if (op instanceof KsLoadOperation) {
            let load = op as KsLoadOperation;
            if (load.datasource && load.datasource.length > 0) {
                // TODO(Kalle): implement
            }
            return "/* load " + load.alias + " from " + load.datasource + " */"
        }

        if (op instanceof KsListOperation) {
            let list = op as KsListOperation;
            if (list.reference && list.reference.length > 0) {
                // TODO(Kalle): implement
            }
            return "/* list " + list.reference + " */";
        }
        return "/* " + op.action  + " " + op.getArguments().join(", ") + " */";
    }

    private getWindowVariableReference(create:KsCreateOperation) {
        return this.getWindowRef(this.getCreateVariableName(create));
    }
    private getWindowRef(ref:string) : string {
        return `window['`+ref+`']`
    }
    private getCreateArgumentsString(create:KsCreateOperation, ctx: KsProjectGeneratorContext) {
        return create.args.map((arg:KsArgument) => arg.isRef ? `'` + arg.value + `'` :
                this.getReferenceAccessScript(arg.value, create.caseName, ctx)
            ).join(", ");
    }

    private getCreateVariableName(create:KsCreateOperation){
        return this.getVariableName(create.caseName, create.alias);
    }

    private getVariableName(caseName : string, varName : string) {
        return caseName + `_` + varName;
    }

    private getReferenceAccessScript(varName:string, thisCaseName:string, ctx: KsProjectGeneratorContext) : string {
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
                // ugly hack
                return " document.querySelector('." + owner + " ." + field + " input').value";
                // return varName + ".value"; // <-- will work without form groups
            }
        } else {
            // variable created from current case
            return this.getWindowRef(this.getVariableName(thisCaseName, varName));
        }
        return varName;
    }

    private generateModels(ctx : KsProjectGeneratorContext) {
        let datasources = ctx.script.getDatasources();
        let types       = ctx.script.getTypes();
        let states      = ctx.script.getStates();
        let out         = [];

        for (var ds of datasources) out.push(this.getDatasourceScript(ds));
        for (var t of types) out.push(this.templateProcessor.process('templates/type_template.js', { "type": t, getDefaultValue: this.getDefaultValueForType }));
        for (var s of states) out.push(this.templateProcessor.process('templates/state_template.js', { "state": s, getDefaultValue: this.getDefaultValueForType }));
        this.writeProjectFile('src/models.js', out.join(""), ctx.settings);
    }

    private getDatasourceScript(datasource:KsDatasource) : string {
        let type = datasource.getValue("type");
        let name = datasource.datasourceName;
        let t    = datasource.datasourceType;
        let v   = this.getWindowRef(this.getVariableName(name, "instance"));
        return this.templateProcessor.process('/templates/datasource_' + type + '_template.js', { "datasource":datasource, "$datasourceName$": name, "$instanceReference$": v });
    }

    private getDefaultValueForType(type:string):string {
        if (type === "string") return `''`;
        if (type === "number") return `0`;
        return `undefined`;
    }

    private generatePackageJsonAndReadme(ctx : KsProjectGeneratorContext) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"),
                              "$appDescription$" : app.meta.getValue("description"),
                              "$appAuthor$" : app.meta.getValue("author"),
                              "$appVersion$" : app.meta.getValue("version"), "app" : app };
        let packages = this.templateProcessor.process('/templates/package.json', model);
        let readme   = this.templateProcessor.process('/templates/README.md', model);
        this.writeProjectFile('package.json', packages, ctx.settings);
        this.writeProjectFile('README.md', readme, ctx.settings);
    }

    private generateApp(ctx : KsProjectGeneratorContext, startupCase : KsCase) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let forms = ks.getForms();
        let whenBody  = startupCase.getWhen();
        let doBody    = startupCase.getDo();
        let components:KsComponent[]=[];
        if (whenBody) {
            // NOTE(Kalle): determine which form(s) used and render those forms
            let formReferences = whenBody.getReferencesByType("form");
            for(var form of forms) {
                for(var formRef of formReferences) {
                     if (form.formName === formRef) {
                         let component = this.getOrganismComponent(ctx, form, ks.getCases());
                         this.generateComponent(component);
                         components.push(component);
                     }
                }
            }
        }

        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app, "components":components };
        let appView   = this.templateProcessor.process('/templates/app_template.html', model);
        let appScript = this.templateProcessor.process('/templates/app_template.js', model);
        let appStyle  = this.templateProcessor.process('/templates/app_template.css', model);
        let appVue    = this.templateProcessor.process('/templates/app_template.vue', {"$templateView$" : appView, "$templateScript$" : appScript, "$templateStyle$" : appStyle});
        this.writeProjectFile('src/' + app.appName + '.vue', appVue, ctx.settings);
    }

    private generateComponent(component : KsComponent) {
        // check if we have a template file matching the target component location, then we want to use that one.
        // that way we can provide pre-defined components. :)
        if(this.templateFileExists('src/' + component.location,component.ctx.settings)) {
            this.copyToProjectFolder('src/' + component.location,
                                     'src/' + component.location, component.ctx.settings);
        } else {

            // "getEventHandlerCode": (eventHandler:string) => this.getEventHandlerCode(eventHandler, component.ctx, component)
            //component.events.forEach((eh:KsEventHandler) => this.generateEventHandlerCode(eh.eventHandler, component.ctx, component) );

            let model = { "components": component.childComponents, "component": component, "name" : component.name };
            let componentView   = this.templateProcessor.process('/templates/component_template.html', model);
            let componentScript = this.templateProcessor.process('/templates/component_template.js', model);
            let componentStyle  = this.templateProcessor.process('/templates/component_template.css', model);
            let componentVue    = this.templateProcessor.process('/templates/component_template.vue', {"$templateView$" : componentView, "$templateScript$" : componentScript, "$templateStyle$" : componentStyle, "component": component});
            this.writeProjectFile('src/' + component.location, componentVue, component.ctx.settings);
        }
        // recursively generate the component
        if (component.childComponents && component.childComponents.length > 0) {
            component.childComponents.forEach((c:KsComponent) => this.generateComponent(c));
        }
    }


    private generateMainJs(ctx : KsProjectGeneratorContext) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/main_template.js', model);
        this.writeProjectFile('src/main.js', indexContent, ctx.settings);
    }

    private generateStoreJs(ctx : KsProjectGeneratorContext) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/store_template.js', model);
        this.writeProjectFile('src/store.js', indexContent, ctx.settings);
    }

    private generateModulesJs(ctx : KsProjectGeneratorContext) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/modules_index_template.js', model);
        let modulesContent = this.templateProcessor.process('/templates/modules_template.js', model);

        this.writeProjectFile('src/modules/index.js', indexContent, ctx.settings);

        // TODO: This has to generate multiple store modules based on the number of
        // top-level cases there are.
        this.writeProjectFile('src/modules/MyApp.js', modulesContent, ctx.settings);
    }

    private generateRouterJs(ctx : KsProjectGeneratorContext) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/router_template.js', model);
        this.writeProjectFile('src/router.js', indexContent, ctx.settings);
    }

    private generateIndex(ctx : KsProjectGeneratorContext, startupCase : KsCase) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/page_template.html', model);
        this.writeProjectFile('index.html', indexContent, ctx.settings);
    }

    private generateComponentsIndex(ctx : KsProjectGeneratorContext) {
        let ks    = ctx.script;
        let app   = ks.getApp();
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/components_index_template.js', model);
        this.writeProjectFile('src/components/index.js', indexContent, ctx.settings);
    }

}