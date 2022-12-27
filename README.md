# Mijn NS TSL toolkit
This toolkit is a set of Typescript decorators and a handler wrapper that removes lots of boilerplate from vanilla Typescript Lambda (TSL) projects.

When to use?
- When building API functions that respond to AWS API Gateway calls, as this library imitates Spring in many ways. 

When **not** to use?
- When building vanilla functions that are directly invoked, since handler responses and thrown errors are automatically serialized to an appropriate HTTP response, which is not needed in such cases.

## Features
### Error handling
The below example will throw an error from the handler function, which will be caught by the errorHandler function, and turned into a 400 response entity.
```typescript
function errorHandler(on: ErrorCatcher) {

  on(err => err == null, _ => ({
      statusCode: 500,
      body: "An unknown error occurred"
  }));

  on(err => err.message == 'Oh no!', err => ({
      statusCode: 400,
      body: err.message
  }));
}

@handle({ errorHandler })
public async handle() {
  throw new Error('Oh no!');
}
```
### Injecting parameters
Extracting properties from the Lambda event and passing them to your function is streamlined like below:

#### Request Body
```typescript
// Inject the request body, null if not present
@handle 
public handle(@requestBody body: any) {
  return body;
}
```
#### Parsing request body as JSON
By default, the request body will be parsed as JSON if the request `Content-Type` header is not present, or is set to `application/json`.

To control the behaviour of parsing the request body, an optional property `parseJSON` can be passed to the `@requestBody` decorator:
```typescript
@handle
public handle(@requestBody({parseJSON: true}) body: any){
    return body;
}
```
The `parseJSON` property can be either `boolean | string | (string | undefined)[]`, supporting the following behaviour:

* `boolean`: parse as JSON, if `parseJSON === true`.
* `string`: parse as JSON, if the request `Content-Type` header is equal to the `string`.
* `(string | undefined)[]`: parse as JSON if the request `Content-Type` header matches any of the items in the array, 
  following the same rules for a `string` as above. Additionally, the array can contain `undefined` items, indicating that the request body should be parsed as well when the request `Content-Type` header is not present.  

For example:
```typescript
@handle
public handle(@requestBody({ parseJson: [ 'application/json', 'application/detail+json', undefined ] }) body: any) {
    return body;
}
```
This will parse any request body for which the request `Content-Type` header 
  is `appication/json` **OR** `text/plain` **OR** is omitted.

##### Supported content types
The `@requestBody` decorator can be augmented with a check on supported content types.
  The property for this is `contentType`. The `contentType` property can be either
  `string | (string | undefined)[]`, following the same behaviour as the `parseJSON` property.

For example:
```typescript
@handle
public handle(@requestBody({ contentType: [ 'application/json', 'text/plain', undefined ] }) body: any) {
    return body;
}
```
This will check the request `Content-Type` header against the supported content types, and allow calls for
  which the request `Content-Type` header is `application/json` **OR** `text/plain` **OR** is omitted.

Otherwise, a  `415 Unsupported Media Type` response will be generated with the error message informing the client of the
supported content types.

#### Parameter (path and query) 
```typescript
// Ex: GET /bikes/{id}/parts?filter=blue
@handle 
public handle(@pathParam('id') id: string, @queryParam('filter') filter: string) {
  return `ID: ${id}, filter: ${filter}`;
}
```

#### Authorizer context
```typescript
// Inject the authorization context, null if not present
@handle 
public handle(@authorizer auth: any) {
  return auth;
}
```

#### Lambda event
```typescript
// Inject the entire event
@handle 
public handle(@event event: any) {
  return event;
}
```

#### Lambda context
```typescript
// Inject the lambda context
@handle 
public handle(@context context: Context) {
  return context;
}
```

### Handler wrapper
For all this to work, the module file must export a `handler` property using the `lambdaEntry()` wrapper like below:
```typescript
export class MyFunction {

  private param$?: Promise<string>;

  // The method marked as @init will be called before @handle.
  // Initialization is always synchronous, so promises should be dealt with
  // in the handler function
  @init
  public init() { 
    this.param$ = httpGet('my-param');
  }

  // The method marked as @handle will be called for each request and is always asynchronous.
  // This one here will return content type "application/json" because the return value is an object, along with status code 220
  @handle({ responseCode: 220 })
  public async handle() {
    const param = await this.param$;
    return {
      param
    };
  }
}

// Define the 'handler' like so
export const handler = lambdaEntry(MyFunction);
```

### Content types
Only `application/json` and `text/plain` are properly supported out of the box.
- If a handler returns an object, it will be JSON stringified and the content type will be `application/json`. If a handler returns a string, the content type will be `text/plain`. XML is not supported, but can be implemented by returning a `ResponseEntity` instead and using your own serializer.
- Incoming request bodies are assumed to be JSON and will be parsed accordingly, unless the incoming content type is `text/plain`, in which case the request body will remain a string. If you want to send XML payloads, you may inject the `@event` into the handler and parse it yourself.


### ResponseEntity
For complete control on what status code, body and headers are sent, return a `ResponseEntity` from the handler function:
```typescript
export class MyFunction {
  
  @handle
  public async handle(): Promise<ResponseEntity> {
    return {
      statusCode: 201,
      body: { message: 'Created' },
      headers: {
        'X-Count': 10
      }
    };
  }
}
```

### Custom logging libraries
The `lambdaEntry()` wrapper itself will also do some logging, for example when errors are thrown by the handler method. This uses the `console` object by default, but can be overwritten:
```typescript
import { logger } from 'my-logging-library';

// in this example, the order of the payload and message params is swapped for the real logger
class TslLoggerAdapter implements AwsLogger {
  info(message: string, payload?: any): void {
    logger.info(payload, message);
  }
  warn(message: string, payload?: any): void {
    logger.warn(payload, message);
  }
  error(message: string, payload?: any): void {
    logger.error(payload, message);
  }

  /**
  /* This method is called before the handler at each request, 
  /* and takes the request's event and context objects.
  /* Can be used to supply the logger with dynamic properties, such as a correlation ID.
  /* But it may as well be left empty
  **/
  setAwsRequest(event: any, context: Context): void {
    logger.withRequest(event, context); 
  }

}

export const tslLoggerAdapter = new TslLoggerAdapter();
```
Register it on the `handle()` decorator:
```typescript
@handle({ logger: tslLoggerAdapter })
```

### Creating a CDK construct
The `@lambdaFunction()` decorator writes some metadata to your class definition, including basic Lambda function settings and also a `misc` property that represents a map type for any custom properties. This metadata can be defined and retrieved as follows:
```typescript
@lambdaFunction({
  name: 'MyFunction',
  entry: 'src/my-function.ts',
  timeoutMs: 5000,
  memoryMb: 128,
  misc: {
    myProperty: 20
  }
})
export class MyFunction {
  ...etc
}

StaticMetadata.get(MyFunction);
// {
//   lambdaFunctionProps {
//     name: 'MyFunction',
//     entry: 'src/my-function.ts',
//     memoryMb: 128,
//     timeoutMs: 5000,
//     misc: {
//        myProperty: 20
//     }
//   }
// }
```

### Could not detect an AWS environment. Are you running a test?
The `lambdaEntry()` wrapper will look in the environment variables to check if it is running on AWS. If you are running tests, you can bypass this by setting the `LAMBDA_TASK_ROOT` environment variable to some value before the call to `lambdaEntry()` happens. This check is needed to prevent the function initialization from immediately running when importing the module, for example during a `cdk synth`.
