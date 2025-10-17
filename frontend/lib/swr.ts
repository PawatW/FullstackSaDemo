import useSWR, { SWRConfiguration, SWRResponse } from 'swr';
import { apiFetch } from './api';

export function useAuthedSWR<T>(
  key: string | null,
  token: string | null,
  config?: SWRConfiguration<T>
): SWRResponse<T, unknown> {
  return useSWR<T>(key && token ? [key, token] : null, ([path, authToken]) => apiFetch<T>(path, { token: authToken as string }), config);
}
