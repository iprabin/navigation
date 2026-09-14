import React, { createContext, useContext, type ReactNode } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import {
  useNavigation,
  useNavigationState,
  useRoute,
  useTheme,
} from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  NativeStackHeaderProps,
  NativeStackNavigationOptions,
  NativeStackNavigationProp,
} from "@react-navigation/native-stack";

type Slot = ReactNode | ((props: NativeStackHeaderProps) => ReactNode);

export type HeaderProps = {
  /** Render the platform's own header instead of a JS one (large title, blur, search bar). */
  native?: boolean;
  title?: string;
  /** Left/right button areas. Functions receive the same props native-stack gives a header. */
  left?: Slot;
  right?: Slot;
  /** Replaces the whole default bar. Use for a fully custom header. */
  children?: Slot;
  animated?: boolean;
  /** Override the automatic top-safe-area handling for this JS header. */
  safeTop?: boolean;
  /** Anything else is a native-stack option (headerTintColor, headerLargeTitle, ...). */
  options?: NativeStackNavigationOptions;
};

const HeaderModalContext = createContext(false);

/** Internal: marks a screen presented by the root modal navigator. */
export function HeaderModalProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <HeaderModalContext.Provider value>
      {children}
    </HeaderModalContext.Provider>
  );
}

const render = (slot: Slot, props: NativeStackHeaderProps): ReactNode =>
  typeof slot === "function" ? slot(props) : slot;

/**
 * `<Header>` is read by `<Screen>`, never rendered on its own.
 *
 *   <Header title="Home" right={<Button .../>} />           default bar, JS-rendered
 *   <Header>{({ back, navigation }) => <MyBar … />}</Header> fully custom
 *   <Header native title="Home" options={{ headerLargeTitle: true }} />  platform header
 */
export function Header(_: HeaderProps): React.ReactElement | null {
  return null;
}

/** Props native-stack would have passed, rebuilt for a header rendered in-screen. */
export function useHeaderProps(
  options: NativeStackNavigationOptions,
): NativeStackHeaderProps {
  const navigation =
    useNavigation<
      NativeStackNavigationProp<Record<string, object | undefined>>
    >();
  const route = useRoute();
  const previous = useNavigationState(
    (state) => state.routes[state.index - 1]?.name,
  );

  return {
    navigation,
    route,
    options,
    back: previous ? { title: previous, href: undefined } : undefined,
  };
}

/** The default bar: left … title … right, padded out of the notch. */
export function HeaderBar({
  title,
  left,
  right,
  children,
  animated = true,
  safeTop,
  options = {},
}: HeaderProps): React.ReactElement {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const isModal = useContext(HeaderModalContext);
  const headerProps = useHeaderProps(options);
  const Container = animated ? Animated.View : View;
  // Standard iOS modals are sheets and sit below the status bar. Android
  // modals remain full-screen, so they retain their top safe-area inset.
  const shouldInsetTop = safeTop ?? (!isModal || Platform.OS !== "ios");

  const content = children ? (
    render(children, headerProps)
  ) : (
    <View style={styles.row}>
      <View style={styles.side}>{render(left, headerProps)}</View>
      <Text numberOfLines={1} style={[styles.title, { color: colors.text }]}>
        {title ?? ""}
      </Text>
      <View style={[styles.side, styles.right]}>
        {render(right, headerProps)}
      </View>
    </View>
  );

  return (
    <Container
      entering={animated ? FadeIn.duration(180) : undefined}
      style={{
        backgroundColor: colors.card,
        paddingTop: shouldInsetTop ? insets.top : 0,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      {content}
    </Container>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: Platform.select({ ios: 44, default: 56 }),
    paddingHorizontal: 12,
    gap: 8,
  },
  side: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 56 },
  right: { justifyContent: "flex-end" },
  title: { flex: 1, fontSize: 17, fontWeight: "600", textAlign: "center" },
});
