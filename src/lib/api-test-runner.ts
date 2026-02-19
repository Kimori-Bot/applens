/**
 * API Test Runner - Execute REST API tests with validation
 */

export interface ApiTestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  url: string;
  headers?: Record<string, string>;
  body?: string | object | FormData;
  expectedStatus?: number;
  expectedResponseContains?: string;
  expectedResponseTime?: number;
  expectedJsonSchema?: object;
}

export interface ApiTestResult {
  success: boolean;
  statusCode: number;
  statusText: string;
  responseTime: number;
  responseBody: string;
  responseBodyJson?: object;
  responseHeaders: Record<string, string>;
  validations: ValidationResult[];
  error?: string;
}

export interface ValidationResult {
  type: 'status' | 'contains' | 'responseTime' | 'jsonSchema';
  passed: boolean;
  expected?: any;
  actual?: any;
  message: string;
}

export interface ChainedTestResult {
  results: ApiTestResult[];
  variables: Record<string, any>;
  success: boolean;
}

/**
 * Execute a single API test with validations
 */
export async function runApiTest(
  options: ApiTestOptions,
  variables: Record<string, any> = {}
): Promise<ApiTestResult> {
  const validations: ValidationResult[] = [];
  const startTime = Date.now();
  
  try {
    const resolvedUrl = resolveVariables(options.url, variables);
    const resolvedHeaders = resolveVariablesInObject(options.headers || {}, variables);
    const resolvedBody = options.body 
      ? resolveVariables(typeof options.body === 'string' ? options.body : JSON.stringify(options.body), variables)
      : undefined;

    const fetchOptions: RequestInit = {
      method: options.method,
      headers: resolvedHeaders,
    };

    if (resolvedBody && !['GET', 'HEAD'].includes(options.method)) {
      fetchOptions.body = resolvedBody;
      if (!resolvedHeaders['Content-Type']) {
        fetchOptions.headers = {
          ...fetchOptions.headers,
          'Content-Type': 'application/json',
        };
      }
    }

    const response = await fetch(resolvedUrl, fetchOptions);
    const responseTime = Date.now() - startTime;
    const responseBody = await response.text();
    
    let responseBodyJson: object | undefined;
    try {
      responseBodyJson = JSON.parse(responseBody);
    } catch {
      // Not JSON
    }

    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    if (options.expectedStatus !== undefined) {
      validations.push({
        type: 'status',
        passed: response.status === options.expectedStatus,
        expected: options.expectedStatus,
        actual: response.status,
        message: response.status === options.expectedStatus
          ? 'Status code matches expected'
          : 'Status code does not match expected',
      });
    }

    if (options.expectedResponseContains !== undefined) {
      const resolvedExpected = resolveVariables(options.expectedResponseContains, variables);
      validations.push({
        type: 'contains',
        passed: responseBody.includes(resolvedExpected),
        expected: resolvedExpected,
        actual: responseBody.substring(0, 500),
        message: responseBody.includes(resolvedExpected)
          ? 'Response contains expected text'
          : 'Response does not contain expected text',
      });
    }

    if (options.expectedResponseTime !== undefined) {
      validations.push({
        type: 'responseTime',
        passed: responseTime < options.expectedResponseTime,
        expected: options.expectedResponseTime + 'ms',
        actual: responseTime + 'ms',
        message: responseTime < options.expectedResponseTime
          ? 'Response time within threshold'
          : 'Response time exceeds threshold',
      });
    }

    if (options.expectedJsonSchema && responseBodyJson) {
      const schemaValidation = validateJsonSchema(responseBodyJson, options.expectedJsonSchema);
      validations.push({
        type: 'jsonSchema',
        passed: schemaValidation.valid,
        expected: options.expectedJsonSchema,
        actual: responseBodyJson,
        message: schemaValidation.message,
      });
    }

    const allPassed = validations.length === 0 || validations.every(v => v.passed);

    return {
      success: allPassed,
      statusCode: response.status,
      statusText: response.statusText,
      responseTime,
      responseBody,
      responseBodyJson,
      responseHeaders,
      validations,
    };
  } catch (error) {
    return {
      success: false,
      statusCode: 0,
      statusText: 'Error',
      responseTime: Date.now() - startTime,
      responseBody: '',
      responseHeaders: {},
      validations,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Run multiple API tests in sequence with variable chaining
 */
export async function runChainedApiTests(
  tests: ApiTestOptions[],
  initialVariables: Record<string, any> = {}
): Promise<ChainedTestResult> {
  const results: ApiTestResult[] = [];
  const variables = { ...initialVariables };
  let allSuccess = true;

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    const result = await runApiTest(test, variables);
    results.push(result);

    if (!result.success) {
      allSuccess = false;
      break;
    }

    if (result.responseBodyJson && typeof result.responseBodyJson === 'object') {
      variables['response_' + (i + 1)] = result.responseBodyJson;
      
      const r = result.responseBodyJson as Record<string, any>;
      if (r.id !== undefined) {
        variables['id_' + (i + 1)] = r.id;
      }
      if (r.token !== undefined) {
        variables['token'] = r.token;
      }
      if (r.data !== undefined) {
        variables['data'] = r.data;
      }
    }
    
    variables['status_' + (i + 1)] = result.statusCode;
    variables['lastResponse'] = result.responseBodyJson || result.responseBody;
  }

  return {
    results,
    variables,
    success: allSuccess,
  };
}

function resolveVariables(str: string, variables: Record<string, any>): string {
  return str.replace(/\{\{(\w+)\}\}/g, function(match, key) {
    return variables[key] !== undefined ? String(variables[key]) : match;
  });
}

function resolveVariablesInObject(
  obj: Record<string, string>,
  variables: Record<string, any>
): Record<string, string> {
  const resolved: Record<string, string> = {};
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    resolved[key] = resolveVariables(obj[key], variables);
  }
  return resolved;
}

function validateJsonSchema(data: any, schema: any): { valid: boolean; message: string } {
  try {
    if (schema.required && Array.isArray(schema.required)) {
      for (let i = 0; i < schema.required.length; i++) {
        const field = schema.required[i];
        if (data[field] === undefined) {
          return { valid: false, message: 'Missing required field: ' + field };
        }
      }
    }

    if (schema.properties) {
      const propKeys = Object.keys(schema.properties);
      for (let i = 0; i < propKeys.length; i++) {
        const key = propKeys[i];
        if (data[key] !== undefined) {
          const prop = schema.properties[key];
          const value = data[key];

          if (prop.type) {
            const actualType = Array.isArray(value) ? 'array' : typeof value;
            if (actualType !== prop.type) {
              return { 
                valid: false, 
                message: 'Field "' + key + '" has type "' + actualType + '", expected "' + prop.type + '"'
              };
            }
          }
        }
      }
    }

    return { valid: true, message: 'JSON schema validation passed' };
  } catch (error) {
    return { 
      valid: false, 
      message: 'Schema validation error: ' + (error instanceof Error ? error.message : String(error))
    };
  }
}
