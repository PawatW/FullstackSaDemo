import { API_BASE_URL } from './config';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function buildApiError(response: Response): Promise<ApiError> {
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
      message = rawMessage;
    }
  }

  return new ApiError(message, response.status);
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
    throw await buildApiError(response);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return text ? (JSON.parse(text) as T) : (undefined as T);
}

export async function uploadProductImage(
  file: File,
  token: string
): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE_URL}/products/upload-image`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData
  });

  if (!response.ok) {
    throw await buildApiError(response);
  }

  return (await response.json()) as { url: string };
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
