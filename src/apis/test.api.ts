import axiosClient from './axios-client';

export enum TestApiRoutes {
  DEMO_HEALTH = '/api/v1/demo/health',
  HEALTHCHECK = '/api/v1/healthcheck',
}

export async function testConnection(): Promise<{ status: string; message: string }> {
  try {
    // Test the demo health endpoint first
    const response = await axiosClient.get(TestApiRoutes.DEMO_HEALTH);
    return {
      status: 'success',
      message: `Connected successfully. Demo health: ${JSON.stringify(response.data)}`,
    };
  } catch (error) {
    console.error('Failed to connect to demo health endpoint:', error);

    try {
      // Try the main healthcheck endpoint
      const response = await axiosClient.get(TestApiRoutes.HEALTHCHECK);
      return {
        status: 'success',
        message: `Connected to main healthcheck. Response: ${JSON.stringify(response.data)}`,
      };
    } catch {
      return {
        status: 'error',
        message: `Failed to connect to backend. Please ensure the backend is running on localhost:8098. Error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }
}

export default {
  testConnection,
};
