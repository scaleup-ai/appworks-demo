import axiosClient from './axios-client';
import { CollectionsReminderEvent } from '../types/api.types';

export async function startCollections(): Promise<void> {
  const response = await axiosClient.post('/api/v1/collections/start');
  return response.data;
}

export async function stopCollections(): Promise<void> {
  const response = await axiosClient.post('/api/v1/collections/stop');
  return response.data;
}

export async function triggerScan(): Promise<void> {
  const response = await axiosClient.post('/api/v1/collections/scan');
  return response.data;
}

export async function getScheduledReminders(): Promise<CollectionsReminderEvent[]> {
  const response = await axiosClient.get<CollectionsReminderEvent[]>('/api/v1/collections/scheduled');
  return response.data;
}

export default {
  startCollections,
  stopCollections,
  triggerScan,
  getScheduledReminders,
};