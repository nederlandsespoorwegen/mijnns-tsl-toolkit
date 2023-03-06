import 'reflect-metadata';
import { StaticMetadata, LambdaFunctionProps } from '../models';

export function lambdaFunction(options: LambdaFunctionProps) {
    return (constructor: Function) => {
        const metadata = StaticMetadata.get(constructor);
        metadata.lambdaFunctionProps = options;
        StaticMetadata.set(metadata, constructor);
    };
}
