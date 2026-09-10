"use client";

import Link from "next/link";
import { create } from "zustand";
import { AlertIcon, CloseIcon, SuccessIcon } from "@/components/icons";
import { cn, uid } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  action?: { label: string; href: string };
}

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: { label: string; href: string };
  duration?: number;
}

interface ToastState {
  toasts: ToastItem[];
  push: (input: ToastInput) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push: ({ duration = 4500, tone = "default", ...input }) => {
    const id = uid("toast");
    set((state) => ({ toasts: [...state.toasts.slice(-2), { ...input, tone, id }] }));
    window.setTimeout(() => get().dismiss(id), duration);
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}));

export function toast(input: ToastInput) {
  return useToastStore.getState().push(input);
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  return (
    <div
      aria-live="polite"
      aria-atomic="false"
      className="pointer-events-none fixed inset-x-3 bottom-[calc(var(--mobile-nav-height)+0.75rem)] z-[95] flex flex-col items-stretch gap-2 md:inset-x-auto md:bottom-6 md:right-6 md:w-[23rem]"
    >
      {toasts.map((item) => (
        <div
          key={item.id}
          role={item.tone === "error" ? "alert" : "status"}
          className="pointer-events-auto flex animate-fade-up items-start gap-3 bg-onyx px-5 py-4 text-ivory shadow-[0_20px_50px_-20px_rgb(0_0_0/0.5)]"
        >
          {item.tone === "success" && <SuccessIcon size={18} className="mt-0.5 shrink-0 text-champagne-soft" />}
          {item.tone === "error" && <AlertIcon size={18} className="mt-0.5 shrink-0 text-[#e8a39a]" />}
          <div className="min-w-0 flex-1">
            <p className="type-body-sm font-medium text-ivory">{item.title}</p>
            {item.description && <p className="mt-0.5 type-body-sm text-ivory/70">{item.description}</p>}
            {item.action && (
              <Link
                href={item.action.href}
                onClick={() => dismiss(item.id)}
                className={cn("mt-2 inline-block type-caption tracking-[0.18em] text-champagne-soft link-underline-static")}
              >
                {item.action.label}
              </Link>
            )}
          </div>
          <button
            type="button"
            onClick={() => dismiss(item.id)}
            aria-label="Dismiss notification"
            className="-mr-1 -mt-1 p-1 text-ivory/60 transition-colors hover:text-ivory"
          >
            <CloseIcon size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}
