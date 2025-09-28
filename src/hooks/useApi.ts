import { useState } from 'react';
import { apiErrorToast } from '../handlers/shared.handler';
import showToast from '../utils/toast';

type ApiFunc<T extends unknown[], R> = (...args: T) => Promise<R>;

export function useApi<T extends unknown[], R>(
  apiFunc: ApiFunc<T, R>,
  options?: { successMessage?: string; errorMessage?: string }
) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<R | null>(null);

  const execute = async (...args: T): Promise<R | undefined> => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiFunc(...args);
      setData(result);
      if (options?.successMessage) {
        showToast(options.successMessage, { type: 'success' });
      }
      return result;
    } catch (err) {
      setError(err as Error);
      apiErrorToast(showToast, options?.errorMessage)(err);
      return undefined;
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading, error, data };
}
