import "react-native-gesture-handler";
import { configureNavigationOptions, Navigation } from "app-navigation";
import { routes } from "./routes";

configureNavigationOptions({
  root: {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
  },
  shared: {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: "minimal",
  },
});

export default function App() {
  return (
    <Navigation prefixes={["myapp://", "https://myapp.com"]}>
      {routes}
    </Navigation>
  );
}
