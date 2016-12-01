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
        console.log("... And we're done!");    
    }
}