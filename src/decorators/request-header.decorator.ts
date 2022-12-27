import 'reflect-metadata';
import { DynamicMetadata } from '../models';

export function requestHeader(headerName: string) {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        const metadata = DynamicMetadata.get(target);
        if (metadata.members == null) {
            metadata.members = {};
        }

        const member = metadata.members[propertyKey] || {};
        if (member.requestHeaderIndexes == null) {
            member.requestHeaderIndexes = {};
        }

        member.requestHeaderIndexes[headerName] = parameterIndex;
        metadata.members[propertyKey] = member;

        DynamicMetadata.set(metadata, target);
    };
}
