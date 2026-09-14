import { useSyncExternalStore } from "react";
import {
  createNavigationContainerRef,
  StackActions,
} from "@react-navigation/native";
import { byName, chainOf, firstTab } from "./registry";
import {
  findRoute,
  matchPath,
  stripPrefix,
  TABS_ROUTE,
  type NavState,
} from "./linking";
import type { ParamsOf, RouteName, ScreenEntry } from "./types";

type RouteMap = Record<string, object | undefined>;

export const navigationRef = createNavigationContainerRef<RouteMap>();

type Args<N extends RouteName> =
  undefined extends ParamsOf<N>
    ? [params?: ParamsOf<N>]
    : [params: ParamsOf<N>];

/**
 * A URL where a route name is expected: '/trending/topic?topicId=12', or a
 * full deep link ('myapp://…', 'https://myapp.com/…'). Params come from the
 * path and query, so none are passed separately.
 */
export type Href = `/${string}` | `${string}://${string}`;

/** Route name + params, or an href, resolved to the one route to dispatch. */
function target(
  name: string,
  params?: object,
): { entry: ScreenEntry; params?: object } {
  if (name.startsWith("/") || name.includes("://")) {
    const match = matchPath(stripPrefix(name));
    if (!match) throw new Error(`[navigation] "${name}": no route matches.`);
    return { entry: match.entry, params: match.params };
  }
  const entry = byName(name);
  if (!entry) throw new Error(`[navigation] "${name}": unknown route.`);
  return { entry, params };
}

function ready(call: string): boolean {
  if (navigationRef.isReady()) return true;
  console.warn(
    `[navigation] ${call} before the container was ready — ignored.`,
  );
  return false;
}

/**
 * Go to any route by its flat, globally unique name (or by URL) — callers
 * never build a nested path. The route's ancestors are visited first, so
 * arriving from anywhere leaves the same back stack a deep link would. A route
 * already in the stack is returned to rather than stacked again; use push()
 * for a second copy.
 */
export function goTo<N extends RouteName>(name: N, ...args: Args<N>): void;
export function goTo(href: Href): void;
export function goTo(name: string, params?: object): void {
  const resolved = target(name, params);
  const entry = resolved.entry;
  if (!ready(`goTo("${name}")`)) return;

  if (entry.kind === "modal" || entry.kind === "root") {
    navigationRef.navigate(entry.name, resolved.params);
    return;
  }

  if (entry.kind === "tab") {
    navigationRef.navigate(TABS_ROUTE, { screen: entry.name });
    return;
  }

  const chain = chainOf(entry.name);

  chain.forEach((step, i) => {
    const stepParams = i === chain.length - 1 ? resolved.params : undefined;
    const inner =
      step.kind === "topTab"
        ? {
            screen: step.topTabGroup,
            params: { screen: step.name, params: stepParams },
          }
        : { screen: step.name, params: stepParams };
    // A shared route lives in every tab, so it opens in the current one and
    // back returns there.
    const tab = step.tab ?? currentTab() ?? firstTab()?.name;
    navigationRef.navigate(TABS_ROUTE, { screen: tab, params: inner });
  });
}

/**
 * A stack action on the route the user is looking at. Unlike goTo() there is
 * no ancestor chain to walk: the card goes on top of (or over) what is already
 * there, in whichever stack is focused — the tab's, or the root one for a
 * <Root> card or <Modal>.
 */
function stackAction(
  action: "push" | "replace",
  name: string,
  params?: object,
): void {
  const { entry, params: resolved } = target(name, params);
  if (entry.kind === "tab" || entry.kind === "group" || entry.kind === "topTab")
    throw new Error(
      `[navigation] ${action}("${entry.name}"): a "${entry.kind}" route is not a stack card — use goTo().`,
    );
  if (!ready(`${action}("${name}")`)) return;
  navigationRef.dispatch(StackActions[action](entry.name, resolved));
}

/**
 * A new card on top of the current stack, *even if that route is already in
 * it* — two Topic screens with different params stack up, and back walks them
 * one by one. goTo() would return to the existing one instead.
 */
export function push<N extends RouteName>(name: N, ...args: Args<N>): void;
export function push(href: Href): void;
export function push(name: string, params?: object): void {
  stackAction("push", name, params);
}

/**
 * Swap the current card for another one: the user cannot go back to it. For
 * the step *after* a login or a wizard page, where returning makes no sense.
 */
export function replace<N extends RouteName>(name: N, ...args: Args<N>): void;
export function replace(href: Href): void;
export function replace(name: string, params?: object): void {
  stackAction("replace", name, params);
}

/** The focused child of a route anywhere in the tree, if it is mounted. */
function focusedChildOf(name: string): string | undefined {
  const root = navigationRef.isReady()
    ? (navigationRef.getRootState() as NavState)
    : undefined;
  const state = root && findRoute(root, name)?.state;
  return state?.routes[state.index ?? 0]?.name;
}

/** Which bottom tab is focused right now, if the container is mounted. */
function currentTab(): string | undefined {
  return focusedChildOf(TABS_ROUTE);
}

/**
 * Which page of a `<Tab.Top>` bar is focused, for code outside React —
 * analytics, a goTo() decision. `undefined` until that bar is mounted.
 */
export function focusedTopTab<N extends RouteName>(
  group: N,
): RouteName | undefined {
  return focusedChildOf(group) as RouteName | undefined;
}

/**
 * The same, as a hook: re-renders on every swipe or tap of the bar. Readable
 * from anywhere under <Navigation>, not just from inside the bar.
 *
 *   const page = useFocusedTopTab("Explore"); // 'Trending' | 'Latest' | ...
 */
export function useFocusedTopTab<N extends RouteName>(
  group: N,
): RouteName | undefined {
  const read = () => focusedTopTab(group);
  // Module-level `subscribe`: an inline one is a new identity every render, so
  // the listener would be torn down and re-added on each of them.
  return useSyncExternalStore(subscribeToState, read, read);
}

const subscribeToState = (onChange: () => void) =>
  navigationRef.addListener("state", onChange);

/** One step back in the current stack. No-op at the root, like the OS back gesture. */
export function back(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack())
    navigationRef.goBack();
}
