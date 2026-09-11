import type { ApiError, RequestOtpResponse } from '@aliver/types';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly retryAfterSeconds?: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include', // cookie'dagi tokenlar uchun majburiy
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as
      (ApiError & { retryAfterSeconds?: number }) | null;
    const msg = Array.isArray(body?.message)
      ? body!.message.join(', ')
      : (body?.message ?? res.statusText);
    throw new ApiRequestError(res.status, body?.code ?? 'ERROR', msg, body?.retryAfterSeconds);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  createB2bLead: (body: Record<string, string>) =>
    request<{ id: string; status: string }>('/b2b/leads', { method: 'POST', body: JSON.stringify(body) }),
  requestOtp: (phone: string) =>
    request<RequestOtpResponse>('/auth/otp/request', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    }),

  verifyOtp: (phone: string, code: string, firstName?: string) =>
    request<{ customer: { id: string; phone: string }; isNew: boolean }>('/auth/otp/verify', {
      method: 'POST',
      body: JSON.stringify({ phone, code, firstName }),
    }),

  me: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),
};
