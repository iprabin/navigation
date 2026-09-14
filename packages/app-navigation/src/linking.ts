import { all, byName, chainOf, firstTab } from "./registry";
import type { ScreenEntry } from "./types";

export type NavRoute = { name: string; params?: object; state?: NavState };
export type NavState = { index?: number; routes: NavRoute[] };

export const TABS_ROUTE = "Tabs";

type Match = { entry: ScreenEntry; params: Record<string, string> };

const segmentsOf = (path: string) => path.split("/").filter(Boolean);

const paramsIn = (path: string) =>
  segmentsOf(path).filter((seg) => seg.startsWith(":")).length;

/**
 * Deep-linkable entries, longest path first so /a/b beats /a, and — at equal
 * length — the one with fewer ':params', so /item/new beats /item/:id.
 */
function table(): ScreenEntry[] {
  return all()
    .filter((e) => e.kind !== "tab" && e.fullPath)
    .sort(
      (a, b) =>
        segmentsOf(b.fullPath).length - segmentsOf(a.fullPath).length ||
        paramsIn(a.fullPath) - paramsIn(b.fullPath),
    );
}

let prefixes: string[] = [];

/** The schemes/domains <Navigation> answers to, so push('https://…') resolves. */
export const setPrefixes = (next: string[]): void => {
  prefixes = next;
};

/**
 * A full deep link -> the path matchPath() understands. A declared prefix is
 * stripped whole (`https://myapp.com`, `exp://127.0.0.1:8081/--`); anything
 * else falls back to dropping just the scheme, which is right for
 * `myapp://trending`.
 */
export function stripPrefix(href: string): string {
  const prefix = prefixes
    .filter((p) => href.startsWith(p))
    .sort((a, b) => b.length - a.length)[0];
  const rest = prefix
    ? href.slice(prefix.length)
    : href.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "/");
  return rest.startsWith("/") ? rest : `/${rest}`;
}

export function matchPath(path: string): Match | undefined {
  const [rawPath, query] = path.split("?");
  const parts = segmentsOf(rawPath);

  for (const entry of table()) {
    const pattern = segmentsOf(entry.fullPath);
    if (pattern.length !== parts.length) continue;
    const params: Record<string, string> = {};
    const ok = pattern.every((seg, i) => {
      if (seg.startsWith(":")) {
        params[seg.slice(1)] = decodeURIComponent(parts[i]);
        return true;
      }
      return seg === parts[i];
    });
    if (!ok) continue;
    for (const [key, value] of new URLSearchParams(query ?? ""))
      params[key] = value;
    return { entry, params };
  }
  return undefined;
}

/**
 * URL -> navigation state, *with history*. The route's ancestor chain (its
 * nesting in the tree) becomes the back stack, so opening
 * /trending/topic?topicId=12 cold gives HomeMain -> Explore(Trending) -> Topic
 * and back lands on Trending instead of exiting the app.
 */
export function getStateFromPath(path: string): NavState | undefined {
  const match = matchPath(path);
  if (!match) return undefined;
  const { entry, params } = match;

  // Modals and <Root> cards are siblings of the tabs, not inside one.
  if (entry.kind === "modal" || entry.kind === "root") {
    return {
      index: 1,
      routes: [{ name: TABS_ROUTE }, { name: entry.name, params }],
    };
  }

  const chain = chainOf(entry.name);
  const stack: NavRoute[] = [];

  // A shared route has no home tab, so a cold deep link opens it in the first.
  const tab = entry.tab ?? firstTab()?.name;
  const initialRoute = tab ? byName(tab)?.initialRoute : undefined;
  if (initialRoute && chain[0]?.name !== initialRoute)
    stack.push({ name: initialRoute });

  chain.forEach((step, i) => {
    const stepParams = i === chain.length - 1 ? params : undefined;
    if (step.kind === "topTab") {
      // A top-tab page is reached by focusing its bar, which is one stack card.
      stack.push({
        name: step.topTabGroup!,
        state: { index: 0, routes: [{ name: step.name, params: stepParams }] },
      });
    } else {
      stack.push({ name: step.name, params: stepParams });
    }
  });

  return {
    index: 0,
    routes: [
      {
        name: TABS_ROUTE,
        state: {
          index: 0,
          routes: [
            { name: tab!, state: { index: stack.length - 1, routes: stack } },
          ],
        },
      },
    ],
  };
}

/** The route with this name, at any depth of a navigation state. */
export function findRoute(state: NavState, name: string): NavRoute | undefined {
  for (const route of state.routes) {
    if (route.name === name) return route;
    const found = route.state && findRoute(route.state, name);
    if (found) return found;
  }
  return undefined;
}

function focusedRoute(state: NavState): NavRoute | undefined {
  const route = state.routes[state.index ?? state.routes.length - 1];
  if (!route) return undefined;
  return route.state ? (focusedRoute(route.state) ?? route) : route;
}

/** Navigation state -> URL. Keeps the address bar / analytics in sync. */
export function getPathFromState(state: NavState): string {
  const route = focusedRoute(state);
  const entry = route && byName(route.name);
  if (!route || !entry) return "/";

  const params: Record<string, unknown> = {
    ...(route.params as Record<string, unknown>),
  };
  const path = segmentsOf(entry.fullPath)
    .map((seg) => {
      if (!seg.startsWith(":")) return seg;
      const key = seg.slice(1);
      const value = params[key];
      delete params[key];
      return encodeURIComponent(String(value ?? ""));
    })
    .join("/");

  const query = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, String(v)]),
  ).toString();

  return `/${path}${query ? `?${query}` : ""}`;
}
