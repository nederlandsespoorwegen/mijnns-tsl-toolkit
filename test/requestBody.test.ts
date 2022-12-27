import { APIGatewayProxyResult } from 'aws-lambda';
import 'jest-json';
import { ErrorCatcher, handle, lambdaEntry, requestBody } from '../src';

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

export class Default {

    @handle
    public handle(@requestBody body: any) {
        return genericReturn(body)
    }
}

export class DontParseJson {
    @handle
    public handle(@requestBody({parseJson: false}) body: any) {
        return genericReturn(body);
    }
}

export class DoParseJson {
    @handle
    public handle(@requestBody({parseJson: true}) body: any) {
        return genericReturn(body);
    }
}

export class JsonMatcher {
    @handle({ errorHandler })
    public handle(@requestBody({
        parseJson:   [
            'application/json',
            'application/detail+json'
        ],
        contentType: [
            'application/json',
            'application/detail+json',
            'application/json-with-comments' // won't be parsed as JSON by the handler, but is allowed.
        ]
    }) body: any) {
        return genericReturn(body);
    }
}

export class ContentTypeMatcher {
    @handle({ errorHandler })
    public handle(@requestBody({
        parseJson: false,
        contentType: [
            'application/json',
            'text/plain',
            undefined
        ]
    }) body: any) {
        return genericReturn(body)
    }
}

function genericReturn(body: any) {
    return {
        type: typeof body,
        body: body
    }
}

beforeAll(() => {
    process.env.LAMBDA_TASK_ROOT = '/';
});

describe('ns-lambda-kit requestBody test', () => {

    const reqBody = {
        string: 'Hello there!',
        number: 42,
        boolean: true
    }

    /*
        parseJson: application/json
     */


    const parseBodyCases = [
        { reqBody, lambda: Default, contentType: 'text/plain',                              expectedBody: { type: 'string', body: JSON.stringify(reqBody) } },
        { reqBody, lambda: Default, contentType: undefined,                                 expectedBody: { type: 'object', body: reqBody } },
        { reqBody, lambda: Default, contentType: 'application/json',                        expectedBody: { type: 'object', body: reqBody } },
        { reqBody, lambda: DontParseJson, contentType: 'application/json',                  expectedBody: { type: 'string', body: JSON.stringify(reqBody) } },
        { reqBody, lambda: DoParseJson, contentType: 'text/plain',                          expectedBody: { type: 'object', body: reqBody } },
        { reqBody, lambda: JsonMatcher, contentType: 'application/json',                    expectedBody: { type: 'object', body: reqBody } },
        { reqBody, lambda: JsonMatcher, contentType: 'application/detail+json',             expectedBody: { type: 'object', body: reqBody } },
        { reqBody, lambda: JsonMatcher, contentType: 'application/json-with-comments',      expectedBody: { type: 'string', body: JSON.stringify(reqBody) } },
        { reqBody, lambda: ContentTypeMatcher, contentType: 'application/json',             expectedBody: { type: 'string', body: JSON.stringify(reqBody) } },
        { reqBody, lambda: ContentTypeMatcher, contentType: undefined,                      expectedBody: { type: 'string', body: JSON.stringify(reqBody) } }
    ]
    it.each(parseBodyCases)('$lambda: $reqBody w/ contentType $contentType parses to body $expectedBody', async ({lambda, reqBody, contentType, expectedBody}) => {
        const handler = lambdaEntry(lambda);
        const event = {
            body: JSON.stringify(reqBody),
            headers: {}
        }
        if (contentType) {
            event.headers = {
                'Content-Type': contentType
            }
        }

        const response: void | APIGatewayProxyResult = await handler(event as any, null as any, null as any);

        expect(response).toEqual({
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json'
            },
            body: expect.jsonMatching(expectedBody)
        })
    });

    const invalidContentTypeCases = [
        { title: 'Unsupported Media Type, Content-Type required', lambda: JsonMatcher,
            contentType: 'unsupported-content-type',
            expectedResponseBody: 'Unsupported Media Type. Supported media types are: ' +
                'application/json, application/detail+json, application/json-with-comments.' },
        { title: 'Unsupported Media Type, Content-Type optional', lambda: ContentTypeMatcher,
            contentType: 'unsupported-content-type',
            expectedResponseBody: 'Unsupported Media Type. Supported media types are: ' +
                'application/json, text/plain. ' +
                'This endpoint also supports omitting the Content-Type header.' },
    ]
    it.each(invalidContentTypeCases)('$title', async ({lambda, contentType, expectedResponseBody}) => {
        const handler = lambdaEntry(lambda);
        const event = {
            body: "foo",
            headers: {
                'Content-Type': contentType
            }
        }

        const response: void | APIGatewayProxyResult = await handler(event as any, null as any, null as any);
        expect(response).toEqual({
            statusCode: 415,
            body: expectedResponseBody,
            headers: {
                'Content-Type': 'text/plain'
            }
        })
    });

});
