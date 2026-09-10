"use client";

import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CloseIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/Button";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useScrollLock } from "@/hooks/useScrollLock";
import { cn } from "@/lib/utils";

export type DialogVariant = "modal" | "responsive-sheet" | "sheet" | "drawer-right" | "drawer-left" | "fullscreen";

const EXIT_DURATION = 450;

const containerStyles: Record<DialogVariant, string> = {
  modal: "items-center justify-center p-4 sm:p-8",
  "responsive-sheet": "items-end justify-center md:items-center md:p-8",
  sheet: "items-end justify-center",
  "drawer-right": "justify-end",
  "drawer-left": "justify-start",
  fullscreen: "",
};

const panelStyles: Record<DialogVariant, string> = {
  modal:
    "max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto shadow-[0_40px_90px_-30px_rgb(20_18_16/0.45)] transition-[opacity,transform] duration-400 ease-luxe",
  "responsive-sheet":
    "max-h-[92dvh] w-full overflow-y-auto transition-[opacity,transform] duration-500 ease-luxe md:max-h-[calc(100dvh-4rem)] md:max-w-6xl md:shadow-[0_40px_90px_-30px_rgb(20_18_16/0.45)]",
  sheet: "max-h-[92dvh] w-full overflow-y-auto transition-transform duration-500 ease-luxe",
  "drawer-right": "flex h-full w-full max-w-[27rem] flex-col transition-transform duration-500 ease-luxe",
  "drawer-left": "flex h-full w-full max-w-[25rem] flex-col transition-transform duration-500 ease-luxe",
  fullscreen: "h-full w-full overflow-y-auto transition-opacity duration-300 ease-soft",
};

const openStyles: Record<DialogVariant, string> = {
  modal: "translate-y-0 scale-100 opacity-100",
  "responsive-sheet": "translate-y-0 md:scale-100 md:opacity-100",
  sheet: "translate-y-0",
  "drawer-right": "translate-x-0",
  "drawer-left": "translate-x-0",
  fullscreen: "opacity-100",
};

const closedStyles: Record<DialogVariant, string> = {
  modal: "translate-y-3 scale-[0.985] opacity-0",
  "responsive-sheet": "translate-y-full md:translate-y-3 md:scale-[0.985] md:opacity-0",
  sheet: "translate-y-full",
  "drawer-right": "translate-x-full",
  "drawer-left": "-translate-x-full",
  fullscreen: "opacity-0",
};

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  variant?: DialogVariant;
  /** Accessible name when no visible title is referenced. */
  label?: string;
  labelledBy?: string;
  describedBy?: string;
  className?: string;
  closeOnBackdrop?: boolean;
  initialFocus?: RefObject<HTMLElement | null>;
  zIndexClassName?: string;
}

export function Dialog({
  open,
  onClose,
  children,
  variant = "modal",
  label,
  labelledBy,
  describedBy,
  className,
  closeOnBackdrop = true,
  initialFocus,
  zIndexClassName = "z-[80]",
}: DialogProps) {
  const [mounted, setMounted] = useState(open);
  const [visible, setVisible] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  // Presence: mount immediately on open, start the exit transition immediately on close.
  if (open && !mounted) setMounted(true);
  if (!open && visible) setVisible(false);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setVisible(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [open]);

  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), EXIT_DURATION);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  useScrollLock(open && mounted);
  useFocusTrap(panelRef, open && mounted, { initialFocus });

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className={cn("fixed inset-0", zIndexClassName)}>
      <div
        aria-hidden="true"
        onClick={closeOnBackdrop ? onClose : undefined}
        className={cn(
          "absolute inset-0 bg-onyx/45 backdrop-blur-[2px] transition-opacity duration-400 ease-soft",
          visible ? "opacity-100" : "opacity-0",
        )}
      />
      <div className={cn("pointer-events-none absolute inset-0 flex", containerStyles[variant])}>
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-label={labelledBy ? undefined : label}
          aria-labelledby={labelledBy}
          aria-describedby={describedBy}
          tabIndex={-1}
          className={cn(
            "pointer-events-auto relative bg-porcelain text-ink outline-none",
            panelStyles[variant],
            visible ? openStyles[variant] : closedStyles[variant],
            className,
          )}
        >
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DialogHeader({
  title,
  titleId,
  subtitle,
  onClose,
  className,
}: {
  title: ReactNode;
  titleId?: string;
  subtitle?: ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4 border-b border-line px-6 py-5 md:px-8", className)}>
      <div className="min-w-0">
        <h2 id={titleId} className="type-h3 text-ink">
          {title}
        </h2>
        {subtitle && <p className="mt-1 type-body-sm text-muted">{subtitle}</p>}
      </div>
      <IconButton label="Close" onClick={onClose} className="-mr-3 -mt-1">
        <CloseIcon size={22} />
      </IconButton>
    </div>
  );
}
