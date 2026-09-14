import { Route, Tab } from "app-navigation";
import { ScrollView, Text } from "react-native";
import { Trending } from "./Trending";
import { Latest } from "./Latest";
import { Topic } from "./Topic";

const placeholder = (label: string) => () => (
  <ScrollView>
    <Text>{label}</Text>
  </ScrollView>
);

const Following = placeholder("following");
const News = placeholder("news");
const Sports = placeholder("sports");
const Music = placeholder("music");
const Gaming = placeholder("gaming");

export const exploreRoutes = (
  <Tab name="Home">
    <Tab.Top
      name="Explore"
      stackOptions={{
        headerShown: true,
        title: "Explore",
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
      }}
      topTabOptions={{
        tabBarScrollEnabled: true,
        tabBarItemStyle: { width: "auto" },
      }}
    >
      <Route name="Trending" component={Trending}>
        <Route name="Topic" component={Topic} path="topic" />
      </Route>
      <Route name="Latest" component={Latest} />
      <Route name="Following" component={Following} />
      <Route name="News" component={News} />
      <Route name="Sports" component={Sports} />
      <Route name="Music" component={Music} />
      <Route name="Gaming" component={Gaming} />
    </Tab.Top>
  </Tab>
);
