import { CollectionsReminderEvent } from '../types/api.types';
import axiosClient from './axios-client';

export enum CollectionsApiRoutes {
  BASE = '/api/v1/collections',
  START = '/api/v1/collections/start',
  STOP = '/api/v1/collections/stop',
  SCAN = '/api/v1/collections/scan',
  SCHEDULED = '/api/v1/collections/scheduled',
}

export async function startCollections(): Promise<void> {
  await axiosClient.post(CollectionsApiRoutes.START);
}

export async function stopCollections(): Promise<void> {
  await axiosClient.post(CollectionsApiRoutes.STOP);
}

export async function triggerScan(): Promise<{ status: string }> {
  const response = await axiosClient.post(CollectionsApiRoutes.SCAN);
  return response.data;
}

export async function getScheduledReminders(): Promise<CollectionsReminderEvent[]> {
  const response = await axiosClient.get(CollectionsApiRoutes.SCHEDULED);
  return response.data;
}

export default {
  startCollections,
  stopCollections,
  triggerScan,
  getScheduledReminders,
};