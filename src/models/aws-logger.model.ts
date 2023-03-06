import { Context } from 'aws-lambda';

export interface AwsLogger {

    info(message: string, payload?: any): void;
    warn(message: string, payload?: any): void;
    error(message: string, payload?: any): void;
    setAwsRequest(event: any, context: Context): void;
}
