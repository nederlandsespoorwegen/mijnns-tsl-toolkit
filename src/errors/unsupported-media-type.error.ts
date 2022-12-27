import { CustomError } from "./custom.error";
import {SupportedContentTypes} from "../models";

export class UnsupportedMediaTypeError extends CustomError {

    constructor(supportedContentTypes: SupportedContentTypes) {
        let message = UnsupportedMediaTypeError.constructMessage(supportedContentTypes);
        super(message, 415);
    }

    private static constructMessage(supportedContentTypes: (string | undefined)[]) {

        const [supportedCTString, omittingSupported] = supportedContentTypes.reduce(
            ([acc, omittingSupported], ct) => {
                if ( ct === undefined ) {
                    return [acc, true]
                }
                return [acc + (acc.length > 0 ? ', ' : '') + ct, omittingSupported]
            },
            ['',false]);

        let message =  `Unsupported Media Type. Supported media types are: ${supportedCTString}.`;
        if (omittingSupported) {
            message += ' This endpoint also supports omitting the Content-Type header.'
        }
        return message;
    }
}
