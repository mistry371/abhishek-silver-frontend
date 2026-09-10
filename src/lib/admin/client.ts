"use client";

/**
 * Browser-side admin API client. Talks only to the same-origin proxy
 * (`/api/admin/proxy`), which attaches the session token server-side.
 */

export const ADMIN_PROXY = "/api/admin/proxy";
export const SESSION_EXPIRED_EVENT = "admin:session-expired";

export class AdminApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors?: Record<string, string>;

  constructor(status: number, payload: { code?: string; message?: string; fieldErrors?: Record<string, string> }) {
    super(payload.message || defaultMessage(status));
    this.name = "AdminApiError";
    this.status = status;
    this.code = payload.code ?? (status === 403 ? "forbidden" : status === 404 ? "not_found" : status === 401 ? "unauthorized" : "server_error");
    this.fieldErrors = payload.fieldErrors;
  }
}

function defaultMessage(status: number) {
  if (status === 401) return "Please sign in to continue.";
  if (status === 403) return "You don't have permission to do that.";
  if (status === 404) return "We couldn't find that record.";
  if (status === 409) return "This record changed while you were editing. Refresh and try again.";
  if (status === 422) return "Please review the highlighted fields.";
  if (status === 429) return "Too many attempts. Please wait a moment.";
  return "Something went wrong. Please try again.";
}

export type QueryValue = string | number | boolean | null | undefined | string[];
export type Query = Record<string, QueryValue>;

export function buildQuery(query?: Query) {
  if (!query) return "";
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      if (value.length) params.set(key, value.join(","));
    } else {
      params.set(key, String(value));
    }
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function adminRequest<T>(
  path: string,
  { method = "GET", body, query, signal }: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; query?: Query; signal?: AbortSignal } = {},
): Promise<T> {
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  let response: Response;
  try {
    response = await fetch(`${ADMIN_PROXY}${path}${buildQuery(query)}`, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(method !== "GET" ? { "x-admin-request": "1" } : {}),
        ...(body !== undefined && !isForm ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : isForm ? (body as FormData) : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new AdminApiError(0, { code: "network_error", message: "We couldn't reach the server. Check your connection and try again." });
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { code?: string; message?: string; fieldErrors?: Record<string, string> };
    if (response.status === 401 && typeof window !== "undefined") window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new AdminApiError(response.status, payload);
  }
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const adminApi = {
  get: <T>(path: string, query?: Query, signal?: AbortSignal) => adminRequest<T>(path, { query, signal }),
  post: <T>(path: string, body?: unknown) => adminRequest<T>(path, { method: "POST", body: body ?? {} }),
  put: <T>(path: string, body?: unknown) => adminRequest<T>(path, { method: "PUT", body: body ?? {} }),
  patch: <T>(path: string, body?: unknown) => adminRequest<T>(path, { method: "PATCH", body: body ?? {} }),
  del: <T = void>(path: string) => adminRequest<T>(path, { method: "DELETE" }),
  upload: <T>(path: string, form: FormData, query?: Query) => adminRequest<T>(path, { method: "POST", body: form, query }),
};

/** URL for authorised downloads (CSV exports, receipts) through the proxy. */
export const adminFileUrl = (path: string, query?: Query) => `${ADMIN_PROXY}${path}${buildQuery(query)}`;

export function errorMessage(error: unknown) {
  if (error instanceof AdminApiError) return error.message;
  return "Something went wrong. Please try again.";
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ImageAsset {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}
