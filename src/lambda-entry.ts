import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from 'aws-lambda';
import { consoleAwsLogger } from './console-aws-logger';
import { ErrorManager } from './error-handler';
import { CustomError } from './errors/custom.error';
import { UnreadableRequestBodyError } from './errors/unreadable-request-body.error';
import { UnsupportedMediaTypeError } from './errors/unsupported-media-type.error';
import { DynamicMetadata } from './models';
import { isValidResponseEntity, toApiGatewayProxyResult } from './models/response-entity.model';
import { toLowerCaseKeys } from './util/case-insensitive-lookup.util';
import { contentTypeIsSupported, extractMediaType, shouldParseEventBody } from './util/content-type.util';

const errorManager = new ErrorManager();
let logger = consoleAwsLogger;

interface DynamicHandler {
    instance: any
    handlerName: string
}

interface Param {
    index: number;
    value: any;
}

export function lambdaEntry<T>(LambdaClass: new () => T): APIGatewayProxyHandler {
    if (isRunningOnAws()) {
        const instance = new LambdaClass();
        const metadata = DynamicMetadata.get(instance);

        if (metadata.logger) {
            logger = metadata.logger;
            errorManager.setLogger(metadata.logger);
        }

        const dynamicHandler = getDynamicHandlerOrThrow(metadata, instance);
        tryCallingDynamicInitializer(metadata, instance);
        errorManager.setDynamicErrorHandler(metadata.errorHandler);

        return async (event: APIGatewayProxyEvent, context: Context) => {
            try {
                logger.setAwsRequest(event, context);
                return handleAsync(dynamicHandler, metadata, getParameters(metadata, event, context));
            } catch (err) {
                return Promise.resolve(handleRequestError(err));
            }
        };
    } else {
        return () => Promise.resolve({
            statusCode: 200,
            body: `
                Could not detect an AWS environment. Are you running a test?
                If you want to run this function, define the environment variable LAMBDA_TASK_ROOT before lambdaEntry() is called.
            `
        } as APIGatewayProxyResult);
    }
}

// eslint-disable-next-line
async function handleAsync(handler: DynamicHandler, metadata: DynamicMetadata, parameters: any[]): Promise<APIGatewayProxyResult> {
    try {
        // eslint-disable-next-line
        const output = await handler.instance[handler.handlerName](...parameters);

        if (isValidResponseEntity(output)) {
            return toApiGatewayProxyResult(output);
        } else {
            return toApiGatewayProxyResult({ statusCode: metadata.happyStatusCode || 200, body: output });
        }
    } catch (err) {
        return errorManager.catch(err);
    }
}

// eslint-disable-next-line
function getDynamicHandlerOrThrow(metadata: DynamicMetadata, instance: any): DynamicHandler {
    if (metadata.handler == null) {
        handleInitializationError('No entry point was indicated, did you forget to put @handle somewhere?');
    }

    const returnValue = instance[metadata.handler];
    if (returnValue == null) {
        handleInitializationError(`Unable to find the indicated handler (${metadata.handler})`);
    } else if (typeof returnValue !== 'function') {
        handleInitializationError(`Found the indicated handler (${metadata.handler}), but its type is not "function" (${typeof returnValue})`);
    }

    return {
        instance,
        handlerName: metadata.handler
    };
}

