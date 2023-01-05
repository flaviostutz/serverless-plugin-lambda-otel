'use strict';

// Lambda OTEL Layer Versions
// see latest versions at https://github.com/aws-observability/aws-otel-lambda
const layerVersions = require('./layerVersions.json');

const xRayDaemonManagedPolicy = 'arn:aws:iam::aws:policy/AWSXRayDaemonWriteAccess';

/**
 * Serverless Lambda OTEL Plugin - serverless-plugin-lambda-otel
 * @class AddLambdaOTEL
 */
class AddLambdaOTEL {
  /**
   * AddLambdaOTEL constructor
   * This class gets instantiated with a serverless object and a bunch of options.
   * @param  {object} serverless The serverless instance which enables access to global service config during
   */
  constructor(serverless) {
    this.serverless = serverless;
    this.service = this.serverless.service;
    this.provider = this.serverless.getProvider('aws');
    this.hooks = {
      'before:package:setupProviderConfiguration': this.instrumentFunctions.bind(this),
    };
    if (this.checkValidationSupport(serverless)) {
      serverless.configSchemaHandler.defineFunctionProperties('aws', {
        properties: {
          otelEnable: {type: 'boolean'},
          otelVersion: {type: 'string'},
        },
      });

      serverless.configSchemaHandler.defineCustomProperties({
        properties: {
          lambdaOTEL: {
            type: 'object',
            properties: {
              enable: {type: 'boolean'},
              version: {type: 'string'},
              xrayPolicy: {type: 'boolean'},
            },
          },
        },
      });
    }
  }

  /**
   * Validates serverless object has required validation fields
   * @param {any} serverless
   * @return {boolean} Whether installed serverless fw supports validation
   */
  checkValidationSupport(serverless) {
    return serverless.configSchemaHandler &&
             serverless.configSchemaHandler.defineFunctionProperties &&
             typeof serverless.configSchemaHandler['defineFunctionProperties'] == 'function' &&
             serverless.configSchemaHandler.defineCustomProperties &&
             typeof serverless.configSchemaHandler['defineCustomProperties'] == 'function';
  }

  /**
   * Attach Lambda Layer conditionally to each function
   */
  async instrumentFunctions() {
    if (typeof this.service.functions !== 'object') {
      return;
    }

    let policyToggle = false;
    const functions = Object.keys(this.service.functions);
    for (const functionName of functions) {
      const fn = this.service.functions[functionName];

      const fconfig = this.getFunctionConfig(fn);

      if (!fconfig.otelEnable) {
        continue;
      }

      // layer architecture
      let layerArchitecture = 'amd64';
      if ((!fn.architecture && this.service.provider.architecture === 'arm64') || fn.architecture === 'arm64') {
        layerArchitecture = 'arm64';
      }

      // layer runtime
      const layerRuntime = this.getLayerRuntime(fn);

      // attach OTEL Lambda Layer
      const layerARN = await this.generateLayerARN(layerRuntime, layerArchitecture, fconfig.otelVersion);
      fn.layers = fn.layers || [];
      fn.layers.push(layerARN);

      // add ENV variable
      if (layerRuntime == 'nodejs' || layerRuntime == 'java-wrapper') {
        fn.environment = fn.environment || {};
        fn.environment.AWS_LAMBDA_EXEC_WRAPPER = '/opt/otel-handler';
      } else if (layerRuntime == 'python') {
        fn.environment = fn.environment || {};
        fn.environment.AWS_LAMBDA_EXEC_WRAPPER = '/opt/otel-instrument';
      }

      policyToggle = true;
    };

    // xray policy attachment
    const customConfig = this.getCustomConfig();
    if (policyToggle && customConfig.xrayPolicy) {
      // attach XRay managed policy to this function
      this.service.provider.iamManagedPolicies =
      this.service.provider.iamManagedPolicies || [];
      this.service.provider.iamManagedPolicies.push(xRayDaemonManagedPolicy);
    }
    return;
  }


