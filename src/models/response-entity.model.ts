import { APIGatewayProxyResult } from "aws-lambda";

export interface ResponseEntity {
    statusCode: number;
    body: any;
    headers?: { [header: string]: string };
}

export function toApiGatewayProxyResult(responseEntity: ResponseEntity): APIGatewayProxyResult {
    const returnValue = {
        statusCode: responseEntity.statusCode,
        headers: responseEntity.headers || {}
    } as APIGatewayProxyResult;

    if (typeof responseEntity.body !== 'string') {
        returnValue.body = JSON.stringify(responseEntity.body);
        if (returnValue.headers!['Content-Type'] == null) {
            returnValue.headers!['Content-Type'] = 'application/json';
        }
    } else {
        returnValue.body = responseEntity.body;
        if (returnValue.headers!['Content-Type'] == null) {
            returnValue.headers!['Content-Type'] = 'text/plain';
        }
    }

    return returnValue;
}

export function isValidResponseEntity(obj: any): boolean {
    if (obj == null || typeof obj !== 'object') {
        return false;
    } else {
        const keys = Object.keys(obj);
        return (keys.length === 2 || keys.length === 3)
            && obj.statusCode != null && !isNaN(obj.statusCode)
            && obj.body != null;
    }
}
