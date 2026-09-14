import { createNavigationContainerRef } from "@react-navigation/native";
import { byName, chainOf, firstTab } from "./registry";
import { matchPath, TABS_ROUTE } from "./linking";
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

/** Which bottom tab is focused right now, if the container is mounted. */
function currentTab(): string | undefined {
  const root = navigationRef.isReady()
    ? navigationRef.getRootState()
    : undefined;
  const tabs = root?.routes.find((route) => route.name === TABS_ROUTE)?.state;
  return tabs?.routes[tabs.index ?? 0]?.name;
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
