import { Button, ScrollView, Text } from "react-native";
import { Header, push, replace, Screen } from "app-navigation";
import type { ScreenProps } from "app-navigation";

/**
 * Its own file so the loader passed to `<Route>` in
 * Explore.tsx can keep it out of the startup path — nothing here is evaluated
 * until the screen is first shown.
 */
export function Topic({ route }: ScreenProps<{ topicId: string }>) {
  const next = String(Number(route.params.topicId) + 1);
  return (
    <Screen>
      <Header title={`Topic ${route.params.topicId}`} native />
      <ScrollView>
        <Text>topic {route.params.topicId}</Text>
        {/* push stacks another Topic; goTo would return to this one. */}
        <Button
          title={`Push topic ${next}`}
          onPress={() => push("Topic", { topicId: next })}
        />
        {/* Either form works: a route name + params, or the URL. */}
        <Button
          title={`Replace with ${next}`}
          onPress={() => replace(`/trending/topic?topicId=${next}`)}
        />
      </ScrollView>
    </Screen>
  );
}
