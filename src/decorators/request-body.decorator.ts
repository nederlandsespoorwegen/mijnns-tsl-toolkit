import 'reflect-metadata';
import { DynamicMetadata, RequestBodyProps } from '../models';

export interface RequestBodyParams {
    parseJson?: boolean | string  | (string | undefined)[]
    contentType?: string | (string | undefined)[]
}

export function requestBody(target: any, propertyKey: string, parameterIndex: number): void;
export function requestBody(params: RequestBodyParams): (target: any, propertyKey: string, parameterIndex: number) => void;
export function requestBody(paramsOrTarget: RequestBodyParams | any, propertyKey?: string, parameterIndex?: number) {
    if ('parseJson' in paramsOrTarget || 'contentType' in paramsOrTarget) {
        // first argument is RequestBodyParams
        return (target: any, propertyKey: string, parameterIndex: number) => {
            impl(target, propertyKey, parameterIndex, paramsOrTarget)
        }
    } else {
        return impl(paramsOrTarget, propertyKey!, parameterIndex!, {})
    }
}


function impl(target: any, propertyKey: string, parameterIndex: number, {parseJson,contentType}: RequestBodyParams) {
    const metadata = DynamicMetadata.get(target);
    if (metadata.members == null) {
        metadata.members = {};
    }

    const props: RequestBodyProps = {
        index: parameterIndex
    }

    if (parseJson !== undefined) {
        if (typeof parseJson === 'string') {
            props.parseJson = [parseJson];
        } else {
            props.parseJson = parseJson
        }
    }

    if (contentType) {
        if (typeof contentType === 'string') {
            props.contentType = [contentType]
        } else {
            props.contentType = contentType
        }
    }

    const member = metadata.members[propertyKey] || {};
    member.requestBodyProps = props;
    metadata.members[propertyKey] = member;

    DynamicMetadata.set(metadata, target);
}
