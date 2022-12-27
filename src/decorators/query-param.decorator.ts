import 'reflect-metadata';
import { DynamicMetadata } from '../models';

export function queryParam(param: string) {
    return (target: any, propertyKey: string, parameterIndex: number) => {
        const metadata = DynamicMetadata.get(target);
        if (metadata.members == null) {
            metadata.members = {};
        }

        const member = metadata.members[propertyKey] || {};
        if (member.queryParamIndexes == null) {
            member.queryParamIndexes = {};
        }

        member.queryParamIndexes[param] = parameterIndex;
        metadata.members[propertyKey] = member;

        DynamicMetadata.set(metadata, target);
    };
}
