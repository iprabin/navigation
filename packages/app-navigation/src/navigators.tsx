import React from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@react-navigation/native";
import {
  createNativeStackNavigator,
  type NativeStackNavigationOptions,
} from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createMaterialTopTabNavigator } from "@react-navigation/material-top-tabs";
// The registry is name-keyed and param types live in RouteParams, so the
// component is opaque by the time it reaches React Navigation. A lazy() screen
// picks up its Suspense boundary here.
import { screenComponent as asScreen } from "./screens";
import {
  byKind,
  byName,
  groupsOf,
  pagesOf,
  stackScreensOf,
} from "./registry";
import { TABS_ROUTE } from "./linking";

/**
 * Every navigator in the app is synthesized here from the tree — you never
 * create one. Shape:
 *
 *   root stack
 *     ├─ "Tabs" -> bottom tabs
 *     │              └─ per tab -> native stack (flat: every route of that tab)
 *     │                              └─ one card per <Tab.Top> -> top-tab bar
 *     ├─ root cards, siblings of the tabs
 *     └─ modals, siblings of the tabs
 */

/**
 * Defaults for the navigators synthesized below, per screen family. A route's
 * own `options` still win.
 */
type ScreenOptions = {
  root?: NativeStackNavigationOptions;
  shared?: NativeStackNavigationOptions;
  modal?: NativeStackNavigationOptions;
};

let configuredOptions: ScreenOptions = {};

export function configureNavigationOptions(opts: ScreenOptions): void {
  configuredOptions = opts;
}

const Root = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();
const Stack = createNativeStackNavigator();
const TopTabs = createMaterialTopTabNavigator();

function TopTabNavigator({
  group,
  safeTop,
}: {
  group: string;
  safeTop: boolean;
}) {
  const insets = useSafeAreaInsets();
  // The inset strip sits above the tab bar, so it takes the bar's color, not
  // the page's — otherwise dark mode shows a seam under the notch.
  const { colors } = useTheme();
  return (
    <View
      style={{
        flex: 1,
        paddingTop: safeTop ? insets.top : 0,
        backgroundColor: colors.card,
      }}
    >
      {/* Top tabs mount every page at once unless told otherwise (unlike
          bottom tabs, which are already lazy). */}
      <TopTabs.Navigator
        screenOptions={{ lazy: true, ...byName(group)?.screenOptions }}
      >
        {pagesOf(group).map((page) => (
          <TopTabs.Screen
            key={page.name}
            name={page.name}
            component={asScreen(page)}
            options={page.options}
          />
        ))}
      </TopTabs.Navigator>
    </View>
  );
}

function StackNavigator({ tab }: { tab: string }) {
  const screens = stackScreensOf(tab);
  const groups = groupsOf(tab);
  const initialRouteName =
    byName(tab)?.initialRoute ??
    screens.find((screen) => screen.kind === "screen")?.name;
  const sharedDefaults = configuredOptions.shared;

  return (
    <Stack.Navigator
      initialRouteName={initialRouteName}
      screenOptions={{ freezeOnBlur: true }}
    >
      {screens.map((screen) => (
        <Stack.Screen
          key={screen.name}
          name={screen.name}
          component={asScreen(screen)}
          options={
            sharedDefaults || screen.options
              ? { ...sharedDefaults, ...screen.options }
              : undefined
          }
        />
      ))}
      {groups.map((group) => {
        // A top-tab bar is a stack card. With no header above it, it owns the
        // notch inset itself.
        const options = { headerShown: false, ...group.options };
        return (
          <Stack.Screen key={group.name} name={group.name} options={options}>
            {() => (
              <TopTabNavigator
                group={group.name}
                safeTop={!options.headerShown}
              />
            )}
          </Stack.Screen>
        );
      })}
    </Stack.Navigator>
  );
}

function TabNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      {byKind("tab").map((tab) => (
        <Tabs.Screen key={tab.name} name={tab.name} options={tab.options}>
          {() => <StackNavigator tab={tab.name} />}
        </Tabs.Screen>
      ))}
    </Tabs.Navigator>
  );
}

export function RootNavigator() {
  const opts = configuredOptions;
  // A blurred screen stops re-rendering instead of trailing every context
  // change behind the one on top — what enableFreeze() does globally, scoped to
  // the screens we own. Override per route with `options`.
  return (
    <Root.Navigator screenOptions={{ headerShown: false, freezeOnBlur: true }}>
      {/* A children function, not `component`: core's StaticContainer memoizes a
          screen on its `render` identity, so a stable component here would freeze
          the whole tab subtree and Fast Refresh of the tree would never reach it. */}
      <Root.Screen name={TABS_ROUTE}>{() => <TabNavigator />}</Root.Screen>
      {byKind("root").map((screen) => (
        <Root.Screen
          key={screen.name}
          name={screen.name}
          component={asScreen(screen)}
          options={
            opts.root || screen.options
              ? { ...opts.root, ...screen.options }
              : undefined
          }
        />
      ))}
      <Root.Group screenOptions={{ presentation: "modal", headerShown: true }}>
        {byKind("modal").map((modal) => (
          <Root.Screen
            key={modal.name}
            name={modal.name}
            component={asScreen(modal)}
            options={
              opts.modal || modal.options
                ? { ...opts.modal, ...modal.options }
                : undefined
            }
          />
        ))}
      </Root.Group>
    </Root.Navigator>
  );
}
