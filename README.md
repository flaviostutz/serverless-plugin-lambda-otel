# serverless-plugin-lambda-otel

A Serverless Framework plugin for enabling AWS OTEL Lambda layer on Lambda services

![npm](https://img.shields.io/npm/v/serverless-plugin-lambda-otel)
<!-- ![npm](https://img.shields.io/npm/dw/serverless-plugin-lambda-otel) -->

Enables AWS Lambda OTEL Layer (https://aws.amazon.com/blogs/mt/introducing-cloudwatch-lambda-insights/) for the entire Serverless stack functions or individual functions.

By default, enabling this plugin will add the AWS OTEL layer, which will instrument your code and export traces to X-Ray. If you want to use this layer for exporting traces to other providers, such as Prometheus, Datadog etc, check the layer documentation on how to configure custom exporters (https://aws-otel.github.io/docs/getting-started/lambda).

This plugin implements the instructions as can be found at https://aws-otel.github.io/docs/getting-started/lambda/lambda-js

(This plugin was highly inspired on https://github.com/awslabs/serverless-plugin-lambda-insights)

## Why use AWS OTEL Lambda layer

You can use this AWS Layer on your Lambda services so they can generate and publish OTEL traces for dependencies called within your Lambda function without manual instrumentation. For example, after using it, X-Ray traces dashboard will show segments related to external APIs your NodeJS based Lambda service is calling along with its latency, number of calls and status.

![AWS OTEL Lambda](https://github.com/aws-observability/aws-otel-lambda)

---

## Getting started

### Installation

This Plugin requires a Serverless Framework version of >= 2.0.0.

`npm install --save-dev serverless-plugin-lambda-otel`

add Plugin to your `serverless.yml` in the plugins section.

### Minimal Usage

Example `serverless.yml`:

```yaml
provider:
  name: aws
  tracing:
    apiGateway: true
    lambda: true

plugins:
  - serverless-plugin-lambda-otel

functions:
  hello:
    handler: handler.hello

custom:
  lambdaOTEL:
    enable: true
```

- With this configuration you will enable OTEL layer and X-Ray tracing by default on all the functions

### Functionality

The plugin will enable Lambda OTEL instrumentation by adding a Lambda Layer ([see Layer Details and Versions](https://aws-otel.github.io/docs/getting-started/lambda)) and adding necessary permissions for making X-Ray traces work out-of-the-box.

You can check in your AWS Console:
go to AWS Lambda -> select your Lambda function -> Layers

### Usage

Example `serverless.yml`:

```yaml
service: your-great-sls-service

provider:
  name: aws
  stage: dev
  tracing:
    apiGateway: true #for enabling X-Ray tracing (nor required if not using X-Ray)
    lambda: true #for enabling X-Ray tracing (nor required if not using X-Ray)

plugins:
  - serverless-plugin-lambda-otel

functions:
  mainFunction: #inherits tracing settings from "provider"
    otelEnable: true # defaults to custom.lambdaOTEL.enable
    otelVersion: '1-7-0' # defaults to custom.lambdaOTEL.version
    handler: src/app/index.handler
  secondFunction: #inherits tracing settings from "provider"
    otelEnable: false #explicitly disable AWS OTEL Layer for this function (this will override default settings)
    handler: src/app/index.handler

custom:
  lambdaOTEL:
    enable: true # enables Lambda OTEL layer for all your functions. defaults to false
    version: '1-8-0' # defaults to the latest version for the specific runtime (nodejs, python, java or collector) when the plugin was published
    xrayPolicy: false # attach X-Ray Managed Policy to functions. defaults to true
```

### Example

You can find an example in the example folder of this repository. Run it with the following command.

`cd example; serverless deploy`

- This will deploy a hello-world Lambda function with Lambda OTEL layer enabled, which will give you X-Ray instrumentation by default.

- After the deployment, call the endpoint URL that is displayed

```sh
curl https://[SOMETHING].execute-api.us-east-1.amazonaws.com/dev/hello
```

- It should return a random user data, which was gotten from the service https://randomuser.me/api/

- Open the AWS Console and check X-Ray traces. You should be able to inspect the calls to your service and to randomuser.me apis (the tracing to the external API is only possible due to the OTEL layer instrumentation)

---

## Want to contribute?

This is your repo - just go head and create a pull request. See also [CONTRIBUTING](CONTRIBUTING.md) for more introductions.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT License. See the [LICENSE](LICENSE) file.
