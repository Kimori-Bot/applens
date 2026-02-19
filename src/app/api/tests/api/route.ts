import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { runApiTest, runChainedApiTests, ApiTestOptions, ChainedTestResult } from '@/lib/api-test-runner';

// POST /api/tests/api - Run a single API test or chained API tests
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      method,
      url,
      headers,
      body: requestBody,
      expectedStatus,
      expectedResponseContains,
      expectedResponseTime,
      expectedJsonSchema,
      // Chained tests support
      tests,
      variables,
      // Database options
      appId,
      companyId,
      name,
      saveResult = false,
    } = body;

    // Handle chained tests
    if (tests && Array.isArray(tests) && tests.length > 0) {
      const chainedResult: ChainedTestResult = await runChainedApiTests(
        tests as ApiTestOptions[],
        variables || {}
      );

      // Save to database if requested
      if (saveResult && appId) {
        await saveTestResult({
          appId,
          companyId,
          name: name || 'Chained API Test',
          testType: 'api',
          result: chainedResult,
        });
      }

      return NextResponse.json({
        success: chainedResult.success,
        type: 'chained',
        totalTests: tests.length,
        passedTests: chainedResult.results.filter(r => r.success).length,
        failedTests: chainedResult.results.filter(r => !r.success).length,
        results: chainedResult.results,
        variables: chainedResult.variables,
      });
    }

    // Single test
    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    const testOptions: ApiTestOptions = {
      method: method || 'GET',
      url,
      headers: headers || {},
      body: requestBody,
      expectedStatus,
      expectedResponseContains,
      expectedResponseTime,
      expectedJsonSchema,
    };

    const result = await runApiTest(testOptions, variables || {});

    // Save to database if requested
    if (saveResult && appId) {
      await saveTestResult({
        appId,
        companyId,
        name: name || `API Test: ${method} ${url}`,
        testType: 'api',
        result,
      });
    }

    return NextResponse.json({
      success: result.success,
      type: 'single',
      statusCode: result.statusCode,
      statusText: result.statusText,
      responseTime: result.responseTime,
      responseBody: result.responseBody,
      responseBodyJson: result.responseBodyJson,
      responseHeaders: result.responseHeaders,
      validations: result.validations,
      error: result.error,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// Helper to save test results to database
async function saveTestResult({
  appId,
  companyId,
  name,
  testType,
  result,
}: {
  appId?: number;
  companyId?: number;
  name: string;
  testType: string;
  result: any;
}) {
  try {
    const { error } = await supabase.from('test_runs').insert({
      app_id: appId,
      status: result.success ? 'completed' : 'failed',
      total_commands: Array.isArray(result.results) ? result.results.length : 1,
      passed_commands: Array.isArray(result.results) 
        ? result.results.filter((r: any) => r.success).length 
        : (result.success ? 1 : 0),
      failed_commands: Array.isArray(result.results)
        ? result.results.filter((r: any) => !r.success).length
        : (result.success ? 0 : 1),
      results: {
        name,
        testType,
        ...result,
      },
      completed_at: new Date().toISOString(),
    });

    if (error) {
      console.error('Failed to save test result:', error);
    }
  } catch (err) {
    console.error('Error saving test result:', err);
  }
}
