/* eslint-disable max-len */
const AddLambdaOTEL = require('./index');
const versions = require('./layerVersions');

const nodejsVersion = versions['nodejs'];
const collectorVersion = versions['collector'];

test('AddLambdaOTEL associates latest ARN', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-${nodejsVersion}:1`]);
});

test('AddLambdaOTEL doesnt add layer when disabled by default', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.custom.lambdaOTEL.enable = false;
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers).toBeUndefined();
  expect(plugin.serverless.service.functions.myFunction2.layers).toBeUndefined();
});

test('AddLambdaOTEL doesnt add layer when disabled for specific function', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.functions.myFunction.otelEnable = false;
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers).toBeUndefined();
  expect(plugin.serverless.service.functions.myFunction2.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-${nodejsVersion}:1`]);
});


test('AddLambdaOTEL adds OTEL ENV variable to enabled functions for nodejs and java', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.environment).toBeDefined();
  expect(plugin.serverless.service.functions.myFunction.environment.AWS_LAMBDA_EXEC_WRAPPER)
      .toEqual('/opt/otel-handler');
});

test('AddLambdaOTEL adds OTEL ENV variable to enabled functions for python', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.functions.myPythonFunction = {
    handler: 'handler.hello',
    runtime: 'python2.7',
    architecture: 'arm64',
  };
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.environment).toBeDefined();
  expect(plugin.serverless.service.functions.myFunction.environment.AWS_LAMBDA_EXEC_WRAPPER)
      .toEqual('/opt/otel-handler');

  expect(plugin.serverless.service.functions.myPythonFunction.environment).toBeDefined();
  expect(plugin.serverless.service.functions.myPythonFunction.environment.AWS_LAMBDA_EXEC_WRAPPER)
      .toEqual('/opt/otel-instrument');
});


test('AddLambdaOTEL associates latest ARN for golang global', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.provider.runtime = 'go1.x';

  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-collector-amd64-ver-${collectorVersion}:1`]);
});


test('AddLambdaOTEL associates latest ARN for golang in specific function', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.functions.myGolangFunction = {
    handler: 'handler.hello',
    runtime: 'go1.x',
    architecture: 'arm64',
  };
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-${nodejsVersion}:1`]);
  expect(plugin.serverless.service.functions.myGolangFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-collector-arm64-ver-${collectorVersion}:1`]);
});


test('generateLayerArn defaults to global provider architecture to associates latest ARN for Arm64', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.provider.architecture = 'arm64';
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-arm64-ver-${nodejsVersion}:1`]);
});

test('generateLayerArn local function architecture overwrites global setting to associates latest ARN for Arm64', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.functions.myFunction.architecture = 'arm64';
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-arm64-ver-${nodejsVersion}:1`]);
});

test('generateLayerArn supports multi architecture setting to associate latest ARN', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.functions.myArm64Function = {
    handler: 'handler.hello',
    architecture: 'arm64',
  };
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-${nodejsVersion}:1`]);
  expect(plugin.serverless.service.functions.myArm64Function.layers)
      .toStrictEqual([`arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-arm64-ver-${nodejsVersion}:1`]);
});

test('AddLambdaOTEL associates correct global layer version', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.custom.lambdaOTEL.version = '2-2-2';
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-2-2-2:1']);
});

test('AddLambdaOTEL associates correct specific function layer version', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.custom.lambdaOTEL.version = '2-2-2';
  serverless.service.functions.myFunction.otelVersion = '3-3-3';
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.serverless.service.functions.myFunction.layers)
      .toStrictEqual(['arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-3-3-3:1']);
});

test('AddLambdaOTEL throws invalid otel version argument', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.custom.lambdaOTEL.version = 9999;
  const plugin = new AddLambdaOTEL(serverless);

  // act
  const task = () => plugin.instrumentFunctions();

  // assert
  await expect(task).rejects
      .toThrow('custom.lambdaOTEL.version must be string');
});

test('AddLambdaOTEL throws for inexistent version', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.custom.lambdaOTEL.version = '9-9-9';
  const plugin = new AddLambdaOTEL(serverless);

  // act
  const task = () => plugin.instrumentFunctions();

  // assert
  await expect(task).rejects
      .toThrow(/.*doesn\'t exist. Check the provided version/);
});


test('AddLambdaOTEL adds IAM policy', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.service.provider.iamManagedPolicies)
      .toStrictEqual(['arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess']);
});


test('AddLambdaOTEL doesnt add IAM policy', async () => {
  // arrange
  const serverless = createMockServerless('us-east-1');
  serverless.service.custom.lambdaOTEL.xrayPolicy = false;
  const plugin = new AddLambdaOTEL(serverless);

  // act
  await plugin.instrumentFunctions();

  // assert
  expect(plugin.service.provider.iamManagedPolicies)
      .toBeUndefined();
});


const createMockServerless = (region) => {
  const awsProvider = {
    getRegion: () => region,
    request: async (service, method, param) => {
      // mock this to only validate a specific Arn
      if (param.Arn == `arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-2-2-2:1` ||
        param.Arn == `arn:aws:lambda:us-east-1:901920570463:layer:aws-otel-nodejs-amd64-ver-3-3-3:1`) {
        return {LayerVersionArn: param.Arn};
      } else {
        const customError = new Error();
        customError.code = 'AccessDeniedException';
        throw customError;
      }
    },
  };
  return {
    getProvider: () => awsProvider,
    configSchemaHandler: {
      defineFunctionProperties: () => jest.fn(),
      defineCustomProperties: () => jest.fn(),
    },
    service: {
      provider: {
        name: 'aws',
        runtime: 'nodejs12.x',
        architecture: 'x86_64',
      },
      custom: {
        lambdaOTEL: {
          enable: true,
        },
      },
      functions: {
        myFunction: {
          handler: 'handler.hello',
        },
        myFunction2: {
          handler: 'handler.hello',
        },
      },
    },
  };
};
