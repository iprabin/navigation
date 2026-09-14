import { Button, ScrollView, Text } from "react-native";
import { Header, Screen } from "app-navigation";
import type { ScreenProps } from "app-navigation";

/**
 * Its own file so the loader passed to `<Route>` in
 * Explore.tsx can keep it out of the startup path — nothing here is evaluated
 * until the screen is first shown.
 */
export function Topic({ route }: ScreenProps<{ topicId: string }>) {
  return (
    <Screen>
      <Header title={`Topic ${route.params.topicId}`} native />
      <ScrollView>
        <Text>topic {route.params.topicId}</Text>
      </ScrollView>
    </Screen>
  );
}
