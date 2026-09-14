import { Button, ScrollView, Text } from "react-native";
import { Header, Link, Route, Screen, Tab, goTo } from "app-navigation";

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
        <Link href={{ pathname: "Topic", params: { topicId: "13" } }}>
          Topic 13, as a link
        </Link>
      </ScrollView>
    </Screen>
  );
}
