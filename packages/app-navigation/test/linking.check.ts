// Self-check for the URL <-> state <-> history rules. Run: `npm run check`
import assert from "node:assert/strict";
import { createElement, lazy } from "react";
import { buildRegistry, Route, Root, Tab } from "../src/tree";
import { lazy as lazyScreen, screenComponent } from "../src/screens";
import type { ScreenComponent } from "../src/types";
import { byName, register, reset, validate } from "../src/registry";
import {
  findRoute,
  getPathFromState,
  getStateFromPath,
  matchPath,
  setPrefixes,
  stripPrefix,
} from "../src/linking";

const noop = (() => null) as never;

reset();
register({
  name: "Home",
  kind: "tab",
  tab: "Home",
  path: "",
  initialRoute: "HomeMain",
});
register({
  name: "HomeMain",
  kind: "screen",
  tab: "Home",
  path: "home",
  component: noop,
});
register({ name: "Explore", kind: "group", tab: "Home", path: "explore" });
register({
  name: "Trending",
  kind: "topTab",
  tab: "Home",
  topTabGroup: "Explore",
  path: "trending",
  component: noop,
});
register({
  name: "Topic",
  kind: "screen",
  tab: "Home",
  parent: "Trending",
  path: "topic",
  component: noop,
});
register({
  name: "EditProfile",
  kind: "modal",
  path: "edit-profile",
  component: noop,
});
register({ name: "Contact", kind: "root", path: "contact", component: noop });
validate();

// A deep link restores the whole ancestor chain, not just the target.
const state = getStateFromPath("/trending/topic?topicId=12");
const stack = state?.routes[0].state?.routes[0].state;
assert.deepEqual(
  stack?.routes.map((route) => route.name),
  ["HomeMain", "Explore", "Topic"],
  "back stack must be tab initial -> top-tab bar -> topic",
);
assert.equal(
  stack?.routes[1].state?.routes[0].name,
  "Trending",
  "top-tab bar opens on Trending",
);
assert.deepEqual(
  stack?.routes[2].params,
  { topicId: "12" },
  "query params land on the target",
);
assert.equal(stack?.index, 2, "topic is focused");

// …and the reverse, so the URL stays in sync with wherever the user navigates.
assert.equal(getPathFromState(state!), "/trending/topic?topicId=12");

// Modals sit above the tabs, not inside a tab stack.
assert.deepEqual(
  getStateFromPath("/edit-profile")?.routes.map((route) => route.name),
  ["Tabs", "EditProfile"],
);

// A root route is a sibling of Tabs in the root navigator, not nested in a tab.
assert.deepEqual(
  getStateFromPath("/contact")?.routes.map((route) => route.name),
  ["Tabs", "Contact"],
);

// Path params work the same as query params.
reset();
register({
  name: "Shop",
  kind: "tab",
  tab: "Shop",
  path: "",
  initialRoute: "Item",
});
register({
  name: "Item",
  kind: "screen",
  tab: "Shop",
  path: "item/:id",
  component: noop,
});
assert.deepEqual(
  getStateFromPath("/item/7")?.routes[0].state?.routes[0].state?.routes[0]
    .params,
  { id: "7" },
);
assert.equal(getPathFromState(getStateFromPath("/item/7")!), "/item/7");
assert.equal(
  getStateFromPath("/nope"),
  undefined,
  "unknown paths fall through",
);

// Duplicate names would break flat goTo() and deep links.
assert.throws(() =>
  register({
    name: "Item",
    kind: "screen",
    tab: "Shop",
    path: "other",
    component: noop,
  }),
);

// A lazy() screen gets a Suspense boundary, and the *same* one every render —
// a fresh wrapper identity would remount the screen on each navigation.
const Lazy = lazy(async () => ({ default: noop as never }));
const lazyEntry = register({
  name: "Lazy",
  kind: "screen",
  tab: "Shop",
  path: "lazy",
  component: Lazy as never,
});
assert.notEqual(
  screenComponent(lazyEntry),
  Lazy,
  "a lazy screen is wrapped in a boundary",
);
assert.equal(
  screenComponent(lazyEntry),
  screenComponent(lazyEntry),
  "the wrapper identity is stable",
);
const eager = register({
  name: "Eager",
  kind: "screen",
  tab: "Shop",
  path: "eager",
  component: noop,
});
assert.equal(screenComponent(eager), noop, "an eager screen is mounted as-is");

