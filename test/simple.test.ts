import { handle, init, requestBody, requestHeader, lambdaEntry } from '../src';
import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';

interface PersonIdRequestDto {
    personId: string;
}

export class TestLambda {
    private initValue = 'unmodified';

    @init
    public init() {
        this.initValue = 'modified';
    }

    @handle({ responseCode: 204 })
    public handle(@requestBody request: PersonIdRequestDto, @requestHeader('Authorization') auth: string): string {
        return `${this.initValue} ${request.personId} ${auth}`;
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('ns-lambda-kit simple test', () => {
    it('should properly do a happy flow', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "body": {
                "personId": "Hello"
            },
            "headers": {
                "authorization": "Bearer 000000000"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 204,
            body: 'modified Hello Bearer 000000000',
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    });

    it('should return status code 400 for an unreadable application/json request body', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "body": "Bit of text here",
            "headers": {
                "Content-Type": "application/json",
                "authorization": "Bearer 000000000"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 400,
            body: 'Unreadable request body, need valid JSON',
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    })

    it('should be fine with that request body if the content type is text/plain', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{
            "body": "Bit of text here",
            "headers": {
                "Content-Type": "text/plain",
                "authorization": "Bearer 000000000"
            }
        }`);

        const response: void | APIGatewayProxyResult = await handler(event, null as any as Context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 204,
            body: 'modified undefined Bearer 000000000',
            headers: {
                'Content-Type': 'text/plain'
            }
        });
    });
});
