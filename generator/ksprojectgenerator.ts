/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { Kottbullescript } from './../ks/kottbullescript';
import { KsProjectTemplate } from './ksprojecttemplate';
import { KsProjectTemplateProvider } from './ksprojecttemplateprovider';
import { KsProjectGeneratorSettings } from './ksprojectgeneratorsettings';
import { KsProjectTemplateProcessor } from './ksprojecttemplateprocessor';
import { KsCase, KsCaseBody, KsCaseBodyOperation, KsEventOperation } from './../ks/definitions';

class CodeGeneratorLanguagePair {
    language      : string;
    codeGenerator : IKsProjectCodeGenerator;
    constructor(language : string, codeGenerator : IKsProjectCodeGenerator) {
        this.language      = language;
        this.codeGenerator = codeGenerator;
    }
}

export class KsFormElement {
    tag         : string = "";
    type        : string = "";
    placeholder : string = "";
    content   : string = "";    
}

export class KsEventHandler {
    reference : string;
    caseName  : string;
    eventName : string;    
    eventHandler     : string;
    eventHandlerCode : string[] = [];
    constructor (reference : string, caseName : string, eventName : string, eventHandler : string) {
        this.reference    = reference;
        this.caseName     = caseName;
        this.eventName    = eventName;
        this.eventHandler = eventHandler;        
    }
}

export class KsProjectGeneratorContext {
    settings : KsProjectGeneratorSettings;
    template : KsProjectTemplate;
    script   : Kottbullescript;
    private eventHandlers : KsEventHandler[] = []; 
    constructor(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings) {
        this.script   = ks;
        this.template = template;
        this.settings = settings;
    }
    
    addEventHandler(reference : string, caseName : string, eventName : string, eventHandler : string) {
        this.eventHandlers.push(new KsEventHandler(reference, caseName, eventName, eventHandler));
    }

    addEventHandlerRef(handler : KsEventHandler) {
        this.eventHandlers.push(handler);
    }

    getEventHandlers() : KsEventHandler[] {
        return this.eventHandlers;
    }
    getEventHandler(eventHandlerName : string) : KsEventHandler {
        return this.eventHandlers.find((ev:KsEventHandler) => ev.eventHandler === eventHandlerName);
    }
}

/**
 * A contract for generating project code
 * 
 * @export
 * @interface IKsProjectCodeGenerator
 */
export interface IKsProjectCodeGenerator {
    generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings): void;
    writeProjectFile(targetFile : string, content : string, settings: KsProjectGeneratorSettings);
    getTemplateContent(templateFile : string) : string;
    copyToProjectFolder(templateFile : string, destinationProjectFile: string, settings: KsProjectGeneratorSettings);
    getLanguage() : string;
}


/**
 * A base class for implementing the IKsProjectCodeGenerator contract
 * 
 * @export
 * @abstract
 * @class KsProjectCodeGeneratorBase
 * @implements {IKsProjectCodeGenerator}
 */
export abstract class KsProjectCodeGeneratorBase implements IKsProjectCodeGenerator {
    protected language          : string;
    protected templateProcessor : KsProjectTemplateProcessor; 
    constructor (language : string){
        this.language          = language;
        this.templateProcessor = new KsProjectTemplateProcessor(this); 
    }

    abstract generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings): void;
    
    getLanguage() : string {
        return this.language;
    }

    writeProjectFile(targetFile : string, content : string, settings: KsProjectGeneratorSettings) {
        fs.writeFileSync(settings.outDir + '/' + settings.projectName + '/' + targetFile, content, "utf8" );
    }

    getTemplateContent(templateFile : string) : string {
        let sourceFile = './project_templates/' + this.language + '/' + templateFile;
        if (!fs.existsSync(sourceFile)) {
            console.warn("The expected template file '" + sourceFile + "' could not be found.");
            return;
        }
        return fs.readFileSync(sourceFile, 'utf8');
    }

    copyToProjectFolder(templateFile : string, destinationProjectFile: string, settings: KsProjectGeneratorSettings) {                
        let targetFile = settings.outDir + "/" + settings.projectName + "/" + destinationProjectFile;
        let sourceFile = './project_templates/' + this.language + '/' + templateFile;
        if (!fs.existsSync(sourceFile)) {
            console.warn("The expected template file '" + sourceFile + "' could not be found.");
            return;
        }
        fs.createReadStream(sourceFile).pipe(fs.createWriteStream(targetFile));        
    }

    protected templateFileExists(templateFile : string, settings: KsProjectGeneratorSettings) : boolean {
        let sourceFile = './project_templates/' + this.language + '/' + templateFile;
        return fs.existsSync(sourceFile);
    }
    
    protected findStartupCase(ks:Kottbullescript) : KsCase {        
        let app      = ks.getApp();
        let allCases = ks.getCases();         
        for(let caseName of app.cases) {
            let c = allCases.find((k : KsCase) => k.caseName == caseName);
            if (c) {
                let when = c.caseBodies.find((k : KsCaseBody) => k.bodyName === "when");
                if (when) {
                    for(var op of when.operations) {
                        if (this.willExecuteAutomatically(ks, op)) {
                            return c;
                        } 
                    }
                }
            }
        }

        if (allCases.length > 0) {
            return allCases[0];
        }

        return null;
    }

    private willExecuteAutomatically(ks:Kottbullescript, op: KsCaseBodyOperation) : boolean {
        if(op.action === "event") {
            let event = op as KsEventOperation;
            if (event.eventName === "load") {                
                return event.reference.startsWith("app.") || event.reference.includes(ks.getApp().appName); 
            }
        }
        return false;
    }
}

/**
 * A provider for Project Code Generators
 * 
 * @export
 * @class KsProjectCodeGeneratorProvider
 */
export class KsProjectCodeGeneratorProvider {
    
    codeGenerators: CodeGeneratorLanguagePair[] = [];

    register(generator: IKsProjectCodeGenerator) {
        this.codeGenerators.push(new CodeGeneratorLanguagePair(generator.getLanguage(), generator));
    }

    get(language: string) : IKsProjectCodeGenerator {
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
        this.codeGeneratorProvider.get(language).generate(ks, template, settings);
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