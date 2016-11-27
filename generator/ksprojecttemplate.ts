export class KsProjectTemplate {    
    dirs               : string[] = [];
    projectConfigFiles : string[] = [];
    templateDir        : string;
    constructor (templateDir : string) {
        this.templateDir = templateDir;
    } 
}