"use client";

import { useSyncExternalStore } from "react";

interface PersistApi {
  persist: {
    hasHydrated: () => boolean;
    onFinishHydration: (listener: () => void) => () => void;
  };
}

/** True once a persisted zustand store has loaded from localStorage. */
export function usePersistHydrated(store: PersistApi) {
  return useSyncExternalStore(
    (onChange) => store.persist.onFinishHydration(onChange),
    () => store.persist.hasHydrated(),
    () => false,
  );
}
