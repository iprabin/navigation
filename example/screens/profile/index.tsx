import { back, Modal, Route, Tab } from "app-navigation";
import { EditProfile } from "./EditProfile";
import { Profile } from "./Profile";
import { Button } from "react-native";

export const profileRoutes = (
  <>
    <Tab name="Profile" options={{ title: "Profile" }}>
      <Route name="ProfileMain" component={Profile} path="profile" />
    </Tab>
    <Modal
      name="EditProfile"
      component={EditProfile}
      options={{
        title: "Edit Profile",
        headerShown: true,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerRight: () => <Button title="Done" onPress={() => back()} />,
      }}
    />
  </>
);
