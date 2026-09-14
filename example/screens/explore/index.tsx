import { Route, Tab } from "app-navigation";
import { Trending } from "./Trending";
import { Latest } from "./Latest";
import { Topic } from "./Topic";

export const exploreRoutes = (
  <Tab name="Home">
    <Tab.Top
      name="Explore"
      options={{
        headerShown: true,
        title: "Explore",
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
    >
      <Route name="Trending" component={Trending}>
        <Route name="Topic" component={Topic} path="topic" />
      </Route>
      <Route name="Latest" component={Latest} />
    </Tab.Top>
  </Tab>
);
