import { APIGatewayProxyEvent, APIGatewayProxyHandler, APIGatewayProxyResult, Context } from 'aws-lambda';
import { consoleAwsLogger } from './console-aws-logger';
import { ErrorManager } from './error-handler';
import { CustomError } from './errors/custom.error';
import { DynamicMetadata } from './models';
import { isValidResponseEntity, toApiGatewayProxyResult } from './models/response-entity.model';
import { getParameters } from './util/parameter-injection.util';

const errorManager = new ErrorManager();
let logger = consoleAwsLogger;

interface DynamicHandler {
    instance: any
    handlerName: string
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

function isRunningOnAws() {
    return !!process.env.LAMBDA_TASK_ROOT;
}
