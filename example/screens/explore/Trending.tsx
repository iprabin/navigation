import { goTo } from "app-navigation";
import { Button, ScrollView, Text } from "react-native";

export function Trending() {
  return (
    <ScrollView>
      <Text>trending</Text>
      <Button
        title="Topic 12"
        onPress={() => goTo("Topic", { topicId: "12" })}
      />
    </ScrollView>
  );
}
