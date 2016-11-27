/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './../generator/ksprojecttemplate';
import { IKsProjectCodeGenerator, KsProjectCodeGeneratorBase } from './../generator/ksprojectgenerator';
import { KsProjectTemplateProvider } from './../generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './../generator/ksprojectgeneratorsettings';
import { KsCase, KsCaseBody, KsPrintOperation } from './../ks/definitions';

export class Html5CodeGenerator extends KsProjectCodeGeneratorBase {
    
    constructor() {
        super("html5");
    }

    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {
        // this.copyToProjectFolder()
        console.log("Generating html5 project code... ");
        let indexHtmlContent = this.generateFrontPage(ks);
        
        this.writeProjectFile('./src/index.html', indexHtmlContent, settings);

        console.log("... And we're done!");
    }

    private generateFrontPage(ks: Kottbullescript) : string {
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

        let content       = this.generateContentByCaseDo(doBody);
        let frontPageData = `
<!doctype html>
<html lang="en">
    <head>
        <title>{{app.meta.title}}</title>
    </head>
    <body>
        {{content}}
    </body>
</html>`;

        // NOTE(Kalle): templateFileProcessor is needed here
        //              but to keep it simple-dimple, we will just do simple replace

        frontPageData = frontPageData.replace("{{app.meta.title}}", app.meta.getValue("title"));
        frontPageData = frontPageData.replace("{{content}}", content);

        return frontPageData;
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