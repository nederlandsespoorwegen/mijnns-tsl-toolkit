import { ErrorHandler } from '../error-handler';
import { tslKeyword } from '../keywords';
import { AwsLogger } from './aws-logger.model';

export type SupportedContentTypes = (string | undefined)[];
export type ParseJsonOptions = boolean | SupportedContentTypes;

export interface RequestBodyProps {
    index: number;
    parseJson?: ParseJsonOptions;
    contentType?: SupportedContentTypes
}

interface MemberProps {
    requestBodyProps?: RequestBodyProps;
    eventIndex?: number;
    contextIndex?: number;
    authorizerIndex?: number;
    requestHeaderIndexes?: { [key: string]: number };
    pathParamIndexes?: { [key: string]: number };
    queryParamIndexes?: { [key: string]: number };
}

export class DynamicMetadata {
    initializer?: string;
    handler?: string;
    happyStatusCode?: number;
    errorHandler?: ErrorHandler;
    logger?: AwsLogger;
    members?: { [key: string]: MemberProps };

    static get(target: any): DynamicMetadata {
        return Reflect.getMetadata(tslKeyword, target) || {};
    }

    static set(value: DynamicMetadata, target: any) {
        Reflect.defineMetadata(tslKeyword, value, target);
    }
}
