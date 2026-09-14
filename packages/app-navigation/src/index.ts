/// <reference path="../generated/routes.d.ts" />
/**
 * The map of every route name to its params. Nobody writes this by hand:
 * `app-navigation-codegen` derives it from the tree into
 * `generated/routes.d.ts`, which the reference above pulls in — so an app gets
 * typed goTo()/push() without touching its own tsconfig.
 *
 * Until the codegen has run, RouteParams is empty and names fall back to
 * `string`, so the library still works untyped in a JS project.
 */
export interface RouteParams {}

/**
 * The public API. Everything else under src/ — the registry, the linking
 * table, the synthesized navigators — is how this package works, not what it
 * offers, so it is not re-exported: an app that reaches for it would break on
 * an internal refactor.
 */
export { Tab, Route, Modal, Root } from "./tree";
export { Navigation } from "./Navigation";
export { Screen } from "./Screen";
export { Header, type HeaderProps } from "./Header";
export { Link, Redirect, type LinkProps, type LinkHref } from "./Link";
export {
  goTo,
  push,
  replace,
  dismissTo,
  back,
  useNavigation,
  focusedTopTab,
  useFocusedTopTab,
  navigationRef,
  type Href,
} from "./navigate";
export { lazy } from "./screens";
export { configureNavigationOptions } from "./navigators";
export type {
  ScreenProps,
  ScreenComponent,
  RouteName,
  ParamsOf,
  RouteOptions,
  TabOptions,
} from "./types";
// Theming is React Navigation's, re-exported so a screen can read the current
// palette (`useTheme().colors`) without a second import path.
export {
  useTheme,
  DefaultTheme,
  DarkTheme,
  type Theme,
} from "@react-navigation/native";
