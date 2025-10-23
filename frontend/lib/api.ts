import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  path: string,
  { token, ...init }: RequestInit & { token?: string } = {}
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    const rawMessage = await response.text();
    let message = rawMessage || 'Request failed';
    if (rawMessage) {
      try {
        const parsed = JSON.parse(rawMessage);
        if (typeof parsed === 'string') {
          message = parsed;
        } else if (parsed && typeof parsed === 'object' && 'message' in parsed) {
          const extracted = (parsed as { message?: unknown }).message;
          if (typeof extracted === 'string' && extracted.trim()) {
            message = extracted;
          }
        }
      } catch {
        // rawMessage is not JSON; use as-is
        message = rawMessage;
      }
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export interface PagedResult<T> {
  items: T[];
  total: number;
}

export function buildQuery(params: Record<string, string | number | boolean | undefined | null>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });
  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}
