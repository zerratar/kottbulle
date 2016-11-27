/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './../generator/ksprojecttemplate';
import { IKsProjectCodeGenerator, KsProjectCodeGeneratorBase } from './../generator/ksprojectgenerator';
import { KsProjectTemplateProvider } from './../generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './../generator/ksprojectgeneratorsettings';
import { KsForm, KsField, KsCase, KsCaseBody, KsPrintOperation } from './../ks/definitions';

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

export class Html5CodeGenerator extends KsProjectCodeGeneratorBase {
    
    constructor() {
        super("html5");
    }

    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {
        // this.copyToProjectFolder()
        console.log("Generating html5 project code... ");
                    
        let navigationLinks  = this.generateForms(ks, template, settings);                
        let indexHtmlContent = this.generateFrontPage(ks, navigationLinks);

        this.writeProjectFile('./src/index.html', indexHtmlContent, settings);

        console.log("... And we're done!");
    }

    private generateForms(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) : NavigationLink[] { 
        
        let links : NavigationLink[] = []; 
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

            links.push(new NavigationLink("Home", "index.html"));
            for(var form of forms) {
                let filename  = form.formName + ".html";
                links.push(new NavigationLink(form.formName,  filename));
            }
            
            let navigationContent = this.generateNavigationContent(links);  
            for(var form of forms) {
                let filename  = form.formName + ".html";
                let content   = this.generatePageContent(title, navigationContent + this.generateFormContent(form))
                this.writeProjectFile('./src/' + filename, content, settings);
            }
                         
        }
        return links;
    }

    private generateFormContent(form : KsForm): string {
        let fields = ``;
        for(var field of form.fields) {            
            let elmType = this.getElementByFieldType(field.fieldType);
            let elm = `<` + elmType.tag;
            if(field.defaultValue && field.defaultValue.length > 0) {
                elm += ` value="` + field.defaultValue + `"`;
            }
            if (elmType.placeholder && elmType.placeholder.length > 0) {
                elm += ` placeholder="` + elmType.placeholder + `"`;
            }
            if (elmType.type && elmType.type.length > 0) {
                elm += ` type="` + elmType.type + `"`;
            }            
            elm += `>`+elmType.innerHtml+`</` + elmType.tag + `>`; // NOTE(Kalle): most would be satisfied with /> as ending. but to be safe
            fields += elm + `<br/>\n`;
        }

        return `<form action="" method="get">
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
            elm.tag = "input";
            elm.type = "submit";            
        }
        else {
            elm.tag = "div";
            elm.innerHtml = "unsupported input for type: " + fieldType;
        }
        return elm;
    }

    private generateFrontPage(ks: Kottbullescript, navigationLinks: NavigationLink[]) : string {
        let app = ks.getApp();
        if (!app) {
            throw new SyntaxError("PANIC!! No app defined, forgot something maybe?");
        }

        // this.readTemplateFile('')
        
        // determine our starting point case

        let startupCase = this.findStartupCase(ks);
        if (!startupCase) {
            throw new SyntaxError("PANIC!! Unable to determine startup case. You MUST have a startup case! "
                                + "Maybe in the future you won't but we have not implemented that shizzle yet. " 
                                + "Just add a 'event app." + app.appName + " loaded' in the 'when' clause for the case you want to start the app.");
        }

        let doBody = startupCase.getDo();
        if (!doBody) {
            throw new SyntaxError("PANIC!! A 'do' clause was expected but could not be found. " 
                                + "You sure you've added it? Leave it empty if you don't wanna do anything. We just need it.");
        }

        

        // NOTE(Kalle): obviously we would need to check our "when" body to determine which (if any) forms are being used.
        //              and then render those forms if possible

        let content           = this.generateContentByCaseDo(doBody);
        let navigationContent = this.generateNavigationContent(navigationLinks);  

        // NOTE(Kalle): templateFileProcessor is needed here
        //              but to keep it simple-dimple, we will just do simple replace        
        return this.generatePageContent(app.meta.getValue("title"), navigationContent + content);
    }    

    private generatePageContent(title : string, body : string) : string {
        return `<!doctype html>
<html lang="en">
    <head>
        <title>{{app.meta.title}}</title>
    </head>
    <body>    
        {{content}}
    </body>
</html>`.replace("{{app.meta.title}}", title)
        .replace("{{content}}", body);        
    }

    private generateNavigationContent(navigationLinks: NavigationLink[]) : string {
        if (!navigationLinks || navigationLinks.length === 0) return "";        
        let navigation = "";
        
        for(var nav of navigationLinks) {
            navigation += `     <li><a href="` + nav.href + `">` + nav.title + `</a></li>\n`; 
        }
        return `<nav>
        <ul>
    {{links}}
        </ul>
    </nav>`.replace("{{links}}",navigation);        
    }

    private generateContentByCaseDo(doBody: KsCaseBody) : string {
        let result = "";
        for(var op of doBody.operations) {
            // NOTE(Kalle): for this early test, we will only support the print operation
            if (op instanceof KsPrintOperation) {
                let print      = op as KsPrintOperation;
                let printValue = print.toPrint;
                if (print.byRef) {
                    // TODO(Kalle): do a lookup to determine what value to be printed.
                    //              remember, for a vue or angular project we would just print {{ref}} directly and let their templating handle it. 
                }
                result += printValue;
            }
        }
        return result;
    }
}