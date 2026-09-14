import { ScrollView, Text, Button } from "react-native";
import { Root, Header, Route, Screen, back } from "app-navigation";

function Contact() {
  return (
    <Screen>
      <Header native title="Contact" />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        <Text>contact</Text>
        <Button title="Go back" onPress={() => back()} />
      </ScrollView>
    </Screen>
  );
}

/**
 * <Root> places Contact as a direct root card beside Tabs and modals —
 * no nested ContactStack. goTo('Contact') pushes it in the root navigator.
 */
export const contactRoutes = (
  <Root options={{ headerBackButtonDisplayMode: "minimal" }}>
    <Route name="Contact" component={Contact} path="contact" />
  </Root>
);
