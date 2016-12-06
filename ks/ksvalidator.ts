import { KsProgramTree } from "./ksprogramtree";

export class KsValidationResult {
    isSuccess : boolean;
    reason    : string;
    constructor (isSuccess: boolean = true, reason : string = "") {
        this.isSuccess = isSuccess;
        this.reason = reason;
    }
}

export class KsValidator {

    validate(app: KsProgramTree): KsValidationResult {



        return new KsValidationResult(true);
    }

    /**
     * validates the input KsProgramTree and throws an error if failed
     * 
     * @param {KsProgramTree} app     
     * @memberOf KsValidator
     */
    validateAndThrowIfFailed(app: KsProgramTree) {
        let result = this.validate(app);
        if (!result.isSuccess) {
            throw SyntaxError(result.reason.length === 0 ? "Unknown script error" : result.reason);
        }
    }
}