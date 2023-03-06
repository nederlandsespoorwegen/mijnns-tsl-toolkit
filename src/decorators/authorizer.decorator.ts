import 'reflect-metadata';
import { DynamicMetadata } from '../models';

export function authorizer(target: any, propertyKey: string, parameterIndex: number) {
    const metadata = DynamicMetadata.get(target);
    if (metadata.members == null) {
        metadata.members = {};
    }

    const member = metadata.members[propertyKey] || {};
    member.authorizerIndex = parameterIndex;
    metadata.members[propertyKey] = member;

    DynamicMetadata.set(metadata, target);
}
