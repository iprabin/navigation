import React, {
  useLayoutEffect,
  useMemo,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import { View, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import { Header, HeaderBar, useHeaderProps, type HeaderProps } from "./Header";

type ScreenProps = { children: ReactNode };

const isHeader = (node: ReactNode): node is ReactElement<HeaderProps> =>
  React.isValidElement(node) && node.type === Header;

/** Cheap change detector: visible props matter, closures are read via ref. */
const signature = (value: unknown): string =>
  JSON.stringify(value, (_key, v) => {
    if (typeof v === "function") return "fn";
    // Elements are unwrapped at every depth: a raw element carries `_owner`,
    // a Fiber with cyclical links that JSON.stringify chokes on.
    if (React.isValidElement(v)) {
      const type = v.type as { displayName?: string; name?: string };
      return {
        type: typeof v.type === "string" ? v.type : type.displayName ?? type.name,
        props: v.props,
      };
    }
    return v;
  }) ?? "";

/**
 * Wraps a screen body and picks up its optional `<Header>`.
 *
 *   <Screen>
 *     <Header title="Home" right={<Button title="Edit" onPress={…} />} />
 *     <ScrollView>…</ScrollView>
 *   </Screen>
 *
 * A custom header renders here, in the screen, so it re-renders with the
 * screen like any other component. `<Header native>` instead configures the
 * platform header, keeping large titles, blur and search bars intact.
 *
 * The header work lives in the two null-rendering children below, so a screen
 * without one subscribes to nothing and re-renders on nothing but its own
 * state — <Screen> itself holds no navigation subscription.
 */
export function Screen({ children }: ScreenProps): ReactElement {
  const { header, body } = useMemo(() => {
    const nodes = React.Children.toArray(children);
    return {
      header: nodes.find(isHeader),
      body: nodes.filter((node) => !isHeader(node)),
    };
  }, [children]);

  if (!header) return <>{body}</>;
  // Rendered last so its setOptions still lands after the body's own effects,
  // as it did when this ran from <Screen> itself.
  if (header.props.native) {
    return (
      <>
        {body}
        <NativeHeader {...header.props} />
      </>
    );
  }
  return (
    <View style={styles.fill}>
      <HeaderBar {...header.props} />
      <View style={styles.fill}>{body}</View>
      <HideNativeHeader title={header.props.title} />
    </View>
  );
}

/** `<Header native>`: pushes the declaration into the platform header. */
function NativeHeader(props: HeaderProps): null {
  const navigation = useNavigation();
  const slots = useRef({ left: props.left, right: props.right });
  slots.current = { left: props.left, right: props.right };
  const headerProps = useHeaderProps(props.options ?? {});
  const sig = signature([
    props.title,
    props.options,
    signature(props.left),
    signature(props.right),
  ]);

  useLayoutEffect(() => {
    const options: NativeStackNavigationOptions = {
      headerShown: true,
      ...props.options,
      ...(props.title !== undefined ? { title: props.title } : null),
      // ponytail: slots read the latest closure via ref, but a native header
      // item only re-renders when `sig` changes — bump a visible prop (or call
      // navigation.setOptions) if you need it driven by screen state alone.
      ...(props.left
        ? { headerLeft: () => <>{renderSlot(slots.current.left, headerProps)}</> }
        : null),
      ...(props.right
        ? {
            headerRight: () => (
              <>{renderSlot(slots.current.right, headerProps)}</>
            ),
          }
        : null),
    };
    navigation.setOptions(options);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation, sig]);
  return null;
}

/**
 * A JS header owns the bar, so the native one is off. `title` still matters:
 * it is what the *next* screen's native back button is labelled with.
 */
function HideNativeHeader({ title }: { title?: string }): null {
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
      ...(title ? { title } : null),
    });
  }, [navigation, title]);
  return null;
}

function renderSlot(
  slot: HeaderProps["left"],
  headerProps: ReturnType<typeof useHeaderProps>,
) {
  return typeof slot === "function" ? slot(headerProps) : slot;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
