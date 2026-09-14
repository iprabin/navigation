import React, {
  createContext,
  lazy as reactLazy,
  Suspense,
  type ComponentType,
} from "react";
import type { ScreenComponent, ScreenEntry } from "./types";

/**
 * Marks a screen presented by the root modal navigator, so `<Header>` can drop
 * the top inset on iOS sheets. Declared here rather than next to `<Header>`
 * because this is where it is applied — and it keeps this module free of any
 * react-native import, which is what lets the self-check run under plain node.
 */
export const ModalContext = createContext(false);

/** Turning a declaration's `component`/`loader` into what a navigator mounts. */

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

const loadedComponents = new WeakMap<
  ScreenLoader<never>,
  ScreenComponent<never>
>();

/** A declaration's screen: `component`, or its `loader` wrapped once in React.lazy. */
export function componentOf(
  props: Record<string, unknown>,
): ScreenEntry["component"] {
  const loader = props.loader as ScreenLoader<never> | undefined;
  if (!loader) return props.component as ScreenEntry["component"];

  let component = loadedComponents.get(loader);
  if (!component) {
    component = reactLazy(loader) as ScreenComponent<never>;
    loadedComponents.set(loader, component);
  }
  return component;
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
    let Bounded = boundaries.get(component);
    if (!Bounded) {
      Bounded = (props: object) =>
        React.createElement(
          Suspense,
          { fallback: null },
          React.createElement(component, props),
        );
      boundaries.set(component, Bounded);
    }
    screen = Bounded;
  }

  if (entry.kind !== "modal") return screen;
  let Modal = modalLayouts.get(screen);
  if (!Modal) {
    const Screen = screen;
    Modal = (props: object) =>
      React.createElement(
        ModalContext.Provider,
        { value: true },
        React.createElement(Screen, props),
      );
    modalLayouts.set(screen, Modal);
  }
  return Modal;
}
