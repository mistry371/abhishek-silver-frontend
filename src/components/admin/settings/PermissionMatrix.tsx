"use client";

import type { PermissionGroup } from "@/components/admin/AdminSession";
import { CheckboxInput } from "@/components/admin/fields";
import { cn } from "@/lib/utils";

/** Checkbox per permission, grouped by module, with "select all in module". */
export function PermissionMatrix({ groups, selected, locked, onChange }: { groups: PermissionGroup[]; selected: ReadonlySet<string>; locked: boolean; onChange: (next: Set<string>) => void }) {
  function toggle(permission: string) {
    const next = new Set(selected);
    if (next.has(permission)) next.delete(permission);
    else next.add(permission);
    onChange(next);
  }

  function toggleGroup(codes: string[], allSelected: boolean) {
    const next = new Set(selected);
    for (const code of codes) {
      if (allSelected) next.delete(code);
      else next.add(code);
    }
    onChange(next);
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => {
        const codes = Object.keys(group.permissions);
        const granted = codes.filter((code) => selected.has(code)).length;
        const allSelected = granted === codes.length;
        return (
          <fieldset key={group.module} disabled={locked} className={cn("min-w-0 border border-line bg-porcelain", locked && "opacity-80")}>
            <legend className="sr-only">{group.module} permissions</legend>
            <div className="flex items-center justify-between gap-3 border-b border-line bg-cream/60 px-4 py-2.5">
              <p className="text-[0.8125rem] font-medium text-ink">
                {group.module}
                <span className="ml-2 text-[0.75rem] font-normal tabular-nums text-muted">
                  {granted}/{codes.length}
                </span>
              </p>
              <label className={cn("flex items-center gap-2 text-[0.75rem] text-ink-soft", !locked && "cursor-pointer")}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-ink"
                  aria-label={`Select all ${group.module} permissions`}
                  checked={allSelected}
                  ref={(element) => {
                    if (element) element.indeterminate = granted > 0 && !allSelected;
                  }}
                  onChange={() => toggleGroup(codes, allSelected)}
                />
                Select all
              </label>
            </div>
            <ul className="divide-y divide-line">
              {codes.map((code) => (
                <li key={code} className="px-4 py-2.5">
                  <CheckboxInput checked={selected.has(code)} onChange={() => toggle(code)} label={group.permissions[code]} description={<code className="text-[0.6875rem]">{code}</code>} />
                </li>
              ))}
            </ul>
          </fieldset>
        );
      })}
    </div>
  );
}
