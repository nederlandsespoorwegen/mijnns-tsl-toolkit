import { APIGatewayProxyEvent, Context } from 'aws-lambda';
import { UnreadableRequestBodyError } from '../errors';
import { UnsupportedMediaTypeError } from '../errors/unsupported-media-type.error';
import { DynamicMetadata, MemberProps } from '../models';
import { toLowerCaseKeys } from '../util/case-insensitive-lookup.util';
import { isSupportedContentType, extractMediaType, shouldJsonParseEventBody } from '../util/content-type.util';

type Headers = { [key: string]: any };

interface Param {
    index: number;
    value: any;
}

/**
 * Return a list of values that will be injected into the implementation's handler function with a spread operator.
 * Meaning the returned list shall match the handler's signature length and types as much as possible.
 *
 * The given metadata contains "index" properties (@see MemberProps), which tell us what request parameters
 * the implementing handler wants to have injected, and on which parameter index they want them.
 *
 * (ex: [requestBodyIndex: 1] means the request body should be the 2nd element in this return value)
 * In the above example, if nothing is specified to go on index 0, that element will be null.
 *
 * This function first gathers all requested parameters in no particular order, then builds the list with each
 * parameter on the correct index.
 */
export function getParameters(metadata: DynamicMetadata, event: APIGatewayProxyEvent, context: Context) {
    const handlerProps = metadata.members != null ? metadata.members![metadata.handler!] : null;
    if (handlerProps != null) {
        let params = [] as Param[];
        const lowercaseHeaders = toLowerCaseKeys(event.headers || {});

        if (handlerProps.requestHeaderIndexes != null) {
            params = params.concat(getRequestHeaderParams(handlerProps, lowercaseHeaders));
        }
        if (handlerProps.pathParamIndexes != null) {
            params = params.concat(getPathParams(handlerProps, event));
        }
        if (handlerProps.queryParamIndexes != null) {
            params = params.concat(getQueryParams(handlerProps, event));
        }
        if (handlerProps.requestBodyProps != null) {
            params = params.concat(getRequestBodyParams(handlerProps, event, lowercaseHeaders));
        }
        if (handlerProps.authorizerIndex != null) {
            params = params.concat(getAuthorizerParams(handlerProps, event));
        }
        if (handlerProps.eventIndex != null) {
            params = params.concat(getEventParams(handlerProps, event));
        }
        if (handlerProps.contextIndex != null) {
            params = params.concat(getContextParams(handlerProps, context));
        }

        const maxIndex = Math.max(...params.map((p) => p.index));
        const returnValue = [];
        for (let i = 0; i <= maxIndex; i++) {
            const match = params.find((p) => p.index === i);
            if (match) {
                returnValue.push(match.value);
            } else {
                returnValue.push(null);
            }
        }

        return returnValue;
    } else {
        return [];
    }
}

function getRequestHeaderParams(props: MemberProps, lowercaseHeaders: Headers): Param[] {
    if (props.requestHeaderIndexes != null) {
        return Object.keys(props.requestHeaderIndexes!).map((h) => ({
            index: props.requestHeaderIndexes![h],
            value: lowercaseHeaders[h.toLowerCase()],
        }));
    } else {
        return [];
    }
}

function getPathParams(props: MemberProps, event: APIGatewayProxyEvent): Param[] {
    if (props.pathParamIndexes != null) {
        return Object.keys(props.pathParamIndexes!).map((p) => ({
            index: props.pathParamIndexes![p],
            value: (event.pathParameters || {})[p],
        }));
    } else {
        return [];
    }
}

function getQueryParams(props: MemberProps, event: APIGatewayProxyEvent): Param[] {
    if (props.queryParamIndexes != null) {
        return Object.keys(props.queryParamIndexes!).map((p) => ({
            index: props.queryParamIndexes![p],
            value: (event.queryStringParameters || {})[p],
        }));
    } else {
        return [];
    }
}

function getRequestBodyParams(props: MemberProps, event: APIGatewayProxyEvent, lowercaseHeaders: Headers): Param[] {
    const requestBodyProps = props.requestBodyProps;
    if (requestBodyProps != null) {
        const mediaType = extractMediaType(lowercaseHeaders['content-type']);

        if (requestBodyProps.contentType != null && !isSupportedContentType(requestBodyProps.contentType, mediaType)) {
            throw new UnsupportedMediaTypeError(requestBodyProps.contentType);
        }

        const index = requestBodyProps.index;
        if (event.body != null) {
            if (shouldJsonParseEventBody(requestBodyProps.parseJson, mediaType)) {
                return [{ index, value: parseJsonEventBody(event.body) }];
            } else {
                return [{ index, value: event.body }];
            }
        } else {
            return [{ index, value: undefined }];
        }
    } else {
        return [];
    }
}

function getAuthorizerParams(props: MemberProps, event: APIGatewayProxyEvent): Param[] {
    if (props.authorizerIndex != null) {
        if (event.requestContext != null && event.requestContext.authorizer != null) {
            return [{ index: props.authorizerIndex, value: event.requestContext.authorizer }];
        } else {
            return [{ index: props.authorizerIndex, value: undefined }];
        }
    } else {
        return [];
    }
}

function getEventParams(props: MemberProps, event: APIGatewayProxyEvent): Param[] {
    if (props.eventIndex != null) {
        return [{ index: props.eventIndex, value: event }];
    } else {
        return [];
    }
}

function getContextParams(props: MemberProps, context: Context): Param[] {
    if (props.contextIndex != null) {
        return [{ index: props.contextIndex, value: context }];
    } else {
        return [];
    }
}

function parseJsonEventBody(body: any): any {
    if (body == null) {
        return null;
    } else if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (err) {
            throw new UnreadableRequestBodyError();
        }
    } else {
        return body;
    }
}