let loadCount = 0;
const loader = lazyScreen(async () => {
  loadCount += 1;
  return { Topic: noop as ScreenComponent<unknown> };
}, "Topic");
buildRegistry(createElement(Route, { name: "Deferred", loader }));
const deferred = byName("Deferred")!;
assert.equal(
  loadCount,
  0,
  "a loader is not called while the navigation tree is registered",
);
assert.notEqual(
  screenComponent(deferred),
  deferred.component,
  "a loader becomes a lazy screen with a boundary",
);

// One tab declared by two files: an explicit initialRoute beats the other
// file's implicit default (its first child), whichever comes first.
buildRegistry([
  createElement(
    Tab,
    { name: "Home", key: "explore" },
    createElement(
      Tab.Top,
      { name: "Explore" },
      createElement(Route, { name: "Trending", component: noop }),
    ),
  ),
  createElement(
    Tab,
    { name: "Home", key: "home", initialRoute: "HomeMain" },
    createElement(Route, { name: "HomeMain", component: noop }),
  ),
]);
assert.equal(
  byName("Home")?.initialRoute,
  "HomeMain",
  "explicit initialRoute wins over declaration order",
);

// A <Root> places routes directly in the root stack, no nested navigator.
buildRegistry(
  createElement(
    Root,
    null,
    createElement(Route, { name: "Contact", component: noop, path: "contact" }),
  ),
);
assert.equal(
  byName("Contact")?.kind,
  "root",
  "a route inside <Root> is a root card",
);
assert.deepEqual(
  getStateFromPath("/contact")?.routes.map((r) => r.name),
  ["Tabs", "Contact"],
  "a root card is a sibling of Tabs",
);

// What useFocusedTopTab() reads: the bar's focused page, found at any depth.
const mounted = {
  routes: [
    {
      name: "Tabs",
      state: {
        routes: [
          {
            name: "Home",
            state: {
              index: 1,
              routes: [
                { name: "HomeMain" },
                {
                  name: "Explore",
                  state: {
                    index: 1,
                    routes: [{ name: "Trending" }, { name: "Latest" }],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
};
const bar = findRoute(mounted, "Explore")?.state;
assert.equal(
  bar?.routes[bar.index ?? 0]?.name,
  "Latest",
  "the focused page of a top-tab bar is readable from the container state",
);
assert.equal(
  findRoute(mounted, "Nope"),
  undefined,
  "an unmounted bar reads undefined",
);

// A static segment beats a param at the same depth: /item/new is not id 'new'.
reset();
register({
  name: "Shop",
  kind: "tab",
  tab: "Shop",
  path: "",
  initialRoute: "Item",
});
register({
  name: "Item",
  kind: "screen",
  tab: "Shop",
  path: "item/:id",
  component: noop,
});
register({
  name: "NewItem",
  kind: "screen",
  tab: "Shop",
  path: "item/new",
  component: noop,
});
validate();
assert.equal(matchPath("/item/new")?.entry.name, "NewItem");
assert.deepEqual(matchPath("/item/7")?.params, { id: "7" });

// What push('https://myapp.com/x') resolves: a declared prefix is stripped
// whole, an undeclared scheme loses just its scheme.
setPrefixes(["myapp://", "https://myapp.com", "exp://127.0.0.1:8081/--"]);
assert.equal(stripPrefix("https://myapp.com/item/7"), "/item/7");
assert.equal(stripPrefix("exp://127.0.0.1:8081/--/item/7"), "/item/7");
assert.equal(stripPrefix("myapp://item/7"), "/item/7");
assert.equal(stripPrefix("/item/7"), "/item/7");
setPrefixes([]);
assert.equal(stripPrefix("other://item/7"), "/item/7");

console.log("linking.check.ts: ok");
