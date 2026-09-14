import { Route, Tab } from "app-navigation";
import { Home } from "./Home";

export const homeRoutes = (
  <Tab name="Home" options={{ title: "Home" }} initialRoute="HomeMain">
    <Route name="HomeMain" component={Home} path="home" />
  </Tab>
);
