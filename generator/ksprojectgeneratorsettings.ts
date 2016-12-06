export class KsProjectGeneratorSettings {
    outDir      : string;
    projectName : string;
    constructor (outDir: string = "", projectName: string = "") {
        this.outDir      = outDir;
        this.projectName = projectName;
    }
}