/// <reference path="../typings/node/node.d.ts" />
import fs   = require("fs");
import path = require("path");
import { Kottbullescript } from "./../ks/kottbullescript";
import { KsProjectTemplate } from "./ksprojecttemplate";
import { KsProjectTemplateProvider } from "./ksprojecttemplateprovider";
import { KsProjectGeneratorSettings } from "./ksprojectgeneratorsettings";
import { KsProjectTemplateProcessor } from "./ksprojecttemplateprocessor";
import { KsApp, KsCase, KsCaseBody,KsSituation, KsCaseBodyOperation, KsEventOperation } from "./../ks/definitions";

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

    addEventHandler(reference : string, caseName : string, eventName : string, eventHandler : string): void {
        this.eventHandlers.push(new KsEventHandler(reference, caseName, eventName, eventHandler));
    }

    addEventHandlerRef(handler : KsEventHandler): void {
        this.eventHandlers.push(handler);
    }

    getEventHandlers(): KsEventHandler[] {
        return this.eventHandlers;
    }
    getEventHandler(eventHandlerName : string): KsEventHandler {
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
    writeProjectFile(targetFile : string, content : string, settings: KsProjectGeneratorSettings): void;
    copyToProjectFolder(templateFile : string, destinationProjectFile: string, settings: KsProjectGeneratorSettings): void;
    getTemplateContent(templateFile : string): string;
    getLanguage(): string;
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
    constructor (language : string) {
        this.language          = language;
        this.templateProcessor = new KsProjectTemplateProcessor(this);
    }

    abstract generate(ks: Kottbullescript, template: KsProjectTemplate, settings: KsProjectGeneratorSettings): void;

    getLanguage(): string {
        return this.language;
    }

    writeProjectFile(targetFile : string, content : string, settings: KsProjectGeneratorSettings): void {
        fs.writeFileSync(settings.outDir + "/" + settings.projectName + "/" + targetFile, content, "utf8" );
    }

    getTemplateContent(templateFile : string): string {
        let sourceFile: string = "./project_templates/" + this.language + "/" + templateFile;
        if (!fs.existsSync(sourceFile)) {
            console.warn("The expected template file '" + sourceFile + "' could not be found.");
            return;
        }
        return fs.readFileSync(sourceFile, "utf8");
    }

    copyToProjectFolder(templateFile : string, destinationProjectFile: string, settings: KsProjectGeneratorSettings): void {
        let targetFile: string = settings.outDir + "/" + settings.projectName + "/" + destinationProjectFile;
        let sourceFile: string = "./project_templates/" + this.language + "/" + templateFile;
        if (!fs.existsSync(sourceFile)) {
            console.warn("The expected template file '" + sourceFile + "' could not be found.");
            return;
        }
        fs.createReadStream(sourceFile).pipe(fs.createWriteStream(targetFile));
    }

    protected copyFolderToProjectFolder(folder : string, destinationFolder: string, settings: KsProjectGeneratorSettings): void {
        let sourceFolder: string   = "./project_templates/" + this.language + "/" + folder;
        let files       : string[] = this.getFilesSync(sourceFolder);
        if (files && files.length > 0) {
            for(var file of files) {
                let filePaths: string[] = file.split("/");
                let fileName : string   = filePaths[filePaths.length-1];
                if (fileName === ".keep") {
                    continue;
                }
                let targetFile: string = settings.outDir + "/" + settings.projectName + "/" + destinationFolder + "/" + fileName;
                fs.createReadStream(file).pipe(fs.createWriteStream(targetFile));
            }
        }
    }
    protected templateFileExists(templateFile : string, settings: KsProjectGeneratorSettings): boolean {
        let sourceFile : string = "./project_templates/" + this.language + "/" + templateFile;
        return fs.existsSync(sourceFile);
    }

    protected findStartupCases(ks:Kottbullescript): KsCase[] {
        let app      : KsApp    = ks.getApp();
        let allCases : KsCase[] = ks.getCases();
        let cases    : KsCase[] = [];
        for(let situationName of app.situations) {
            let situation: KsSituation = ks.getSituation(situationName);
            if (situation.isMain()) {
                for (let caseName of situation.cases) {
                    let c: KsCase = ks.getCase(caseName);
                    let include = false;
                    if (c) {
                      let when: KsCaseBody = c.getWhen();
                        if (when) {
                            for(var op of when.operations) {
                                if (this.willExecuteAutomatically(ks, op)) {
                                    include=true;
                                    break;
                                }
                            }
                        }
                        cases.push(c);
                    }
                }
            }
        }
        
        if (cases.length > 0) {
            return cases;
        }

        if (allCases.length > 0) {
            return [allCases[0]];
        }

        return null;
    }
    private getFilesSync(srcpath : string): string[] {
        return fs.readdirSync(srcpath).filter((file : string) =>
               fs.statSync(path.join(srcpath, file)).isFile()).map((f:string) => srcpath + "/" + f );
    }

    private willExecuteAutomatically(ks:Kottbullescript, op: KsCaseBodyOperation): boolean {
        if(op.action === "event") {
            let event: KsEventOperation = op as KsEventOperation;
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

    register(generator: IKsProjectCodeGenerator): void {
        this.codeGenerators.push(new CodeGeneratorLanguagePair(generator.getLanguage(), generator));
    }

    get(language: string): IKsProjectCodeGenerator {
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

    generate(ks: Kottbullescript, settings: KsProjectGeneratorSettings): void {
        let app: KsApp = ks.getApp();
        if (!app) {
            throw SyntaxError("PANIC!!! App could not be found. Why u no define??");
        }

        let language: string = app.meta.getValue("language");
        if (!language) {
            throw SyntaxError("PANIC!!! Output language not defined!! Did you forget to set the language?"
                            + "`set language \"language_name\"` example: `set language \"typescript\"`");
        }

        let template:KsProjectTemplate = this.templateProvider.getTemplate(language);
        this.prepareProjectFolder(template, settings);
        this.prepareProjectConfigurations(template, settings);
        this.codeGeneratorProvider.get(language).generate(ks, template, settings);
    }

    private prepareProjectFolder(template : KsProjectTemplate, settings : KsProjectGeneratorSettings): void {
        if (!fs.existsSync(settings.outDir)) {
            fs.mkdirSync(settings.outDir);
        }
        let rootDir: string = settings.outDir + "/" + settings.projectName + "/";
        if (!fs.existsSync(rootDir)) {
            fs.mkdirSync(rootDir);
        }
        for (var dir of template.dirs) {
            let toCreate: string = settings.outDir + "/" + settings.projectName + "/" + dir + "/";
            if (!fs.existsSync(toCreate)) {
                fs.mkdirSync(toCreate);
            }
        }
    }

    private prepareProjectConfigurations(template : KsProjectTemplate, settings : KsProjectGeneratorSettings): void {
        let configFiles:string[] = template.projectConfigFiles;
        if (configFiles && configFiles.length > 0) {
            for(var file of configFiles) {
                let filePaths : string[] = file.split("/");
                let fileName  : string   = filePaths[filePaths.length-1];
                let targetFile: string   = settings.outDir + "/" + settings.projectName + "/" + fileName;
                // . NOTE(Kalle): this will not overwrite any files right now. So they have to be deleted on before hand if so
                if(!fs.existsSync(targetFile)) {
                    fs.createReadStream(file).pipe(fs.createWriteStream(targetFile));
                }
            }
        }
    }
}