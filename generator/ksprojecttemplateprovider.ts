/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { KsProjectTemplate } from './ksprojecttemplate';

export class KsProjectTemplateProvider {

    getTemplate(language: string) : KsProjectTemplate {
        let templateSourceFolder = './project_templates/' + language;
        let template = new KsProjectTemplate(templateSourceFolder);                 
        template.projectConfigFiles = this.getFilesSync(templateSourceFolder);
        template.dirs               = this.getDirsSync(templateSourceFolder);                
        return template;
    }

    private getFilesSync(srcpath : string) : string[] {
        return fs.readdirSync(srcpath).filter((file : string) => fs.statSync(path.join(srcpath, file)).isFile()).map((f:string) => srcpath + '/' + f );
    }

    private getDirsSync(srcpath : string, includeSubFolders : boolean = true) : string[] {        
        let dirs = fs.readdirSync(srcpath).filter((file : string) => 
               fs.statSync(path.join(srcpath, file)).isDirectory());
        if (includeSubFolders) {
            for(var dir of dirs) {
                for (var newDir of this.getDirsSync(srcpath + "/" + dir)) {
                    dirs.push(dir + "/" + newDir);
                }
            }
        }
        return dirs;
    }
}