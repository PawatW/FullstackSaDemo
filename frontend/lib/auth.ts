export interface JwtPayload {
  sub: string;
  role?: string;
  exp?: number;
  [key: string]: unknown;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = typeof window === 'undefined'
      ? Buffer.from(padded, 'base64').toString('utf8')
      : atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode token', error);
    return null;
  }
}

export function isTokenExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp < now;
}
