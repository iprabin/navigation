import Ionicons from "@expo/vector-icons/Ionicons";
import { Route, Tab } from "app-navigation";
import { Home } from "./Home";

export const homeRoutes = (
  <Tab
    name="Home"
    options={{
      title: "Home",
      tabBarIcon: ({ focused, color, size }) => (
        <Ionicons
          name={focused ? "home" : "home-outline"}
          color={color}
          size={size}
        />
      ),
    }}
    initialRoute="HomeMain"
  >
    <Route name="HomeMain" component={Home} path="home" />
  </Tab>
);
