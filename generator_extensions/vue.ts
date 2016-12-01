/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './../generator/ksprojecttemplate';
import { KsProjectTemplateProvider } from './../generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './../generator/ksprojectgeneratorsettings';
import { KsProjectGeneratorContext, KsFormElement, KsEventHandler, IKsProjectCodeGenerator, KsProjectCodeGeneratorBase } from './../generator/ksprojectgenerator';
import { KsForm, KsType, KsEventOperation, KsFieldReference, KsDatasource,KsState, KsField, KsCase, KsArgument, KsCaseBody, KsPrintOperation, KsCreateOperation, KsStoreOperation, KsCaseBodyOperation } from './../ks/definitions';



class KsComponent {
    name           : string;
    tag            : string;
    location       : string;    
    events         : KsEventHandler[] = [];
    ctx            : KsProjectGeneratorContext;
    form           : KsForm;
    childComponents: KsComponent[] = [];
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
        this.generateIndex(ctx, startupCase);        
        this.generateApp(ctx, startupCase);   
        
        this.generatePackageJsonAndReadme(ctx);

        this.copyToProjectFolder('templates/webpack.config.js', './webpack.config.js', settings);     
        this.copyToProjectFolder('static/css/site.css', './static/css/site.css', settings);

        //this.writeProjectFile('src/js/site.js', this.generateSiteScript(ctx), ctx.settings);

        console.log("... And we're done!");
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
            let model = { "components": component.childComponents, "component": component, "name" : component.name };
            let componentView   = this.templateProcessor.process('/templates/component_template.html', model);
            let componentScript = this.templateProcessor.process('/templates/component_template.js', model);
            let componentStyle  = this.templateProcessor.process('/templates/component_template.css', model);
            let componentVue    = this.templateProcessor.process('/templates/component_template.vue', {"$templateView$" : componentView, "$templateScript$" : componentScript, "$templateStyle$" : componentStyle});
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

    private generateIndex(ctx : KsProjectGeneratorContext, startupCase : KsCase) {
        let ks    = ctx.script;
        let app   = ks.getApp();                
        let model = { "$appTitle$" : app.meta.getValue("title"), "app" : app };
        let indexContent = this.templateProcessor.process('/templates/page_template.html', model);
        this.writeProjectFile('index.html', indexContent, ctx.settings);
    }
    
    getOrganismComponent(ctx : KsProjectGeneratorContext, form : KsForm, cases: KsCase[]): KsComponent {
        let events      = this.generateEventHandlers(form.getEventsFromCases(ctx.script.getCases()));
        let name        = form.formName;        
        let tag         = name.toLowerCase().split('_').join("-");
        let fieldType   = name.split('_').map((v:string) => v[0].toUpperCase() + v.substring(1)).join("");         
        let component   = new KsComponent();
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
                (e.caseName + `_on_` + name + `_` + e.eventName).split('.').join('_')
            ))
        }
        return out;
    }
}