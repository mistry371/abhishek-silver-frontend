/**
 * Field errors come back from the API keyed by dotted paths
 * (e.g. `hero.0.primaryCta.label`). These helpers narrow them for nested editors.
 */

export type FieldErrors = Record<string, string>;

/** Errors below `prefix`, with the prefix removed: scope({"hero.0.title": "x"}, "hero.0") → {title: "x"}. */
export function scopeErrors(errors: FieldErrors, prefix: string | number): FieldErrors {
  const head = `${prefix}.`;
  const out: FieldErrors = {};
  for (const [key, message] of Object.entries(errors)) {
    if (key.startsWith(head)) out[key.slice(head.length)] = message;
    else if (key === String(prefix)) out[""] = message;
  }
  return out;
}

/** First error at `path` or anywhere below it (useful for objects like images and links). */
export function errorAt(errors: FieldErrors, path: string): string | undefined {
  if (errors[path]) return errors[path];
  const head = `${path}.`;
  for (const [key, message] of Object.entries(errors)) if (key.startsWith(head)) return message;
  return undefined;
}

/** "hero.0.primaryCta.label" → "Hero › 1 › Primary cta › Label" */
export function describePath(path: string) {
  if (!path || path === "_form") return "";
  return path
    .split(".")
    .map((part) => (/^\d+$/.test(part) ? `#${Number(part) + 1}` : part.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase())))
    .join(" › ");
}
