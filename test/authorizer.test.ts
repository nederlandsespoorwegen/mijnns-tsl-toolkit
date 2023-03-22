import { authorizer, handle, lambdaEntry } from '../src';
import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';

export class TestLambda {

    @handle
    public handle(@authorizer auth: any) {
        return auth;
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('authorizer test', () => {
    it('should properly pass the authorizer when present', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "requestContext": {
                "authorizer": {
                "userId": 888
                }
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 200,
            body: '{"userId":888}',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });
});
