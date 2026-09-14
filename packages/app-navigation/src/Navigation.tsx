import React, { type ReactNode, useMemo } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { buildRegistry } from "./elements";
import { getPathFromState, getStateFromPath, type NavState } from "./linking";
import { navigationRef } from "./navigate";
import { RootNavigator } from "./navigators";

type Props = {
  /** Schemes and domains this app answers to, e.g. ['myapp://', 'https://myapp.com']. */
  prefixes: string[];
  /** The navigation tree: <Tab>, <Tab.Top>, <Route>, <Root>, <Modal>. */
  children: ReactNode;
  fallback?: ReactNode;
};

/**
 * The single entry point. Deep links, back history and goTo() are all derived
 * from the tree passed as children — there is no second config to keep in sync.
 */
export function Navigation({
  prefixes,
  children,
  fallback,
}: Props): React.ReactElement {
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
      ref={navigationRef}
      linking={linking}
      fallback={fallback}
    >
      <RootNavigator />
    </NavigationContainer>
  );
}
