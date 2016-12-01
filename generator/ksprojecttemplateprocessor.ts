import { KsToken } from './../ks/kslexer';
import { IKsProjectCodeGenerator } from './ksprojectgenerator';

class KsDynamicTemplateNode {
    value    : string;
    type     : string;
    children : KsDynamicTemplateNode[] = [];
}

class KsDynamicTemplateContext {
    pos : number = 0;
}

class KsDynamicTemplate {
    nodes : KsDynamicTemplateNode[] = [];    
}

export class KsProjectTemplateProcessor {
    codeGenerator : IKsProjectCodeGenerator;
    constructor(codeGenerator: IKsProjectCodeGenerator) {
        this.codeGenerator = codeGenerator;
    }

    process(templateFile : string, model : any) : string {                        
        let content = this.codeGenerator.getTemplateContent(templateFile);
        let parsed  = this.parseTemplate(content);
        return this.generate(parsed, model);
    }

    private parseTemplate(template : string) : KsDynamicTemplate {
        let tokens = this.tokenize(template);        
        return this.transform(tokens);
    }

    private transform(tokens:KsToken[]) : KsDynamicTemplate {        
        let template = new KsDynamicTemplate();
        let ctx      = new KsDynamicTemplateContext();
        while (ctx.pos < tokens.length) {
            let node = this.walkToken(tokens[ctx.pos], tokens, ctx);
            if (node && node !== undefined) {
                template.nodes.push(node);
            }
        }
        return template;
    }

    // TODO(Kalle): remove hierarchy so we don't need to know whether a script is start or not and just 
    //              process it as is. That way we can allow the usage of <% } else if (...) { %> and <% } else { %>     
    private walkToken(token:KsToken, tokens:KsToken[], ctx:KsDynamicTemplateContext) : KsDynamicTemplateNode {
        let node = new KsDynamicTemplateNode();        
        node.type  = token.type.includes("_") ? token.type.split('_')[0] : token.type;        
        node.value = token.value;
        
        // if (token.type.endsWith("_end")) {
        //     throw new SyntaxError("Unexpected template script end.. err?");
        // }
        // if (token.type.endsWith("_start")) {
        //     let next = tokens[++ctx.pos];
        //     while (next && !next.type.endsWith("_end")) {
        //         let n = this.walkToken(next, tokens, ctx);                
        //         node.children.push(n);
        //         next = tokens[ctx.pos];
        //     }                     
        // }

        ctx.pos++;
        return node;
    }

    private tokenize(template : string) : KsToken[] {
        let pos = 0;
        let tokens : KsToken[] = [];
        let currentValue = "";        
        while (pos < template.length) {
            let char = template[pos];             
            switch(char) {
                case "<": 
                    {
                        if (pos + 2 <template.length && template[pos+1] === "%"){
                            let isInlineScript = template[pos+2] === "=";
                            if (currentValue.length > 0) {
                                tokens.push(new KsToken(currentValue, "template"));
                                currentValue = "";
                            }                            
                            pos++;
                            currentValue = "<%";
                            let body = "";
                            let nextChar = template[++pos];                            
                            do {
                                if (nextChar === "%") {
                                    nextChar = template[++pos];
                                    if (nextChar === ">") {
                                        currentValue += "%>";
                                        break;
                                    }
                                    body+= nextChar; 
                                    currentValue += nextChar;
                                } else {
                                    body+= nextChar;
                                    currentValue += nextChar;
                                }
                                if (pos < template.length) {
                                    nextChar = template[++pos];
                                }                                
                            } while (pos < template.length);
                                                    
                            pos++;  
                            if (isInlineScript) {
                                tokens.push(new KsToken(currentValue, "script"));
                            } else {              
                                // TODO(Kalle): make it more script aware so we can get <% } else { %> working         
                                tokens.push(new KsToken(currentValue, "script_" + (body.trim() === "}" ? "end" : "start") ));
                            }
                            currentValue = "";
                            continue;                             
                        }                        
                    }                             
                default: 
                    currentValue += char;
                    pos++; 
                continue;
            }
        }
        if ( currentValue.length > 0 ){
            tokens.push(new KsToken(currentValue, "template"));
        }
        return tokens;
    }

    private generate(template : KsDynamicTemplate, model : any) : string {        
        let hasScripts = false;
        let evalResult : string = "";
        let templateContents: string[] = [];      

        let scriptobj = template.nodes.find((n:KsDynamicTemplateNode) => n.type === "script");
        if (scriptobj && scriptobj !== undefined) {
            hasScripts = true;
        }

        for(let node of template.nodes) {                        
            let content = this.generateTemplateContent(node, model, hasScripts);
            templateContents.push(content);           
        }
        let finalContent = templateContents.join("");
        if (hasScripts) {            
            eval(finalContent);
            return evalResult;
        }
        return finalContent;
    }

    private generateTemplateContent(node:KsDynamicTemplateNode, model : any, isScript : boolean):string {
        let templateContents: string[] = [];
        if (node.type === "script") {
            templateContents.push(this.evalTemplateScript(node, model));
        } else {
            if (isScript) {
                let val = " evalResult += `" + node.value + "`;";
                return this.applyKnowledgeBase(val, model);
            } else {
                return this.applyKnowledgeBase(node.value, model);
            }            
        }        
        return templateContents.join("");
    }

    private evalTemplateScript(node:KsDynamicTemplateNode, model : any):string { 
        if (node.value.startsWith("<%") && node.value.endsWith("%>")) {
            let singleLine = false;            
            let script = node.value.substring(2);            
            script     = script.slice(0, script.length - 2); 
            if (script.startsWith("=")) { script = script.substring(1); singleLine = true; }           
            if (node.children.length > 0 || !singleLine) {                              
                let scriptContent = "";
                for(var c of node.children) {
                    scriptContent += this.generateTemplateContent(c, model, true);
                } 
                let res = script + " " + scriptContent + " "; // }
                return this.applyKnowledgeBase(res, model); 
            } else {                
                let res = "evalResult += " + script + ";";
                return this.applyKnowledgeBase(res, model);
            }            
        } else {
            let res = "evalResult += `" + node.value + "`;";
            return this.applyKnowledgeBase(node.value, model);
        }
    }

    private applyKnowledgeBase(content : string, model : any):string {
        for(var key in model) {
            if (key.includes("$")) {
                content = content.split(key).join(model[key]);
            }
        }        
        return content;
    }
}