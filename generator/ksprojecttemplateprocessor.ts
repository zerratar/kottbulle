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

    process(templateFile : string, knowledgeBase : any) : string {                        
        let content = this.codeGenerator.getTemplateContent(templateFile);
        let parsed  = this.parseTemplate(content);
        return this.generate(parsed, knowledgeBase);
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

    private walkToken(token:KsToken, tokens:KsToken[], ctx:KsDynamicTemplateContext) : KsDynamicTemplateNode {
        let node = new KsDynamicTemplateNode();        
        node.type  = token.type.includes("_") ? token.type.split('_')[0] : token.type;        
        node.value = token.value;
        if (token.type.endsWith("_end")) {
            throw new SyntaxError("Unexpected template script end.. err?");
        }
        if (token.type.endsWith("_start")) {
            let next = tokens[++ctx.pos];
            while (next && !next.type.endsWith("_end")) {
                let n = this.walkToken(next, tokens, ctx);                
                node.children.push(n);
                next = tokens[ctx.pos];
            }            
            ctx.pos++;
        }
        else {
            ctx.pos++;                        
        }
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

    private generate(template : KsDynamicTemplate, knowledgeBase : any) : string {        
        let templateContents: string[] = [];
        for(let node of template.nodes) {
            templateContents.push(this.generateTemplateContent(node, knowledgeBase));
        }
        return templateContents.join("");
    }

    private generateTemplateContent(node:KsDynamicTemplateNode, knowledgeBase : any):string {
        let templateContents: string[] = [];
        if (node.type === "script") {
            templateContents.push(this.evalTemplateScript(node, knowledgeBase));
        } else {
            return this.applyKnowledgeBase(node.value, knowledgeBase);
        }        
        return templateContents.join("");
    }

    private evalTemplateScript(node:KsDynamicTemplateNode, knowledgeBase : any):string { 
        if (node.value.startsWith("<%") && node.value.endsWith("%>")) {
            let singleLine = false;
            let evalResult = "";
            let script = node.value.substring(2);            
            script     = script.slice(0, script.length - 2); 
            if (script.startsWith("=")) { script = script.substring(1); singleLine = true; }           
            if (node.children.length > 0 || !singleLine) {                              
                let scriptContent = "";

                // TODO(Kalle): build whole script and then do ONE eval. otherwise we can't
                //              access variables declared in upper scope ex:
                //              script 1: for(let i = 0; i < 100; i++) {
                //              script 2:    items[i]
                //              eos    1: }        ^---- i is an undefined reference
                //              this happens because we evaluate (script 2) before (script 1)
                for(var c of node.children) {
                    scriptContent += this.generateTemplateContent(c, knowledgeBase);
                } 
                eval(script + "evalResult += `" + scriptContent + "`; }");
                return this.applyKnowledgeBase(evalResult, knowledgeBase); 
            } else {                
                eval("evalResult += " + script + ";");
                return this.applyKnowledgeBase(evalResult, knowledgeBase);
            }            
        } else {
            return this.applyKnowledgeBase(node.value, knowledgeBase);
        }
    }

    private applyKnowledgeBase(content : string, knowledgeBase : any):string {
        for(var key in knowledgeBase) {
            if (key.includes("$")) {
                content = content.split(key).join(knowledgeBase[key]);
            }
        }        
        return content;
    }
}