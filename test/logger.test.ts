import { APIGatewayProxyResult, Callback, Context } from 'aws-lambda';
import { handle, lambdaEntry, AwsLogger } from '../src';

class TestLogger implements AwsLogger {

    logLines: string[] = [];
    event: any;
    context: Context;

    info(message: string, payload?: any): void {
        this.logLines.push(`INFO ${message}`);
        console.info(message);
    }
    warn(message: string, payload?: any): void {
        this.logLines.push(`WARN ${message}`);
        console.warn(message);
    }
    error(message: string, payload?: any): void {
        this.logLines.push(`ERROR ${message}`);
        console.error(message);
    }
    setAwsRequest(event: any, context: Context): void {
        this.event = event;
        this.context = context;
        throw new Error('setAwsRequest will throw!');
    }

}

const testLogger = new TestLogger();

export class TestLambda {

    @handle({ logger: testLogger })
    public handle() { }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('logger test', () => {
    it('should call the setAwsRequest() method of the custom logger and handle its errors', async () => {
        const handler = lambdaEntry(TestLambda);
        const event = JSON.parse(`{ "hello": "world" }`);
        const context = { functionName: 'TestLambda' } as Context;

        const response: void | APIGatewayProxyResult = await handler(event, context, null as any as Callback);
        expect(response).toEqual({
            statusCode: 500,
            body: 'An unknown error occurred',
            headers: {
                'Content-Type': 'text/plain'
            }
        });

        expect(testLogger.logLines).toHaveLength(2);
        expect(testLogger.logLines[0]).toEqual('INFO No init method was found here, moving on...');
        expect(testLogger.logLines[1]).toEqual('ERROR setAwsRequest will throw!');

        expect(testLogger.event).toEqual(event);
        expect(testLogger.context).toEqual(context);
    });
});
