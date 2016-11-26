/// <reference path="../typings/node/node.d.ts" />
import fs   = require('fs');
import path = require('path');
import { KsProjectTemplate } from './KsProjectTemplate';

export class KsProjectTemplateProvider {

    getTemplate(language: string) : KsProjectTemplate {
        let template = new KsProjectTemplate();         
        template.dirs = this.getDirsSync('./project_templates/' + language);
        return template;
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