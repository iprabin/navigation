import { Button, ScrollView, Text } from "react-native";
import { Header, goTo, Screen, Route } from "app-navigation";

const Test = () => {
  return (
    <Screen>
      <Header native title="Test" />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text>Test</Text>
        <Button
          title="Go back"
          onPress={() => goTo("Topic", { topicId: "27" })}
        />
      </ScrollView>
    </Screen>
  );
};

export const testRoutes = <Route name="Test" component={Test} path="Test" />;
