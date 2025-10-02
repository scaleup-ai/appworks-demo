import axiosClient from './axios-client';
import { AuthStorage } from '../store/slices/auth.slice';
import BACKEND_ROUTES from '../router/backend.routes';

export enum HealthApiRoutes {
  // Main healthcheck endpoints  
  HEALTHCHECK = '/api/v1/healthcheck',
  HEALTHCHECK_METRICS = '/api/v1/healthcheck/metrics',
  HEALTHCHECK_PROVIDERS = '/api/v1/healthcheck/providers',

  // Demo health endpoint
  DEMO_HEALTH = '/api/v1/demo/health',
}

export interface HealthCheckResponse {
  status?: string;
  timestamp?: string;
  version?: string;
  uptime?: number;
}

export interface DemoHealthResponse {
  ok: boolean;
}

export interface MetricsResponse {
  [key: string]: unknown;
}

export interface ProvidersHealthResponse {
  [providerName: string]: {
    status: 'healthy' | 'unhealthy' | 'unknown';
    lastCheck?: string;
    error?: string;
  };
}

export interface HealthCheckResult {
  endpoint: string;
  status: 'ok' | 'error';
  message?: string;
}

export async function checkMainHealth(): Promise<HealthCheckResponse> {
  const response = await axiosClient.get(HealthApiRoutes.HEALTHCHECK);
  return response.data;
}

export async function checkDemoHealth(): Promise<DemoHealthResponse> {
  const response = await axiosClient.get(HealthApiRoutes.DEMO_HEALTH);
  return response.data;
}

export async function getMetrics(): Promise<MetricsResponse> {
  const response = await axiosClient.get(HealthApiRoutes.HEALTHCHECK_METRICS);
  return response.data;
}

export async function getProvidersHealth(): Promise<ProvidersHealthResponse> {
  const response = await axiosClient.get(HealthApiRoutes.HEALTHCHECK_PROVIDERS);
  return response.data;
}

export async function healthCheckAllServices(): Promise<HealthCheckResult[]> {
  const results: HealthCheckResult[] = [];

  // Check main healthcheck endpoint
  try {
    await checkMainHealth();
    results.push({ endpoint: HealthApiRoutes.HEALTHCHECK, status: 'ok' });
  } catch (error) {
    results.push({
      endpoint: HealthApiRoutes.HEALTHCHECK,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Check demo health endpoint
  try {
    await checkDemoHealth();
    results.push({ endpoint: HealthApiRoutes.DEMO_HEALTH, status: 'ok' });
  } catch (error) {
    results.push({
      endpoint: HealthApiRoutes.DEMO_HEALTH,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Check collections endpoint (just test if endpoint exists)
  try {
    const collectionsUrl = BACKEND_ROUTES?.accountsReceivables?.collectionsScheduled || '/api/v1/collections/scheduled';
    await axiosClient.get(collectionsUrl);
    results.push({ endpoint: collectionsUrl, status: 'ok' });
  } catch (error) {
    const collectionsUrl = BACKEND_ROUTES?.accountsReceivables?.collectionsScheduled || '/api/v1/collections/scheduled';
    results.push({
      endpoint: collectionsUrl,
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Check Xero integration endpoint
  try {
    // Defensive header in case localStorage/Redux is not hydrated yet.
    try {
      const xeroUrl = BACKEND_ROUTES?.xero?.integrationStatus || '/api/v1/xero/integration/status';
      const selected = AuthStorage && typeof AuthStorage.getSelectedOpenIdSub === 'function' ? AuthStorage.getSelectedOpenIdSub() : null;
      if (selected) {
        await axiosClient.get(xeroUrl, { headers: { 'X-Openid-Sub': String(selected) } });
      } else {
        await axiosClient.get(xeroUrl);
      }
    } catch {
      const xeroUrl = BACKEND_ROUTES?.xero?.integrationStatus || '/api/v1/xero/integration/status';
      // fallback to plain request
      await axiosClient.get(xeroUrl);
    }
    results.push({ endpoint: BACKEND_ROUTES?.xero?.integrationStatus || '/api/v1/xero/integration/status', status: 'ok' });
  } catch (error) {
    results.push({
      endpoint: '/api/v1/xero/integration/status',
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

export default {
  checkMainHealth,
  checkDemoHealth,
  getMetrics,
  getProvidersHealth,
  healthCheckAllServices,
};
