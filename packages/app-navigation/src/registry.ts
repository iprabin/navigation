import type { EntryKind, ScreenEntry } from "./types";

const entries = new Map<string, ScreenEntry>();

export function register(entry: Omit<ScreenEntry, "fullPath">): ScreenEntry {
  const parent = entry.parent ? entries.get(entry.parent) : undefined;
  if (entry.parent && !parent) {
    throw new Error(
      `[navigation] "${entry.name}" is nested under unknown route "${entry.parent}".`,
    );
  }
  const existing = entries.get(entry.name);
  if (existing) {
    // A <Tab> or <Tab.Top> may be declared by several feature files so each one
    // contributes its own screens without editing a shared tree. Everything
    // else must be unique — flat goTo() and deep links depend on it.
    if (
      existing.kind === entry.kind &&
      (entry.kind === "tab" || entry.kind === "group")
    ) {
      existing.initialRoute ??= entry.initialRoute;
      existing.options ??= entry.options;
      return existing;
    }
    throw new Error(
      `[navigation] Duplicate route name "${entry.name}". Names are global — that is what makes flat goTo() and deep links work.`,
    );
  }
  const full: ScreenEntry = {
    ...entry,
    fullPath:
      parent && parent.fullPath
        ? `${parent.fullPath}/${entry.path}`
        : entry.path,
  };
  entries.set(entry.name, full);
  return full;
}

export const reset = (): void => entries.clear();
export const byName = (name: string): ScreenEntry | undefined =>
  entries.get(name);
export const all = (): ScreenEntry[] => Array.from(entries.values());
export const byKind = (kind: EntryKind): ScreenEntry[] =>
  all().filter((e) => e.kind === kind);

/** Cards in a tab's stack: its own screens plus every shared one. */
export const stackScreensOf = (tab: string): ScreenEntry[] =>
  all().filter(
    (e) => (e.kind === "screen" && e.tab === tab) || e.kind === "shared",
  );

export const firstTab = (): ScreenEntry | undefined =>
  all().find((e) => e.kind === "tab");

export const groupsOf = (tab: string): ScreenEntry[] =>
  all().filter((e) => e.kind === "group" && e.tab === tab);

export const pagesOf = (group: string): ScreenEntry[] =>
  all().filter((e) => e.kind === "topTab" && e.topTabGroup === group);

/** Root-most ancestor first, `name` last. Drives both URL and back history. */
export function chainOf(name: string): ScreenEntry[] {
  const chain: ScreenEntry[] = [];
  let current = entries.get(name);
  while (current) {
    chain.unshift(current);
    current = current.parent ? entries.get(current.parent) : undefined;
  }
  return chain;
}

/** Dev guardrail: catches the mistakes this design exists to prevent. */
export function validate(): void {
  const paths = new Map<string, string>();
  for (const e of all()) {
    if (
      e.kind !== "tab" &&
      e.kind !== "group" &&
      !e.component
    ) {
      throw new Error(`[navigation] Route "${e.name}" has no component.`);
    }
    if (
      (e.kind === "screen" || e.kind === "topTab" || e.kind === "group") &&
      !e.tab
    ) {
      throw new Error(`[navigation] Route "${e.name}" is not inside a <Tab>.`);
    }
    if (e.kind === "shared" && e.parent) {
      throw new Error(
        `[navigation] Shared route "${e.name}" cannot be nested — it has no single home.`,
      );
    }
    if (e.kind === "root" && (e.parent || e.tab)) {
      throw new Error(
        `[navigation] Root route "${e.name}" must be declared at the root of the navigation tree.`,
      );
    }
    const parent = e.parent ? entries.get(e.parent) : undefined;
    if (parent && parent.tab !== e.tab) {
      throw new Error(
        `[navigation] "${e.name}" is nested under "${parent.name}" but lives in a different navigator.`,
      );
    }
    const clash = paths.get(e.fullPath);
    if (clash && e.kind !== "tab") {
      throw new Error(
        `[navigation] "${e.name}" and "${clash}" both deep link to "/${e.fullPath}".`,
      );
    }
    if (e.kind !== "tab") paths.set(e.fullPath, e.name);
    if (e.kind === "tab" && e.initialRoute && !entries.has(e.initialRoute)) {
      throw new Error(
        `[navigation] Tab "${e.name}" has initialRoute "${e.initialRoute}", which is not a route.`,
      );
    }
  }
}
