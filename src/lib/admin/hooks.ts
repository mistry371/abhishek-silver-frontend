"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminApiError, adminRequest, buildQuery, type Query } from "./client";

export type ResourceState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; error: AdminApiError };

const LOADING = { status: "loading" } as const;
const IDLE = { status: "idle" } as const;

function toAdminError(error: unknown) {
  return error instanceof AdminApiError ? error : new AdminApiError(500, {});
}

/**
 * Loads admin data. Loading is derived from the request key (never set
 * synchronously inside effects). `previous` keeps the last successful data so
 * tables stay visible while filters change. Pass `null` to skip loading.
 */
export function useAdminResource<T>(path: string | null, query?: Query) {
  const [attempt, setAttempt] = useState(0);
  const key = path ? `${path}${buildQuery(query)}` : "";
  const requestKey = `${key}::${attempt}`;
  const [result, setResult] = useState<{ key: string; state: ResourceState<T> } | null>(null);
  const [previous, setPrevious] = useState<T | undefined>(undefined);

  useEffect(() => {
    if (!path) return;
    const controller = new AbortController();
    adminRequest<T>(path, { query, signal: controller.signal })
      .then((data) => {
        setResult({ key: requestKey, state: { status: "ready", data } });
        setPrevious(data);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setResult({ key: requestKey, state: { status: "error", error: toAdminError(error) } });
      });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const state: ResourceState<T> = !path ? IDLE : result && result.key === requestKey ? result.state : LOADING;
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  const setData = useCallback(
    (data: T) => {
      setResult({ key: requestKey, state: { status: "ready", data } });
      setPrevious(data);
    },
    [requestKey],
  );

  return {
    state,
    data: state.status === "ready" ? state.data : undefined,
    /** Latest data, including while a newer request is loading. */
    latest: state.status === "ready" ? state.data : previous,
    loading: state.status === "loading",
    error: state.status === "error" ? state.error : undefined,
    reload,
    setData,
  };
}

export function useDebouncedValue<T>(value: T, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/**
 * Filters, sorting and paging kept in the URL, so views can be shared and
 * survive navigating to a record and back.
 */
export function useUrlFilters<K extends string>(keys: readonly K[], defaults: Partial<Record<K, string>> = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const values = useMemo(() => {
    const out = {} as Record<K, string>;
    for (const key of keys) out[key] = searchParams.get(key) ?? defaults[key] ?? "";
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setFilters = useCallback(
    (patch: Partial<Record<K, string>>, { resetPage = true } = {}) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch) as [K, string | undefined][]) {
        if (value === undefined || value === "" || value === defaults[key]) params.delete(key);
        else params.set(key, value);
      }
      if (resetPage && !("page" in patch)) params.delete("page");
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router, pathname, searchParams],
  );

  const query: Query = useMemo(() => {
    const out: Query = {};
    for (const key of keys) if (values[key]) out[key] = values[key];
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values]);

  return { values, setFilters, query };
}

/** Runs a mutation with a pending flag and captured field errors. */
export function useMutation<TArgs extends unknown[], TResult>(action: (...args: TArgs) => Promise<TResult>) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AdminApiError | null>(null);

  const run = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setPending(true);
      setError(null);
      try {
        return await action(...args);
      } catch (caught) {
        setError(toAdminError(caught));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [action],
  );

  return { run, pending, error, fieldErrors: error?.fieldErrors ?? {}, clearError: () => setError(null) };
}
