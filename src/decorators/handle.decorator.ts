import 'reflect-metadata';
import { consoleAwsLogger } from '../console-aws-logger';
import { ErrorHandler } from '../error-handler';
import { DynamicMetadata } from '../models';
import { AwsLogger } from '../models/aws-logger.model';

interface HandleProps {
    responseCode?: number;
    errorHandler?: ErrorHandler;
    logger?: AwsLogger
}

export function handle(target: any, propertyKey: string, descriptor: PropertyDescriptor): void;
export function handle(options: HandleProps): (target: any, propertyKey: string, descriptor: PropertyDescriptor) => void;
export function handle(optionsOrTarget: HandleProps | any, propertyKey?: string, descriptor?: PropertyDescriptor) {
    if ('responseCode' in optionsOrTarget || 'errorHandler' in optionsOrTarget || 'logger' in optionsOrTarget) {
        // first argument is HandleProps
        return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
            impl(target, propertyKey, descriptor, optionsOrTarget)
        }
    } else {
        return impl(optionsOrTarget, propertyKey!, descriptor!, {});
    }
}

function impl(target: any, propertyKey: string, descriptor: PropertyDescriptor, options: HandleProps = {}) {
    const metadata = DynamicMetadata.get(target);
    metadata.handler = propertyKey;
    metadata.happyStatusCode = options!.responseCode || 200;
    metadata.errorHandler = options!.errorHandler;

    if (options!.logger) {
        if (options!.logger.setAwsRequest && typeof options!.logger.setAwsRequest === 'function') {
            metadata.logger = options!.logger;
        } else {
            consoleAwsLogger.warn('Found a logger, but its setAwsRequest() method doesn\'t look right. Is it properly defined?');
        }
    }

    DynamicMetadata.set(metadata, target);
}
