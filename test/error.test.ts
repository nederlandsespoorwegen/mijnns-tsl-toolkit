import { requestBody, handle, lambdaEntry, ErrorCatcher } from '../src';
import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';

function errorHandler(on: ErrorCatcher) {

    on(err => err == null, _ => ({
        statusCode: 500,
        body: { message: 'Error is null' }
    }));

    on(err => err.message == 'Hello', err => ({
        statusCode: 404,
        body: `Error is: ${err.message}`
    }));
}

interface ErrorDto {
    errorText: string;
}

export class TestLambda {

    @handle({ errorHandler })
    public handle(@requestBody request: ErrorDto): string {
        if (request.errorText == 'null') {
            throw null;
        } else {
            throw new Error(request.errorText)
        }
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('ns-lambda-kit error test', () => {
    it('should properly handle a caught error', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "body": {
                "errorText": "Hello"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 404,
            body: 'Error is: Hello',
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    });

    it('should properly handle a caught error which is null', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "body": {
                "errorText": "null"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 500,
            body: '{"message":"Error is null"}',
            headers: {
                'Content-Type': 'application/json'
            }
        });
    });

    it('should properly handle an uncaught error', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "body": {
                "errorText": "Something else"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 500,
            body: 'An unexpected error occurred',
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    });
});
