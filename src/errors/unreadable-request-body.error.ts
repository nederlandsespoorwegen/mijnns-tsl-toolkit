import { CustomError } from "./custom.error";

export class UnreadableRequestBodyError extends CustomError {

    constructor() {
        super('Unreadable request body, need valid JSON', 400);
    }
}
