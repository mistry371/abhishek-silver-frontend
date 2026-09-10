"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Accordion                                                           */
/* ------------------------------------------------------------------ */

export interface AccordionItemData {
  id: string;
  title: ReactNode;
  content: ReactNode;
}

export function Accordion({
  items,
  allowMultiple = false,
  defaultOpen = [],
  headingLevel = 3,
  className,
  itemClassName,
  titleClassName,
  anchors = false,
}: {
  items: AccordionItemData[];
  allowMultiple?: boolean;
  defaultOpen?: string[];
  headingLevel?: 2 | 3 | 4;
  className?: string;
  itemClassName?: string;
  titleClassName?: string;
  /** Give each item its id as a DOM anchor and open it when the URL hash matches. */
  anchors?: boolean;
}) {
  const [openIds, setOpenIds] = useState<string[]>(defaultOpen);
  const baseId = useId();
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";

  useEffect(() => {
    if (!anchors) return;
    const ids = new Set(items.map((item) => item.id));
    function openFromHash() {
      const hash = decodeURIComponent(window.location.hash.slice(1));
      if (!hash || !ids.has(hash)) return;
      setOpenIds((current) => (current.includes(hash) ? current : [...current, hash]));
      requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView({ block: "center" }));
    }
    const frame = requestAnimationFrame(openFromHash);
    window.addEventListener("hashchange", openFromHash);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", openFromHash);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchors]);

  function toggle(id: string) {
    setOpenIds((current) => {
      const isOpen = current.includes(id);
      if (isOpen) return current.filter((x) => x !== id);
      return allowMultiple ? [...current, id] : [id];
    });
  }

  return (
    <div className={cn("border-t border-line", className)}>
      {items.map((item) => {
        const open = openIds.includes(item.id);
        const triggerId = `${baseId}-${item.id}-trigger`;
        const panelId = `${baseId}-${item.id}-panel`;
        return (
          <div key={item.id} id={anchors ? item.id : undefined} className={cn("scroll-mt-40 border-b border-line", itemClassName)}>
            <Heading className="m-0">
              <button
                type="button"
                id={triggerId}
                aria-expanded={open}
                aria-controls={panelId}
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full items-center justify-between gap-6 py-5 text-left type-h4 text-ink transition-colors duration-200 hover:text-champagne-deep",
                  titleClassName,
                )}
              >
                <span>{item.title}</span>
                <span className="relative h-3 w-3 shrink-0" aria-hidden="true">
                  <span className="absolute left-0 top-1/2 h-px w-3 bg-current" />
                  <span
                    className={cn(
                      "absolute left-1/2 top-0 h-3 w-px bg-current transition-transform duration-300 ease-luxe",
                      open && "scale-y-0",
                    )}
                  />
                </span>
              </button>
            </Heading>
            <div
              id={panelId}
              role="region"
              aria-labelledby={triggerId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows] duration-400 ease-luxe",
                open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
              )}
            >
              <div className="overflow-hidden">
                <div className="pb-6 type-body text-muted">{item.content}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

export interface TabData {
  id: string;
  label: ReactNode;
  content: ReactNode;
}

export function Tabs({
  tabs,
  defaultTab,
  label,
  className,
  listClassName,
  panelClassName,
}: {
  tabs: TabData[];
  defaultTab?: string;
  label: string;
  className?: string;
  listClassName?: string;
  panelClassName?: string;
}) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const baseId = useId();

  function focusTab(index: number) {
    const tab = tabs[(index + tabs.length) % tabs.length];
    setActive(tab.id);
    tabRefs.current[tab.id]?.focus();
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTab(index + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTab(index - 1);
    } else if (event.key === "Home") {
      event.preventDefault();
      focusTab(0);
    } else if (event.key === "End") {
      event.preventDefault();
      focusTab(tabs.length - 1);
    }
  }

  return (
    <div className={className}>
      <div
        role="tablist"
        aria-label={label}
        className={cn("no-scrollbar flex gap-8 overflow-x-auto border-b border-line", listClassName)}
      >
        {tabs.map((tab, index) => {
          const selected = tab.id === active;
          return (
            <button
              key={tab.id}
              ref={(node) => {
                tabRefs.current[tab.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-${tab.id}-tab`}
              aria-selected={selected}
              aria-controls={`${baseId}-${tab.id}-panel`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(tab.id)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "relative shrink-0 py-4 type-nav transition-colors duration-200",
                "after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-ink after:transition-transform after:duration-400 after:ease-luxe",
                selected ? "text-ink after:scale-x-100" : "text-muted hover:text-ink after:scale-x-0",
              )}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          role="tabpanel"
          id={`${baseId}-${tab.id}-panel`}
          aria-labelledby={`${baseId}-${tab.id}-tab`}
          hidden={tab.id !== active}
          tabIndex={0}
          className={cn("pt-8 focus-visible:outline-offset-8", panelClassName)}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
