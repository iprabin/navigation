import React, {
  lazy as reactLazy,
  Suspense,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { register, reset, validate } from "./registry";
import { HeaderModalProvider } from "./primitives/Header";
import type { ScreenComponent, ScreenEntry } from "./types";

/**
 * The navigation tree. You describe *structure* here and nothing else —
 * no navigator is ever instantiated by hand (see navigators.tsx).
 *
 *   <Tab name="Home">
 *     <Route name="HomeMain" component={HomeMain} />
 *     <Tab.Top name="Explore">
 *       <Route name="Trending" component={Trending}>
 *         <Route name="Topic" component={Topic} path="topic" />
 *       </Route>
 *     </Tab.Top>
 *   </Tab>
 *
 * Nesting means one thing everywhere: the child sits on top of the parent in
 * the back stack AND after it in the URL. So /trending/topic?topicId=12
 * restores HomeMain -> Explore(Trending) -> Topic, not just Topic.
 *
 * A <Route> placed outside every <Tab> is *shared*: it is mounted in each
 * tab's stack, so goTo('Contact') pushes it in whichever tab the user is in
 * and back returns there — the tab bar never disappears.
 *
 * These components are never rendered; they are read as a description.
 */

export type ScreenLoader<P> = () => Promise<{ default: ScreenComponent<P> }>;

type ScreenParams<Component> =
  Component extends ScreenComponent<infer P> ? P : never;

/** Creates a screen loader from a module import and an optional named export. */
export function lazy<Module extends { default: unknown }>(
  load: () => Promise<Module>,
): ScreenLoader<ScreenParams<Module["default"]>>;
export function lazy<Module extends object, ExportName extends keyof Module>(
  load: () => Promise<Module>,
  exportName: ExportName,
): ScreenLoader<ScreenParams<Module[ExportName]>>;
export function lazy(
  load: () => Promise<object>,
  exportName: PropertyKey = "default",
): ScreenLoader<any> {
  return async () => {
    const module = await load();
    const component = (module as Record<PropertyKey, unknown>)[exportName];
    if (
      component == null ||
      (typeof component !== "function" && typeof component !== "object")
    ) {
      throw new Error(
        `[navigation] Lazy screen export "${String(exportName)}" is not a component.`,
      );
    }
    return { default: component as ScreenComponent<any> };
  };
}

type ScreenSource<P> =
  | { component: ScreenComponent<P>; loader?: never }
  | { component?: never; loader: ScreenLoader<P> };

type RouteProps<P> = {
  /**
   * Globally unique. A declaration *creates* a name — it is deliberately a
   * plain string, so adding a screen never fails to compile against a
   * RouteParams that has not been regenerated yet. goTo() is where names are
   * checked, against the generated file.
   */
  name: string;
  /** URL segment. Defaults to a kebab-cased `name`. Use ':param' for path params. */
  path?: string;
  options?: object;
  /** Routes that stack on top of this one. */
  children?: ReactNode;
} & ScreenSource<P>;

export function Route<P>(_: RouteProps<P>): ReactElement | null {
  return null;
}

type TabProps = {
  name: string;
  options?: object;
  /** Route this tab opens on, and the one deep links land behind. Defaults to the first child. Checked by validate(). */
  initialRoute?: string;
  children?: ReactNode;
};

function TabImpl(_: TabProps): ReactElement | null {
  return null;
}

type TopProps = {
  name: string;
  path?: string;
  /** The stack card hosting the bar: header, title, ... */
  stackOptions?: object;
  /** The bar itself and its pages, e.g. tabBarScrollEnabled. */
  topTabOptions?: object;
  children?: ReactNode;
};

function Top(_: TopProps): ReactElement | null {
  return null;
}

/** `<Tab>` = bottom tab. `<Tab.Top>` = a top-tab bar inside it. */
export const Tab = Object.assign(TabImpl, { Top });

export function Modal<P>(
  _: {
    name: string;
    path?: string;
    options?: object;
  } & ScreenSource<P>,
): ReactElement | null {
  return null;
}

type RootProps = {
  options?: NativeStackNavigationOptions;
  children?: ReactNode;
};

/** Groups child routes as direct cards in the app's root stack, beside Tabs. */
export function Root(_: RootProps): ReactElement | null {
  return null;
}

const kebab = (name: string) =>
  name.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();

const childrenOf = (node: ReactNode): ReactElement[] =>
  React.Children.toArray(node).filter(React.isValidElement) as ReactElement[];

type Context = {
  tab?: string;
  group?: boolean;
  groupOptions?: object;
  topTabGroup?: string;
  parent?: string;
};

const loadedComponents = new WeakMap<
  ScreenLoader<never>,
  ScreenComponent<never>
>();

function componentOf(props: Record<string, unknown>): ScreenEntry["component"] {
  const loader = props.loader as ScreenLoader<never> | undefined;
  if (!loader) return props.component as ScreenEntry["component"];

  let component = loadedComponents.get(loader);
  if (!component) {
    component = reactLazy(loader) as ScreenComponent<never>;
    loadedComponents.set(loader, component);
  }
  return component;
}

function walk(nodes: ReactNode, ctx: Context): void {
  for (const el of childrenOf(nodes)) {
    const props = el.props as Record<string, unknown>;

    if (el.type === React.Fragment) {
      walk(props.children as ReactNode, ctx);
      continue;
    }

    if (el.type === Root) {
      if (ctx.tab) {
        throw new Error(
          "[navigation] <Root> can only be declared at the root of the navigation tree.",
        );
      }
      walk(props.children as ReactNode, {
        ...ctx,
        group: true,
        groupOptions: props.options as object | undefined,
      });
      continue;
    }

    const name = props.name as string;
    const path = (props.path as string | undefined) ?? kebab(name);
    const options = props.options as object | undefined;

    if (el.type === TabImpl) {
      if (ctx.tab) {
        throw new Error(
          "[navigation] <Tab> can only be declared at the root of the navigation tree.",
        );
      }
      const first = childrenOf(props.children as ReactNode)[0]?.props as
        | { name?: string }
        | undefined;
      const entry = register({
        name,
        kind: "tab",
        tab: name,
        path: "",
        options,
        initialRoute: first?.name,
      });
      // An explicit initialRoute beats another file's implicit default (its
      // first child), whichever declaration the registry saw first.
      if (props.initialRoute) entry.initialRoute = props.initialRoute as string;
      walk(props.children as ReactNode, { tab: name });
      continue;
    }

    if (el.type === Top) {
      if (!ctx.tab)
        throw new Error(
          "[navigation] <Tab.Top> must be declared inside a <Tab>.",
        );
      register({
        name,
        kind: "group",
        tab: ctx.tab,
        parent: ctx.parent,
        path,
        options: props.stackOptions as object | undefined,
        screenOptions: props.topTabOptions as object | undefined,
      });
      walk(props.children as ReactNode, {
        tab: ctx.tab,
        topTabGroup: name,
        parent: ctx.parent,
      });
      continue;
    }

    if (el.type === Modal) {
      register({
        name,
        kind: "modal",
        component: componentOf(props),
        path,
        options,
      });
      continue;
    }

    if (el.type === Route) {
      // Outside any <Tab>, a route belongs to all of them.
      const kind = ctx.group
        ? "root"
        : !ctx.tab
          ? "shared"
          : ctx.topTabGroup
            ? "topTab"
            : "screen";
      register({
        name,
        kind,
        component: componentOf(props),
        tab: ctx.tab,
        topTabGroup: ctx.topTabGroup,
        parent: ctx.parent,
        path,
        options:
          ctx.groupOptions || options
            ? { ...(ctx.groupOptions as object), ...(options as object) }
            : undefined,
      });
      // Children of a top-tab page are pushed on the *stack*, not the tab bar.
      walk(props.children as ReactNode, {
        tab: ctx.tab,
        parent: name,
      });
      continue;
    }

    throw new Error(
      "[navigation] The navigation tree only accepts <Tab>, <Root>, <Tab.Top>, <Route> and <Modal>.",
    );
  }
}

/** Reads the tree into the registry. Called once per render of <Navigation>. */
export function buildRegistry(tree: ReactNode): void {
  reset();
  walk(tree, {});
  validate();
}

const LAZY = Symbol.for("react.lazy");
const boundaries = new WeakMap<object, ComponentType<object>>();
const modalLayouts = new WeakMap<ComponentType<object>, ComponentType<object>>();

/**
 * What React Navigation actually mounts for an entry.
 *
 *   <Route name="Topic" loader={lazy(() => import('./Topic'), 'Topic')} />
 *
 * keeps that screen's module out of the startup path: Metro still bundles it,
 * but never *evaluates* it until the screen is first shown. That is the cost
 * that grows with screen count — the registry walk is microseconds.
 *
 * A lazy screen suspends on its first render, so it needs its own boundary;
 * without one the nearest ancestor suspends and the navigator above it
 * unmounts. The wrapper is cached per component because a fresh identity each
 * render would remount the screen on every navigation.
 */
export function screenComponent(entry: ScreenEntry): ComponentType<object> {
  const component = entry.component as unknown as ComponentType<object>;
  let screen = component;
  if ((component as { $$typeof?: symbol } | undefined)?.$$typeof === LAZY) {
    let bounded = boundaries.get(component);
    if (!bounded) {
      bounded = (props: object) =>
        React.createElement(
          Suspense,
          { fallback: null },
          React.createElement(component, props),
        );
      boundaries.set(component, bounded);
    }
    screen = bounded;
  }

  if (entry.kind !== "modal") return screen;
  let modal = modalLayouts.get(screen);
  if (!modal) {
    const Screen = screen;
    modal = (props: object) =>
      React.createElement(
        HeaderModalProvider,
        null,
        React.createElement(Screen, props),
      );
    modalLayouts.set(screen, modal);
  }
  return modal;
}
