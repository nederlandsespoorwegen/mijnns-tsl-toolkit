import { lambdaFunction, StaticMetadata } from '../src'

@lambdaFunction({
    name: 'MyFunction',
    entry: 'src/my-function.ts',
    timeoutMs: 5000,
    memoryMb: 128,
    misc: {
        myProperty: 20
    }
})
export class TestLambda { }

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('static metadata test', () => {
    it('should properly fetch the metadata', async () => {
        const metadata = StaticMetadata.get(TestLambda);

        expect(metadata).toEqual({
            lambdaFunctionProps: {
                name: 'MyFunction',
                entry: 'src/my-function.ts',
                timeoutMs: 5000,
                memoryMb: 128,
                misc: {
                    myProperty: 20
                }
            }
        });
    });
});