  /**
   * Generates a valid Lambda OTEL Layer ARN for your Region
   * @param  {string} layerRuntime Layer runtime
   * @param  {string} layerArchitecture Layer architecture
   * @param  {string} layerVersion Custom layer version
   * @return {string} Lambda OTEL Layer ARN
   */
  async generateLayerARN(layerRuntime, layerArchitecture, layerVersion) {
    let version = layerVersion;
    if (!version) {
      version = layerVersions[layerRuntime];
    }

    const region = this.provider.getRegion();
    // eslint-disable-next-line max-len
    const layerArn = `arn:aws:lambda:${region}:901920570463:layer:aws-otel-${layerRuntime}-${layerArchitecture}-ver-${version}:1`;

    // check if custom version of this layer actually exists
    if (layerVersion) {
      try {
        const layerVersionInfo = await this.provider.request('Lambda', 'getLayerVersionByArn', {Arn: layerArn});
        return layerVersionInfo.LayerVersionArn;
      } catch (err) {
        if (err.code==='AccessDeniedException') {
          throw new Error(
              `LambdaOTEL layer '${layerArn}' doesn't exist. Check the provided version.`);
        } else {
          throw err;
        }
      }
    }

    return layerArn;
  };

  /**
   * Computer the layer runtime from Serverless runtime to OTEL layer runtime
   * @param {*} slsFunction
   * @return {string} Layer runtime name
   */
  getLayerRuntime(slsFunction) {
    let slsRuntime = 'nodejs12.x';
    if (slsFunction.runtime) {
      slsRuntime = slsFunction.runtime;
    } else if (this.service.provider && this.service.provider.runtime) {
      slsRuntime = this.service.provider.runtime;
    }
    if (slsRuntime.startsWith('nodejs')) {
      return 'nodejs';
    }
    if (slsRuntime.startsWith('java')) {
      return 'java-wrapper';
    }
    if (slsRuntime.startsWith('python')) {
      return 'python';
    }
    return 'collector';
  }

  /**
   * Gets global configuration for this plugin in custom section. It validates inputs and sets default values.
   * @return {object} An object with attributes {defaultEnable:boolean, xrayPolicy:boolean}
   */
  getCustomConfig() {
    let enable = false;
    let layerVersion = null;
    let xrayPolicy = true;

    const customLambdaOTEL = this.service.custom && this.service.custom.lambdaOTEL;

    if (customLambdaOTEL) {
      if (customLambdaOTEL.hasOwnProperty('enable')) {
        if (typeof customLambdaOTEL.enable !== 'boolean') {
          throw new Error('custom.lambdaOTEL.enable must be boolean');
        }
        enable = customLambdaOTEL.enable;
      }

      if (customLambdaOTEL.hasOwnProperty('version')) {
        if (typeof customLambdaOTEL.version !== 'string') {
          throw new Error('custom.lambdaOTEL.version must be string');
        }
        layerVersion = customLambdaOTEL.version;
      }

      if (customLambdaOTEL.hasOwnProperty('xrayPolicy')) {
        if (typeof customLambdaOTEL.xrayPolicy !== 'boolean') {
          throw new Error('custom.lambdaOTEL.xrayPolicy must be boolean');
        }
        xrayPolicy = customLambdaOTEL.xrayPolicy;
      }
    }

    return {
      enable: enable,
      xrayPolicy: xrayPolicy,
      layerVersion: layerVersion,
    };
  }

  /**
   * Calculates the configuration for a specific function.
   * Gets default values from custom.lambdaOTEL configurations if needed.
   * @param {func} slsFunction function object provided by Serverless Framework
   * @return {object} { otelEnable: boolean, otelVersion: string, otelXRayPolicy: boolean }
   */
  getFunctionConfig(slsFunction) {
    const customConfig = this.getCustomConfig();

    let otelEnable = customConfig.enable;
    let otelVersion = customConfig.layerVersion;

    if (slsFunction.hasOwnProperty('otelEnable')) {
      if (typeof slsFunction.otelEnable !== 'boolean') {
        throw new Error('[function].otelEnable must be boolean');
      }
      otelEnable = slsFunction.otelEnable;
    }

    if (slsFunction.hasOwnProperty('otelVersion')) {
      if (typeof slsFunction.otelVersion !== 'string') {
        throw new Error('[function].otelVersion must be string');
      }
      otelVersion = slsFunction.otelVersion;
    }

    return {
      otelEnable: otelEnable,
      otelVersion: otelVersion,
    };
  }
}

module.exports = AddLambdaOTEL;
