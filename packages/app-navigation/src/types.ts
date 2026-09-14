import type { ComponentType } from "react";
import type { RouteParams } from "./index";

export type RouteName = [keyof RouteParams] extends [never]
  ? string
  : Extract<keyof RouteParams, string>;

export type ParamsOf<N extends string> = N extends keyof RouteParams
  ? RouteParams[N]
  : Record<string, unknown> | undefined;

/**
 * Props every screen component receives from React Navigation.
 *
 *   function Topic({ route }: ScreenProps<{ topicId: string }>) { … }
 *
 * The params written here are the source of truth: the codegen reads them back
 * out of the component and into RouteParams, which is what types goTo().
 */
export type ScreenProps<P = undefined> = {
  route: { key: string; name: string; params: P };
  navigation: unknown;
};

/** A component mountable as a screen taking params `P`. */
export type ScreenComponent<P = never> = ComponentType<ScreenProps<P>>;

/**
 * 'tab'     bottom tab (no component of its own — hosts a synthesized stack)
 * 'group'   top-tab bar (no component — hosts a synthesized top-tab navigator)
 * 'topTab'  a page of a 'group'
 * 'screen'  a card in the tab's synthesized stack
 * 'shared'  a card mounted in *every* tab's stack (pushes in the current tab)
 * 'root'    a card mounted directly in the app's root stack
 * 'modal'   presented over everything, sibling of the tab navigator
 */
export type EntryKind =
  | "tab"
  | "group"
  | "topTab"
  | "screen"
  | "shared"
  | "root"
  | "modal";

export type ScreenEntry = {
  name: string;
  kind: EntryKind;
  /** Absent for 'tab' and 'group' — those render synthesized navigators. */
  component?: ScreenComponent<never>;
  /** Owning bottom tab. */
  tab?: string;
  /** For 'topTab': the 'group' entry it belongs to. */
  topTabGroup?: string;
  /** The route directly below this one in the stack and in the URL. */
  parent?: string;
  /** This route's own URL segment(s), e.g. 'topic' or 'topic/:topicId'. */
  path: string;
  /** `parent.fullPath + '/' + path` — what deep links actually match. */
  fullPath: string;
  options?: object;
  /** 'tab' only: route it opens on, and what deep links land behind. */
  initialRoute?: string;
};
