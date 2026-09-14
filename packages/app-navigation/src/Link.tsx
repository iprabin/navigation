import React, {
  Children,
  cloneElement,
  useEffect,
  type ReactElement,
  type ReactNode,
} from "react";
import { Text, type GestureResponderEvent, type TextProps } from "react-native";
import {
  dismissTo as dismissToRoute,
  goTo,
  push as pushRoute,
  replace as replaceRoute,
  type Href,
} from "./navigate";
import type { ParamsOf, RouteName } from "./types";

/**
 * Where a <Link> goes: a URL, a route name, or a name with its params. The
 * bare name is only allowed when the route takes no required params — those
 * routes need the object form, the same rule goTo() enforces on its arguments.
 */
export type LinkHref<N extends RouteName = RouteName> =
  | Href
  | (undefined extends ParamsOf<N> ? N : never)
  | (undefined extends ParamsOf<N>
      ? { pathname: N; params?: ParamsOf<N> }
      : { pathname: N; params: ParamsOf<N> });

export type LinkProps<N extends RouteName = RouteName> = Omit<
  TextProps,
  "onPress"
> & {
  href: LinkHref<N>;
  /** Stack a second copy even if the route is already open — push(). */
  push?: boolean;
  /** Swap the current card for it, with no way back — replace(). */
  replace?: boolean;
  /** Pop back to it, closing everything above — the "Close" of a modal. */
  dismissTo?: boolean;
  /** Give the press to the only child instead of rendering a <Text>. */
  asChild?: boolean;
  onPress?: (event: GestureResponderEvent) => void;
  children?: ReactNode;
};

/** The navigate functions as <Link> calls them: the href is already narrowed. */
type Go = (name: string, params?: object) => void;

const parts = (href: LinkHref<RouteName>) =>
  typeof href === "string"
    ? { pathname: href, params: undefined }
    : (href as { pathname: string; params?: object });

/**
 * A tappable route, for when the navigation *is* the interaction — no
 * onPress closure, no imperative call.
 *
 *   <Link href="/trending">Trending</Link>
 *   <Link href={{ pathname: "Topic", params: { topicId: "12" } }}>Topic 12</Link>
 *   <Link href="Trending" replace>Trending</Link>
 *
 * It renders a <Text> and takes every Text prop (style, numberOfLines, …). Use
 * `asChild` to press your own component instead — it must accept `onPress`:
 *
 *   <Link href="/trending" asChild>
 *     <Pressable><Text>Trending</Text></Pressable>
 *   </Link>
 */
export function Link<N extends RouteName>({
  href,
  push,
  replace,
  dismissTo,
  asChild,
  onPress,
  children,
  ...textProps
}: LinkProps<N>): ReactElement {
  const handlePress = (event: GestureResponderEvent) => {
    onPress?.(event);
    if (event?.defaultPrevented) return;
    const go = (
      dismissTo
        ? dismissToRoute
        : replace
          ? replaceRoute
          : push
            ? pushRoute
            : goTo
    ) as Go;
    const { pathname, params } = parts(href);
    go(pathname, params);
  };

  if (asChild) {
    const child = Children.only(children) as ReactElement<{
      onPress?: (event: GestureResponderEvent) => void;
    }>;
    return cloneElement(child, { onPress: handlePress });
  }

  return (
    <Text {...textProps} onPress={handlePress}>
      {children}
    </Text>
  );
}

/**
 * Navigates as soon as it mounts, so a guard is a `return` and not an effect:
 *
 *   if (!user) return <Redirect href="/login" />;
 */
export function Redirect<N extends RouteName>({
  href,
}: {
  href: LinkHref<N>;
}): null {
  useEffect(() => {
    const { pathname, params } = parts(href);
    // replace(), so back does not return to the screen that redirects — but a
    // <Tab>, a <Tab.Top> bar or one of its pages is not a stack card, and
    // goTo() is the only way to reach one. It rethrows an unknown route.
    try {
      (replaceRoute as Go)(pathname, params);
    } catch {
      (goTo as Go)(pathname, params);
    }
    // Redirecting once on mount is the point: the href of a mounted guard does
    // not change, and re-running would fight a user who navigated back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}
