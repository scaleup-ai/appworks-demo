import { CollectionsReminderEvent } from '../types/api.types';
import axiosClient from './axios-client';

export enum CollectionsApiRoutes {
  // Deprecated: collections endpoints renamed/removed in OpenAPI. Keep constants
  // so code will compile, but throw at runtime to force a migration.
  BASE = '/api/v1/collections',
  START = '/api/v1/collections/start',
  STOP = '/api/v1/collections/stop',
  SCAN = '/api/v1/collections/scan',
  SCHEDULED = '/api/v1/collections/scheduled',
}

export async function startCollections(): Promise<void> {
  throw new Error('startCollections: collections API removed in OpenAPI update; migrate to the new Xero-backed flows')
}

export async function stopCollections(): Promise<void> {
  throw new Error('stopCollections: collections API removed in OpenAPI update; migrate to the new Xero-backed flows')
}

export async function triggerScan(): Promise<void> {
  throw new Error('triggerScan: collections API removed in OpenAPI update; migrate to the new Xero-backed flows')
}

export async function getScheduledReminders(): Promise<CollectionsReminderEvent[]> {
  throw new Error('getScheduledReminders: collections API removed in OpenAPI update; migrate to the new Xero-backed flows')
}

export default {
  startCollections,
  stopCollections,
  triggerScan,
  getScheduledReminders,
};