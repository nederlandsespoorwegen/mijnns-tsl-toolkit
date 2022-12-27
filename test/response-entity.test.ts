import { handle, ResponseEntity, lambdaEntry } from '../src';
import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';

export class TestLambda {

    @handle
    public handle(): ResponseEntity {
        return {
            statusCode: 429,
            body: {
                message: 'Too many attempts!'
            },
            headers: {
                'X-Retry-After': '9999'
            }
        }
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('ns-lambda-kit response entity test', () => {
    it('should properly do a happy flow', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{}`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 429,
            body: '{"message":"Too many attempts!"}',
            headers: {
                'Content-Type': 'application/json',
                'X-Retry-After': '9999'
            }
        });
    });
});
