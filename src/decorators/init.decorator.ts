import 'reflect-metadata';
import { DynamicMetadata } from '../models';

export function init(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const metadata = DynamicMetadata.get(target);
    metadata.initializer = propertyKey;
    DynamicMetadata.set(metadata, target);
}
