/**
 * Liquidity Vector Platform Detection Utility
 */

export const isVercel = process.env.NEXT_PUBLIC_VERCEL_URL !== undefined || process.env.VERCEL !== undefined;

export const isLocal = process.env.NODE_ENV === 'development';

export const getApiUrl = (): string => {
  // If we are on Vercel, we always use the rewrite proxy /api/backend
  // which is baked into next.config.ts
  if (isVercel) return '/api/backend';
  
  // If local, use the environment variable or default
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
};
