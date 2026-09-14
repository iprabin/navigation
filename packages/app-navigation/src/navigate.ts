import { useSyncExternalStore } from "react";
import { createNavigationContainerRef } from "@react-navigation/native";
import { byName, chainOf, firstTab } from "./registry";
import { findRoute, matchPath, TABS_ROUTE, type NavState } from "./linking";
import type { ParamsOf, RouteName } from "./types";

type RouteMap = Record<string, object | undefined>;

export const navigationRef = createNavigationContainerRef<RouteMap>();

type Args<N extends RouteName> =
  undefined extends ParamsOf<N>
    ? [params?: ParamsOf<N>]
    : [params: ParamsOf<N>];

/**
 * Go to any route by its flat, globally unique name — callers never build a
 * nested path. The route's ancestors are visited first, so arriving from
 * anywhere leaves the same back stack a deep link would.
 */
export function goTo<N extends RouteName>(name: N, ...args: Args<N>): void {
  const params = args[0];
  const entry = byName(name);
  if (!entry) throw new Error(`[navigation] goTo("${name}"): unknown route.`);
  if (!navigationRef.isReady()) {
    console.warn(
      `[navigation] goTo("${name}") before the container was ready — ignored.`,
    );
    return;
  }

  if (entry.kind === "modal") {
    const modal: string = name;
    navigationRef.navigate(modal, params as object | undefined);
    return;
  }

  if (entry.kind === "root") {
    const root: string = name;
    navigationRef.navigate(root, params as object | undefined);
    return;
  }

  if (entry.kind === "tab") {
    navigationRef.navigate(TABS_ROUTE, { screen: name });
    return;
  }

  const chain = chainOf(name);

  chain.forEach((step, i) => {
    const stepParams = i === chain.length - 1 ? params : undefined;
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
  return useSyncExternalStore(
    (onChange) => navigationRef.addListener("state", onChange),
    read,
    read,
  );
}

/** One step back in the current stack. No-op at the root, like the OS back gesture. */
export function back(): void {
  if (navigationRef.isReady() && navigationRef.canGoBack())
    navigationRef.goBack();
}

/** URL-first navigation, same history rules: push('/trending/topic?topicId=12'). */
export function push(href: string): void {
  const match = matchPath(href.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "/"));
  if (!match)
    throw new Error(`[navigation] push("${href}"): no route matches.`);
  goTo(match.entry.name as RouteName, match.params as never);
}
