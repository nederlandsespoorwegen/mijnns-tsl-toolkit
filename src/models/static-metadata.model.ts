import { LambdaFunctionProps } from '.';
import { tslKeyword } from '../keywords';

export class StaticMetadata {
    lambdaFunctionProps?: LambdaFunctionProps;

    static get(target: any): StaticMetadata {
        return Reflect.getMetadata(tslKeyword, target) || {};
    }

    static set(value: StaticMetadata, target: any) {
        Reflect.defineMetadata(tslKeyword, value, target);
    }
}
