import type { ApiErrorShape } from "@/types/common";
import { API_BASE_URL } from "./config";
import { ApiError, statusToCode } from "./errors";

type QueryValue = string | number | boolean | string[] | null | undefined;
export type Query = Record<string, QueryValue>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Bearer token for authenticated customer endpoints. */
  token?: string | null;
  signal?: AbortSignal;
  /** Next.js data cache controls for server-side GET requests. */
  revalidate?: number | false;
  tags?: string[];
}

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

/**
 * Thin fetch wrapper for the Node.js backend. Normalises all failures into
 * `ApiError` so UI components only ever deal with customer-safe messages.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, token, signal, revalidate, tags } = options;
  const url = `${API_BASE_URL}${path}${buildQuery(query)}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...(method === "GET" && (revalidate !== undefined || tags) ? { next: { revalidate, tags } } : {}),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError({ code: "network_error", message: "" });
  }

  if (!response.ok) {
    let payload: Partial<ApiErrorShape> = {};
    try {
      payload = (await response.json()) as Partial<ApiErrorShape>;
    } catch {
      // Non-JSON error body — fall back to status mapping.
    }
    throw new ApiError(
      {
        code: payload.code ?? statusToCode(response.status),
        message: payload.message ?? "",
        fieldErrors: payload.fieldErrors,
      },
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}