// eslint-disable-next-line
function tryCallingDynamicInitializer(metadata: DynamicMetadata, instance: any) {
    if (metadata.initializer == null) {
        logger.info('No init method was found here, moving on...');
    } else {
        const initFunction = instance[metadata.initializer!];
        if (initFunction == null) {
            handleInitializationError(`Unable to find the indicated init method (${metadata.handler})`);
        } else if (typeof initFunction !== 'function') {
            handleInitializationError(`Found the indicated init method (${metadata.handler}), but its type is not "function" (${typeof initFunction})`);
        }

        const initReturnValue = instance[metadata.initializer!]();

        if (initReturnValue instanceof Promise) {
            handleInitializationError(`
                The init function returned a Promise! Did you make it async? 
                This function should remain synchronous and assign Promises to class members if needed.
            `);
        }
    }
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
function getParameters(metadata: DynamicMetadata, event: APIGatewayProxyEvent, context: Context) {
    const handlerProps = metadata.members != null ? metadata.members![metadata.handler!] : null;
    if (handlerProps != null) {
        let params = [] as Param[];
        const lowercaseHeaders = toLowerCaseKeys(event.headers || {});

        if (handlerProps.requestHeaderIndexes != null) {
            params = params.concat(Object.keys(handlerProps.requestHeaderIndexes!).map((h) => ({
                index: handlerProps.requestHeaderIndexes![h],
                value: lowercaseHeaders[h.toLowerCase()],
            })));
        }

        if (handlerProps.pathParamIndexes != null) {
            params = params.concat(Object.keys(handlerProps.pathParamIndexes!).map((p) => ({
                index: handlerProps.pathParamIndexes![p],
                value: (event.pathParameters || {})[p],
            })));
        }

        if (handlerProps.queryParamIndexes != null) {
            params = params.concat(Object.keys(handlerProps.queryParamIndexes!).map((p) => ({
                index: handlerProps.queryParamIndexes![p],
                value: (event.queryStringParameters || {})[p],
            })));
        }

        const requestBodyProps = handlerProps.requestBodyProps;
        if (requestBodyProps != null) {
            const contentType = lowercaseHeaders['content-type'];
            const mediaType = extractMediaType(contentType);

            if (requestBodyProps.contentType) {
                if (!contentTypeIsSupported(requestBodyProps.contentType, mediaType)) {
                    throw new UnsupportedMediaTypeError(requestBodyProps.contentType);
                }
            }

            const index = requestBodyProps.index;
            if (event.body != null) {
                if (shouldParseEventBody(requestBodyProps.parseJson, mediaType)) {
                    params.push({ index, value: parseJsonEventBody(event.body) });
                } else {
                    params.push({ index, value: event.body });
                }
            } else {
                params.push({ index, value: undefined });
            }
        }

        if (handlerProps.authorizerIndex != null) {
            if (event.requestContext != null && event.requestContext.authorizer != null) {
                params.push({ index: handlerProps.authorizerIndex, value: event.requestContext.authorizer });
            } else {
                params.push({ index: handlerProps.authorizerIndex, value: undefined });
            }
        }

        if (handlerProps.eventIndex != null) {
            params.push({ index: handlerProps.eventIndex, value: event });
        }
        if (handlerProps.contextIndex != null) {
            params.push({ index: handlerProps.contextIndex, value: context });
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

/**
 * This function will be called for any error thrown after a request comes in, but before the dynamic handler is called,
 * for example while trying to parse the request body.
 */
function handleRequestError(err: any): APIGatewayProxyResult {
    if (err instanceof CustomError) {
        logger.error(err.message, err);
        return {
            statusCode: err.statusCode,
            headers: { 'Content-Type': 'text/plain' },
            body: err.message
        };
    } else {
        if (err && err.message) {
            logger.error(err.message, err);
        } else {
            logger.error(err);
        }
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: 'An unknown error occurred'
        };
    }
}

/**
 * This function will be called with an error message for any critical issues that happen during initialization.
 * It won't generate a 500 response since no request has come in yet at this point.
 */
function handleInitializationError(message: string): never {
    logger.error(message);
    throw new Error(message);
}

function parseJsonEventBody(body: any): any {
    if (body == null) {
        return null;
    } else if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (err) {
            logger.warn('Failed to JSON.parse a request body: ', err);
            throw new UnreadableRequestBodyError();
        }
    } else {
        return body;
    }
}

function isRunningOnAws() {
    return !!process.env.LAMBDA_TASK_ROOT;
}
