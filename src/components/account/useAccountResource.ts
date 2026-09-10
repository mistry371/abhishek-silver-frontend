"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/Toast";
import { ApiError, toUserMessage } from "@/lib/api/errors";
import { getAuthToken } from "@/stores/auth";
import { handleAuthError } from "@/stores/session";

export type ResourceState<T> =
  | { status: "loading" }
  | { status: "ready"; data: T }
  | { status: "error"; message: string; code?: string };

const LOADING = { status: "loading" } as const;

/**
 * Loads authenticated account data with loading, error and session-expiry handling.
 * Loading is derived from the request key, so no state is reset synchronously in effects.
 */
export function useAccountResource<T>(loader: (token: string) => Promise<T>, key = "") {
  const [attempt, setAttempt] = useState(0);
  const requestKey = `${key}::${attempt}`;
  const [result, setResult] = useState<{ key: string; state: ResourceState<T> } | null>(null);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;
    let active = true;
    loader(token)
      .then((data) => {
        if (active) setResult({ key: requestKey, state: { status: "ready", data } });
      })
      .catch((error) => {
        if (!active) return;
        if (handleAuthError(error)) {
          toast({ title: "Your session has expired", description: "Please sign in again to continue." });
          return;
        }
        setResult({
          key: requestKey,
          state: { status: "error", message: toUserMessage(error), code: error instanceof ApiError ? error.code : undefined },
        });
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const state: ResourceState<T> = result && result.key === requestKey ? result.state : LOADING;
  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  const setData = useCallback((data: T) => setResult({ key: requestKey, state: { status: "ready", data } }), [requestKey]);

  return { state, retry, setData };
}
