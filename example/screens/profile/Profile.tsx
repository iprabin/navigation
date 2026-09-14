import { Button, ScrollView, Text } from "react-native";
import { Header, Screen, goTo } from "app-navigation";

export function Profile() {
  return (
    <Screen>
      <Header
        title="Profile"
        left={<Text>☰</Text>}
        right={<Button title="Edit" onPress={() => goTo("EditProfile")} />}
      />
      <ScrollView>
        <Text>profile</Text>
        <Button title="Contact" onPress={() => goTo("Contact")} />
      </ScrollView>
    </Screen>
  );
}
