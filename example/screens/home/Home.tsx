import { Button, ScrollView, Text } from "react-native";
import { Header, Route, Screen, Tab, goTo } from "app-navigation";

export function Home() {
  return (
    <Screen>
      <Header native title="Home" options={{ headerLargeTitle: true }} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text>home</Text>
        <Button title="Explore" onPress={() => goTo("Trending")} />
        <Button
          title="Open topic 12"
          onPress={() => goTo("Topic", { topicId: "12" })}
        />
        <Button title="Contact" onPress={() => goTo("Contact")} />
      </ScrollView>
    </Screen>
  );
}
