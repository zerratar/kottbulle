class KsLexerContext {
    position : number = 0;
}

export class KsToken {
    value : string;
    type  : string;
    constructor(value: string, type: string) {
        this.value = value;
        this.type  = type;
    }
}

export class KsLexer {
    
    /**
     * tokenizes the provided source code
     * @param source
     * @returns {ksToken[]}
     */
    parse(source: string) : KsToken[] {        
        console.time("KsLexer->parse");        
        let tokens : KsToken[]      = [];    
        let ctx    : KsLexerContext = new KsLexerContext();                                
        while (ctx.position < source.length) {            
            let tokenValue = source[ctx.position];
            if (this.isJunkToken(tokenValue)) {
                ctx.position++;
                continue;
            }
            let token = this.readToken(source, ctx);            
            if (token) {
                tokens.push(token);
            }
        }
        console.timeEnd("KsLexer->parse");
        return tokens;
    } 


    /**
     * reads the next token at the current position provided from the context
     * @param source
     * @param ctx
     * @returns {KsToken}
     */
    private readToken(source: string, ctx: KsLexerContext) : KsToken {
        let token:     string = source[ctx.position];
        let value:     string = null;
        let nextToken: string = null;

        if (!this.isEndOfSource(source, ctx.position+1)) {
            nextToken = source[ctx.position+1];
        }
        
        switch (token) {
            case "/":                 
                if (nextToken === "/") {                    
                    return this.readSingleLineComment(token, source, ctx);
                }

                if (nextToken === "*") {                    
                    return this.readMultiLineComment(token, source, ctx);                 
                }
            break;
            case ".":                 
                ctx.position++;
                return new KsToken(token, "dot");                 
            case ",":
                ctx.position++;
                return new KsToken(token, "comma");            
            case ";":                             
                ctx.position++;
                return new KsToken(token, "semicolon");            
            case ":":                 
                ctx.position++;
                return new KsToken(token, "colon");                                                     
            case "{":
            case "}": 
                ctx.position++;
                return new KsToken(token, "curlybracket");
            case "[":            
            case "]": 
                ctx.position++;
                return new KsToken(token, "bracket");
            case "(":
            case ")": 
                ctx.position++;
                return new KsToken(token, "parens");                                            
            case '"':
            case "'":                 
                return this.readString(token, source, ctx);
            default:
                // loop all acceptable literal values                
                return this.readLiteral(token, source, ctx);                                                
        }
        
        return null;
    }

    private readSingleLineComment(token: string, source: string, ctx: KsLexerContext) : KsToken {
        let comment = "/";                    
        do {
             let nextChar = source[++ctx.position];                        
            if (nextChar === "\n") {
                return new KsToken(comment, "comment"); 
            }
            comment += nextChar;      
         } while (ctx.position < source.length);
        return new KsToken(comment, "comment");
    }

    private readMultiLineComment(token: string, source: string, ctx: KsLexerContext) : KsToken {
        let comment = "/*";
        do {
            let nextChar = source[++ctx.position];                        
            if (nextChar === "*" && ctx.position+1<source.length) {
                nextChar = source[++ctx.position];
                if(nextChar === "/") {              
                    ctx.position++;      
                    return new KsToken(comment, "comment");
                }
                comment += nextChar;
            }
            comment += nextChar;
        } while (ctx.position < source.length);
        return new KsToken(comment, "comment");                   
    }

    private readString(token: string, source: string, ctx: KsLexerContext) : KsToken {
        let str = "";
        do {
            let nextChar = source[++ctx.position];                        
            if (nextChar === token) {
                ctx.position++;
                return new KsToken(str, "string"); 
            }
            str += nextChar;      
        } while (ctx.position < source.length);  
        return new KsToken(str, "string");
    }

    private readLiteral(token: string, source: string, ctx: KsLexerContext) : KsToken {
        let str = token;
        if(ctx.position + 1 < source.length) {
            do {                        
                let nextChar = source[++ctx.position];                        
                if (!this.isAcceptableLiteral(nextChar)) {
                    return new KsToken(str, "literal"); 
                }
                str += nextChar;      
            } while (ctx.position < source.length);
        }                    
        return new KsToken(str, "literal");
    }

    private isAcceptableLiteral(char:string): boolean {
        return "abcdefghijklmnopqrstuvwxyzåäö_1234567890.".includes(char.toLowerCase());
    }
    
    private isEndOfSource(source:string, pos:number) {
        return pos >= source.length;
    }

    private isJunkToken(tokenValue:string): boolean {
        return tokenValue === " " || tokenValue === "\t"  || tokenValue === "\r" || tokenValue === "\n";
    }
}