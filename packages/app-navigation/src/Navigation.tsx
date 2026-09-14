import React, { type ReactNode, useMemo } from "react";
import { useColorScheme } from "react-native";
import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme,
} from "@react-navigation/native";
import { buildRegistry } from "./tree";
import { getPathFromState, getStateFromPath, type NavState } from "./linking";
import { navigationRef } from "./navigate";
import { RootNavigator } from "./navigators";

/** Everything NavigationContainer takes, minus what this component owns. */
type ContainerProps = Omit<
  React.ComponentProps<typeof NavigationContainer>,
  "children" | "linking" | "theme" | "ref"
>;

type Props = ContainerProps & {
  /** Schemes and domains this app answers to, e.g. ['myapp://', 'https://myapp.com']. */
  prefixes: string[];
  /** The navigation tree: <Tab>, <Tab.Top>, <Route>, <Root>, <Modal>. */
  children: ReactNode;
  /**
   * Colors for headers, tab bars, cards and the JS `<Header>`. Pass one theme
   * to pin the app to it, or `{ light, dark }` to follow the OS setting with
   * your own palettes. Omitted, the app follows the OS with React
   * Navigation's default light/dark themes.
   */
  theme?: Theme | { light: Theme; dark: Theme };
};

/**
 * The single entry point. Deep links, back history and goTo() are all derived
 * from the tree passed as children — there is no second config to keep in sync.
 * Anything else (onReady, onStateChange, initialState, documentTitle, ...) is
 * passed straight through to NavigationContainer.
 */
export function Navigation({
  prefixes,
  children,
  theme,
  ...rest
}: Props): React.ReactElement {
  const scheme = useColorScheme();
  const resolvedTheme =
    theme && "light" in theme
      ? scheme === "dark"
        ? theme.dark
        : theme.light
      : (theme ?? (scheme === "dark" ? DarkTheme : DefaultTheme));

  // The registry is derived state: rebuilt from the tree on every render so a
  // Fast Refresh of the tree takes effect, while `linking` keeps its identity
  // (its two functions read the registry when called).
  buildRegistry(children);
  const linking = useMemo(
    () => ({
      prefixes,
      getStateFromPath: getStateFromPath as (
        path: string,
      ) => NavState | undefined,
      getPathFromState: getPathFromState as (state: NavState) => string,
    }),
    [prefixes.join("|")], // eslint-disable-line react-hooks/exhaustive-deps
  );

  return (
    <NavigationContainer
      {...rest}
      ref={navigationRef}
      theme={resolvedTheme}
      linking={linking}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}
