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

export * from "./types";
export * from "./tree";
export * from "./screens";
export * from "./registry";
export * from "./linking";
export * from "./navigate";
export * from "./navigators";
export * from "./Navigation";
export * from "./Screen";
export * from "./Header";
// Theming is React Navigation's, re-exported so a screen can read the current
// palette (`useTheme().colors`) without a second import path.
export {
  useTheme,
  DefaultTheme,
  DarkTheme,
  type Theme,
} from "@react-navigation/native";
