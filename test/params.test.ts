import { pathParam, queryParam, handle, lambdaEntry } from '../src';
import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';

export class TestLambda {

    @handle
    public handle(@pathParam('param1') p1: string, @queryParam('param2') p2: string, @queryParam('param3') p3: string) {
        return {
            p1, p2, p3
        }
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('params test', () => {
    it('should properly pass path and query params', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "pathParameters": {
                "param1": "param1"
            },
            "queryStringParameters": {
                "param2": "param2",
                "param3": "param3"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 200,
            body: '{"p1":"param1","p2":"param2","p3":"param3"}',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });
});
