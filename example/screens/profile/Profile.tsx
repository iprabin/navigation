import { Button, Pressable, ScrollView, Text } from "react-native";
import { Header, Screen, goTo, useTheme } from "app-navigation";

export function Profile() {
  const { colors } = useTheme(); // just to show that hooks work in screens, too
  return (
    <Screen>
      <Header
        title="Profile"
        native
        left={
          <Pressable onPress={() => goTo("Explore")}>
            <Text style={{ color: colors.text, fontSize: 30 }}>☰</Text>
          </Pressable>
        }
        right={<Button title="Edit" onPress={() => goTo("EditProfile")} />}
      />
      <ScrollView>
        <Text>profile</Text>
        <Button title="Contact" onPress={() => goTo("Contact")} />
      </ScrollView>
    </Screen>
  );
}
