import { APIGatewayProxyResult } from 'aws-lambda';
import { consoleAwsLogger } from './console-aws-logger';
import { AwsLogger, ResponseEntity, toApiGatewayProxyResult } from './models';

export type Predicate = (input: any) => boolean;
export type ResponseProvider = (input: any) => ResponseEntity<any>;
export type ErrorCatcher = (test: Predicate, provider: ResponseProvider) => void;
export type ErrorHandler = (on: ErrorCatcher) => void;

export class ErrorManager {

    private currentThrownError?: any;
    private currentErrorResponse?: ResponseEntity<any>;
    private dynamicErrorHandler?: ErrorHandler;
    private logger: AwsLogger = consoleAwsLogger;

    public setDynamicErrorHandler(handler?: ErrorHandler) {
        this.dynamicErrorHandler = handler;
    }

    public setLogger(logger: AwsLogger) {
        this.logger = logger;
    }

    public catch(err: any): APIGatewayProxyResult {
        this.currentErrorResponse = undefined;
        this.currentThrownError = undefined;
        this.logger.warn(`Handler threw an error of type "${typeof err}": `, err);
        if (this.dynamicErrorHandler != null) {
            this.currentThrownError = err;
            this.dynamicErrorHandler((test: Predicate, provider: ResponseProvider) => this.onDynamicErrorHandlerCheck(test, provider));

            return this.currentErrorResponse != null ? toApiGatewayProxyResult(this.currentErrorResponse) : this.buildDefaultResponse();
        } else {
            return this.buildDefaultResponse();
        }
    }

    private onDynamicErrorHandlerCheck(test: Predicate, provider: ResponseProvider) {
        if (this.currentErrorResponse == null && test(this.currentThrownError)) {
            this.currentErrorResponse = provider(this.currentThrownError);
        }
    }

    private buildDefaultResponse(): APIGatewayProxyResult {
        return {
            statusCode: 500,
            body: 'An unexpected error occurred',
            headers: { 'Content-Type': 'text/plain' }
        };
    }
}
