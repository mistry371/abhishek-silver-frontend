"use client";

import { useState, type ReactNode } from "react";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon } from "@/components/icons";
import { cn } from "@/lib/utils";
import { AdminButton } from "../ui";
import { TrashIcon } from "../icons";
import { controlClass } from "../fields";

export type ListChange = "add" | "remove" | "move" | "edit";

const newKey = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `k-${performance.now()}`);

/**
 * Ordered list editor with add / remove / move up & down. Row keys are kept
 * alongside the items so inputs keep focus and identity while reordering.
 * Buttons are native, so a surrounding `<fieldset disabled>` makes it read-only.
 */
export function ListEditor<T>({
  label,
  description,
  items,
  onChange,
  createItem,
  addActions,
  renderItem,
  itemTitle,
  addLabel = "Add item",
  min = 0,
  max = 50,
  error,
  emptyText = "Nothing added yet.",
  collapsible = false,
  layout = "stack",
  className,
}: {
  label?: ReactNode;
  description?: ReactNode;
  items: T[];
  onChange: (items: T[], change: ListChange) => void;
  /** Called inside the click handler, so it may generate ids. */
  createItem?: () => T;
  /** Custom add buttons (e.g. one per block type) instead of the single add button. */
  addActions?: (add: (item: T) => void, full: boolean) => ReactNode;
  renderItem: (item: T, index: number, update: (next: T) => void) => ReactNode;
  itemTitle?: (item: T, index: number) => ReactNode;
  addLabel?: string;
  min?: number;
  max?: number;
  error?: string;
  emptyText?: string;
  collapsible?: boolean;
  layout?: "stack" | "grid";
  className?: string;
}) {
  const [keys, setKeys] = useState<string[]>(() => items.map((_, index) => `initial-${index}`));
  // Items changed length outside this editor: realign keys during render (no effect needed).
  if (keys.length !== items.length) {
    setKeys(items.map((_, index) => keys[index] ?? `sync-${keys.length}-${items.length}-${index}`));
  }

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= items.length) return;
    const nextItems = [...items];
    const nextKeys = [...keys];
    [nextItems[index], nextItems[target]] = [nextItems[target]!, nextItems[index]!];
    [nextKeys[index], nextKeys[target]] = [nextKeys[target]!, nextKeys[index]!];
    setKeys(nextKeys);
    onChange(nextItems, "move");
  };

  const remove = (index: number) => {
    setKeys(keys.filter((_, i) => i !== index));
    onChange(
      items.filter((_, i) => i !== index),
      "remove",
    );
  };

  const add = (item: T) => {
    setKeys([...keys, newKey()]);
    onChange([...items, item], "add");
  };

  const update = (index: number) => (next: T) =>
    onChange(
      items.map((item, i) => (i === index ? next : item)),
      "edit",
    );

  const full = items.length >= max;

  return (
    <div className={cn("min-w-0 sm:col-span-2", className)}>
      {(label || description) && (
        <div className="mb-2">
          {label && <p className="text-[0.75rem] font-medium text-ink-soft">{label}</p>}
          {description && <p className="mt-0.5 text-[0.75rem] text-muted">{description}</p>}
        </div>
      )}
      {items.length === 0 ? (
        <p className="border border-dashed border-line px-4 py-5 text-center text-[0.8125rem] text-muted">{emptyText}</p>
      ) : (
        <ol className={cn(layout === "grid" ? "grid gap-3 md:grid-cols-2" : "space-y-3")}>
          {items.map((item, index) => {
            const controls = (
              <div className="flex shrink-0 items-center gap-0.5">
                <AdminButton size="sm" variant="ghost" className="px-2" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move item ${index + 1} up`}>
                  <ChevronUpIcon size={15} />
                </AdminButton>
                <AdminButton size="sm" variant="ghost" className="px-2" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label={`Move item ${index + 1} down`}>
                  <ChevronDownIcon size={15} />
                </AdminButton>
                <AdminButton size="sm" variant="ghost" className="px-2 hover:text-danger" disabled={items.length <= min} onClick={() => remove(index)} aria-label={`Remove item ${index + 1}`}>
                  <TrashIcon size={14} />
                </AdminButton>
              </div>
            );
            const title = (
              <span className="flex min-w-0 items-center gap-2 text-[0.8125rem] text-ink">
                <span className="grid h-5 min-w-5 shrink-0 place-items-center bg-cream px-1 text-[0.6875rem] tabular-nums text-ink-soft">{index + 1}</span>
                <span className="truncate">{itemTitle?.(item, index) ?? `Item ${index + 1}`}</span>
              </span>
            );
            return (
              <li key={keys[index] ?? index} className="min-w-0 border border-line bg-ivory">
                {collapsible ? (
                  <details open className="group">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 [&::-webkit-details-marker]:hidden">
                      <span className="flex min-w-0 items-center gap-2">
                        <ChevronDownIcon size={14} className="shrink-0 -rotate-90 text-muted transition-transform group-open:rotate-0" />
                        {title}
                      </span>
                      {controls}
                    </summary>
                    <div className="border-t border-line p-4">{renderItem(item, index, update(index))}</div>
                  </details>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-1.5">
                      {title}
                      {controls}
                    </div>
                    <div className="p-4">{renderItem(item, index, update(index))}</div>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {addActions
            ? addActions(add, full)
            : createItem && (
                <AdminButton size="sm" onClick={() => add(createItem())} disabled={full}>
                  <PlusIcon size={14} />
                  {addLabel}
                </AdminButton>
              )}
        </div>
        <span className="text-[0.75rem] tabular-nums text-muted">
          {items.length} / {max}
        </span>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-[0.75rem] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** List of plain strings (paragraphs, bullet points, address lines). */
export function StringListEditor({
  label,
  description,
  items,
  onChange,
  errors = {},
  addLabel = "Add line",
  multiline = true,
  rows = 4,
  min = 0,
  max = 20,
  maxLength,
  placeholder,
  itemLabel = "Line",
}: {
  label?: ReactNode;
  description?: ReactNode;
  items: string[];
  onChange: (items: string[]) => void;
  /** Errors scoped to this list: "" for the list itself, "0", "1"… for items. */
  errors?: Record<string, string>;
  addLabel?: string;
  multiline?: boolean;
  rows?: number;
  min?: number;
  max?: number;
  maxLength?: number;
  placeholder?: string;
  itemLabel?: string;
}) {
  return (
    <ListEditor
      label={label}
      description={description}
      items={items}
      onChange={(next) => onChange(next)}
      createItem={() => ""}
      addLabel={addLabel}
      min={min}
      max={max}
      error={errors[""]}
      itemTitle={(item, index) => (item.trim() ? item : <span className="text-muted">{`${itemLabel} ${index + 1}`}</span>)}
      renderItem={(item, index, update) => {
        const error = errors[String(index)];
        const common = {
          "aria-label": `${itemLabel} ${index + 1}`,
          "aria-invalid": error ? true : undefined,
          value: item,
          maxLength,
          placeholder,
        };
        return (
          <>
            {multiline ? (
              <textarea rows={rows} {...common} onChange={(event) => update(event.target.value)} className={controlClass(error, "resize-y py-2 leading-relaxed")} />
            ) : (
              <input {...common} onChange={(event) => update(event.target.value)} className={controlClass(error, "h-10")} />
            )}
            {error && (
              <p role="alert" className="mt-1 text-[0.75rem] text-danger">
                {error}
              </p>
            )}
          </>
        );
      }}
    />
  );
}
