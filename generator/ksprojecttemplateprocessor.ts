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
            this.trimNodes(tokens[ctx.pos], tokens, ctx);
        }
        ctx.pos = 0;
        while (ctx.pos < tokens.length) {
            let node = this.walkToken(tokens[ctx.pos], tokens, ctx);
            if (node && node !== undefined) {
                template.nodes.push(node);
            }
        }
        return template;
    }

    private trimNodes(token:KsToken, tokens:KsToken[], ctx:KsDynamicTemplateContext) {   
        // --- this function will trim any lines introduces thanks to the template scripts
        // if the script token is taking up a whole line by itself, then the newline \n should be removed        
        if (token.type.includes("script") && !token.value.includes("<%=")) { // no inline scripts
            // token.line
            let leftOk = false;
            if (ctx.pos - 1 >= 0) {
                let prev    = tokens[ctx.pos-1];                
                let prevVal = this.trimRight(prev.value);// prev.value.replace(/^\s+|\s+$/g,'');
                if (!prev.type.includes("script") && prevVal.endsWith("\n")) {
                    leftOk = true;
                }
            } 
            if (leftOk && ctx.pos + 1 < tokens.length) {
                let next      = tokens[ctx.pos + 1];
                let nextValue = next.value;
                if (next.line !== token.line) {
                    if (nextValue.startsWith("\r\n") || nextValue.startsWith("\n")) {
                        // tokens[ctx.pos+1].value = nextValue.replace("\r\n","");
                        let prev   = tokens[ctx.pos-1];                 
                        tokens[ctx.pos-1].value = this.trimRight(prev.value, true);
                    }
                }
            }
        }
        ctx.pos++;   
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

    private trimRight(s : string, trimNewLine: boolean = false) : string {        
        let whitespaceEnd = -1;
        let len           = s.length;
        for (let i = len-1; i > 0; i--) {            
            if (trimNewLine) {
                if (s[i] !== " " && s[i] !== "\n") {
                    whitespaceEnd = i;
                    break;
                }
            } else {
                if(s[i] !== " ") {
                    whitespaceEnd = i;
                    break;
                }
            }
        }
        if (whitespaceEnd !== -1) {
            let v = s.substring(0,whitespaceEnd+1);
            if (v.endsWith("\r") && trimNewLine) {
                return v.substring(0,v.length-1);
            }
            return v;
        }
        return s;
    }

    private tokenize(template : string) : KsToken[] {
        let pos = 0;
        let tokens : KsToken[] = [];
        let currentValue = "";        
        while (pos < template.length) {
            let char = template[pos];                        
            let line = this.getCurrentLine(template, pos);         
            switch(char) {
                case "<": 
                    {
                        if (pos + 2 <template.length && template[pos+1] === "%"){
                            let isInlineScript = template[pos+2] === "=";
                            if (currentValue.length > 0) {
                                tokens.push(new KsToken(currentValue, "template", line));
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
                                tokens.push(new KsToken(currentValue, "script", line));
                            } else {              
                                // TODO(Kalle): make it more script aware so we can get <% } else { %> working         
                                tokens.push(new KsToken(currentValue, "script_" + (body.trim() === "}" ? "end" : "start"), line));
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
            let line = this.getCurrentLine(template, pos);   
            tokens.push(new KsToken(currentValue, "template", line));
        }
        return tokens;
    }

    private getCurrentLine(source: string, position: number): number {
        // NOTE(Kalle): We need to take account for script rows, those should not be counted.         
        let lines    = 0;
        let inScript = false;
        for(let i = 0; i <= position; i++) {
            if (source[i] === "<" && !inScript) {
                if (i + 1 < source.length) {
                    if(source[i+1] === "%") {
                        inScript = true;
                        i++;
                        continue;
                    }
                }                
            }
            if (source[i] === "%" && inScript) {
                if (i + 1 < source.length) {
                    if(source[i+1] === ">") {
                        inScript = false;
                        i++;
                        continue;
                    }
                }                
            }            
            if (source[i] === "\n" && !inScript) {
                lines++;
            }
        }
        return lines;
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