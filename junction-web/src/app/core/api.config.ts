export function resolveApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8000';
  }

  const host = window.location.hostname;
  const isLocal = host === 'localhost' || host === '127.0.0.1';

  // Same-origin /api is rewritten by Vercel to https://junctionback.onrender.com
  return isLocal ? 'http://localhost:8000' : '/api';
}
