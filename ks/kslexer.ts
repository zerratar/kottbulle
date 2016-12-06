class KsLexerContext {
    position : number = 0;
}

export class KsToken {
    value : string;
    type  : string;
    line  : number;
    constructor(value: string, type: string, line: number = 0) {
        this.value = value;
        this.type  = type;
        this.line  = line;
    }
}

export class KsLexer {

    /**
     * tokenizes the provided source code
     * @param source
     * @returns {ksToken[]}
     */
    parse(source: string): KsToken[] {
        console.time("KsLexer->parse");
        let tokens : KsToken[]      = [];
        let ctx    : KsLexerContext = new KsLexerContext();
        while (ctx.position < source.length) {
            let tokenValue: string = source[ctx.position];
            if (this.isJunkToken(tokenValue)) {
                ctx.position++;
                continue;
            }
            let token: KsToken = this.readToken(source, ctx);
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
    private readToken(source: string, ctx: KsLexerContext): KsToken {
        let token:     string = source[ctx.position];
        let nextToken: string = null;

        let line: number = this.getCurrentLine(source, ctx.position);

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
                return new KsToken(token, "dot", line);
            case ",":
                ctx.position++;
                return new KsToken(token, "comma", line);
            case ";":
                ctx.position++;
                return new KsToken(token, "semicolon", line);
            case ":":
                ctx.position++;
                return new KsToken(token, "colon", line);
            case "{":
            case "}":
                ctx.position++;
                return new KsToken(token, "curlybracket", line);
            case "[":
            case "]":
                ctx.position++;
                return new KsToken(token, "bracket", line);
            case "(":
            case ")":
                ctx.position++;
                return new KsToken(token, "parens", line);
            case "\"":
            case "'":
                return this.readString(token, source, ctx, line);
            default:
                // loop all acceptable literal values                
                return this.readLiteral(token, source, ctx, line);
        }

        return null;
    }

    private getCurrentLine(source: string, position: number): number {
        let lines: number = 0;
        for(let i: number = 0; i < position; i++) {
            if (source[i] === "\n") {
                lines++;
            }
        }
        return lines;
    }

    private readSingleLineComment(token: string, source: string, ctx: KsLexerContext): KsToken {
        let comment: string = "/";
        do {
            let nextChar: string = source[++ctx.position];
            if (nextChar === "\n") {
                return new KsToken(comment, "comment");
            }
            comment += nextChar;
         } while (ctx.position < source.length);
        return new KsToken(comment, "comment");
    }

    private readMultiLineComment(token: string, source: string, ctx: KsLexerContext): KsToken {
        let comment: string = "/*";
        do {
            let nextChar: string = source[++ctx.position];
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

    private readString(token: string, source: string, ctx: KsLexerContext, line: number): KsToken {
        let str: string = "";
        do {
            let nextChar: string = source[++ctx.position];
            if (nextChar === token) {
                ctx.position++;
                return new KsToken(str, "string", line);
            }
            str += nextChar;
        } while (ctx.position < source.length);
        return new KsToken(str, "string", line);
    }

    private readLiteral(token: string, source: string, ctx: KsLexerContext, line: number): KsToken {
        let str: string = token;
        if(ctx.position + 1 < source.length) {
            do {
                let nextChar: string = source[++ctx.position];
                if (!this.isAcceptableLiteral(nextChar)) {
                    return new KsToken(str, "literal", line);
                }
                str += nextChar;
            } while (ctx.position < source.length);
        }
        return new KsToken(str, "literal", line);
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