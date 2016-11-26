/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './ksprojecttemplate';
import { KsProjectTemplateProvider } from './ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './ksprojectgeneratorsettings';

class CodeGeneratorLanguagePair {
    language      : string;
    codeGenerator : IKsProjectCodeGenerator;
    constructor(language : string, codeGenerator : IKsProjectCodeGenerator) {
        this.language      = language;
        this.codeGenerator = codeGenerator;
    }
}

export interface IKsProjectCodeGenerator {
    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings): void;
}

export class KsProjectCodeGeneratorProvider {
    
    codeGenerators: CodeGeneratorLanguagePair[] = [];

    registerCodeGenerator(language : string, generator: IKsProjectCodeGenerator) {
        this.codeGenerators.push(new CodeGeneratorLanguagePair(language, generator));
    }

    getCodeGenerator(language: string) : IKsProjectCodeGenerator {
        for(var generator of this.codeGenerators) {
            if(generator.language === language) {
                return generator.codeGenerator;
            }
        }
    } 
}

/**
 * a Kottbulle project generator that will produce code based on the provided configuration
 *  
 * @export
 * @class KsProjectGenerator
 */
export class KsProjectGenerator {    
    private templateProvider : KsProjectTemplateProvider;
    private codeGeneratorProvider    : KsProjectCodeGeneratorProvider;
    constructor(codeGeneratorProvider: KsProjectCodeGeneratorProvider, templateProvider : KsProjectTemplateProvider) {
        this.templateProvider      = templateProvider;
        this.codeGeneratorProvider = codeGeneratorProvider;
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
        this.prepareProjectConfigurations(template, settings); 
        this.codeGeneratorProvider.getCodeGenerator(language).generate(ks, template, settings);
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

    private prepareProjectConfigurations(template : KsProjectTemplate, settings : KsProjectGeneratorSettings) {        
        let configFiles = template.projectConfigFiles;        
        if (configFiles && configFiles.length > 0) {
            for(var file of configFiles) {
                let filePaths  = file.split('/');
                let fileName   = filePaths[filePaths.length-1];
                let targetFile = settings.outDir + "/" + settings.projectName + "/" + fileName;
                // NOTE(Kalle): this will not overwrite any files right now. So they have to be deleted on before hand if so                
                if(!fs.existsSync(targetFile)) {
                    fs.createReadStream(file).pipe(fs.createWriteStream(targetFile));
                }
            }                        
        }
    }
}