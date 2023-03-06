import { Context } from 'aws-lambda';
import { AwsLogger } from './models/aws-logger.model';

/**
 * This logger will be used to handle this library's own logging, 
 * but may be replaced by an implementing lambda function for a different logging library
 */
class ConsoleAwsLogger implements AwsLogger {
    info(message: string, payload?: any): void {
        if (payload) {
            console.info(message, payload);
        } else {
            console.info(message);
        }
    }
    warn(message: string, payload?: any): void {
        if (payload) {
            console.warn(message, payload);
        } else {
            console.warn(message);
        }
    }
    error(message: string, payload?: any): void {
        if (payload) {
            console.error(message, payload);
        } else {
            console.error(message);
        }
    }
    setAwsRequest(event: any, context: Context): void { }

}

export const consoleAwsLogger = new ConsoleAwsLogger();
