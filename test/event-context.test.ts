import { event, context, handle, lambdaEntry } from '../src';
import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';

export class TestLambda {

    @handle
    public handle(@event event: any, @context context: Context) {
        return {
            event,
            context,
        };
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('event context test', () => {
    it('should properly pass the Lambda event and context', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "hello": "world"
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, { functionName: 'TestLambda' } as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 200,
            body: '{"event":{"hello":"world"},"context":{"functionName":"TestLambda"}}',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });
});
