/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './KsProjectTemplate';
import { KsProjectTemplateProvider } from './KsProjectTemplateProvider';
import { KsProjectGeneratorSettings } from './KsProjectGeneratorSettings';

/**
 * a Kottbulle project generator that will produce code based provided configurations
 *  
 * @export
 * @class KsProjectGenerator
 */
export class KsProjectGenerator {    
    private templateProvider : KsProjectTemplateProvider;
    constructor(templateProvider : KsProjectTemplateProvider) {
        this.templateProvider = templateProvider;
    }

    generate(ks: Kottbullescript, settings: KsProjectGeneratorSettings) {
        let app = ks.getApp();
        if (!app) {
            throw SyntaxError("PANIC!!! App could not be found. Why u no define??");
        }
        
        let language = app.meta.getValue("language");
        if (!language) {
            throw SyntaxError("PANIC!!! Output language not defined!! Did you forget to set the language? `set language \"language_name\"` example: `set language \"typescript\"`");
        }

        let template = this.templateProvider.getTemplate(language);        
        this.prepareProjectFolder(template, settings);        
    }

    private prepareProjectFolder(template : KsProjectTemplate, settings : KsProjectGeneratorSettings) {                
        if (!fs.existsSync(settings.outDir)) {
            fs.mkdirSync(settings.outDir);
        }
        let rootDir = settings.outDir + "/" + settings.projectName + "/";
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir);
        }
        for (var dir of template.dirs) {
            let toCreate = settings.outDir + "/" + settings.projectName + "/" + dir + "/";
            if (!fs.existsSync(toCreate)) {
                fs.mkdirSync(toCreate);
            }
        }        
    }
}