/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './../generator/ksprojecttemplate';
import { KsProjectTemplateProvider } from './../generator/ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './../generator/ksprojectgeneratorsettings';
import { KsProjectGeneratorContext, KsFormElement, KsEventHandler, IKsProjectCodeGenerator, KsProjectCodeGeneratorBase } from './../generator/ksprojectgenerator';

export class CsharpCodeGenerator extends KsProjectCodeGeneratorBase {
    constructor() {
        super("csharp");
    }
    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {             
        console.log("Generating c# project code... ");
        let ctx = new KsProjectGeneratorContext(ks, template, settings);
        let app = ks.getApp();
        if (!app) {
            throw new SyntaxError("PANIC!! No app defined, forgot something maybe?");
        }

        let platform = app.meta.getValue("platform");

        if (platform.includes("console")) {
            this.generateConsoleProject(ks, ctx, template, settings);
        } else {
            throw new Error("platform: " + platform + " is not yet supported");
        }

        console.log("... And we're done!");
    }

    private generateConsoleProject(ks: Kottbullescript, ctx: KsProjectGeneratorContext, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {
                
    }
}