# app-navigation

Flat navigation for React Native: you declare *routes*, the library
synthesizes every navigator. One tree describes structure, back history and
deep links at once.

Working on the library itself? See [docs/setup.md](docs/setup.md) for the
workspace and the example app.

```sh
npm install app-navigation
# peers: @react-navigation/{native,native-stack,bottom-tabs,material-top-tabs},
#        react-native-screens, react-native-safe-area-context,
#        react-native-reanimated, react-native-pager-view
```

```tsx
import { Navigation } from 'app-navigation';

export default function App() {
  return <Navigation prefixes={['myapp://']}>{routes}</Navigation>;
}
```

## Shape

```
root stack
 ├─ "Tabs" ─ bottom tabs
 │             └─ per tab ─ native stack (every route of that tab, flat)
 │                            └─ one card per <Tab.Top> ─ top-tab bar
 ├─ root cards ─ direct screens in the root stack via <Root>
 └─ modals (siblings of the tabs)
```

You never create a navigator. You write `<Route>`, `<Tab>`, `<Tab.Top>`,
`<Root>`, `<Modal>` and screen components.

## Composing tabs and top tabs

Each feature declares what it contributes, next to the code that implements it.
`<Tab>` and `<Tab.Top>` **merge across files** — you add a screen to an
existing tab without editing anyone else's file.

```tsx
// screens/Home.tsx
export const homeRoutes = (
  <Tab name="Home" options={{ title: 'Home' }} initialRoute="HomeMain">
    <Route name="HomeMain" component={HomeMain} path="home" />
  </Tab>
);
```

```tsx
// screens/Explore.tsx — merges into the Home tab from another file
export const exploreRoutes = (
  <Tab name="Home">
    <Tab.Top name="Explore">
      <Route name="Trending" component={Trending}>
        <Route name="Topic" component={Topic} path="topic" />
      </Route>
      <Route name="Latest" component={Latest} />
    </Tab.Top>
  </Tab>
);
```

```tsx
// routes.tsx — one line per feature
export const routes = [homeRoutes, exploreRoutes, profileRoutes, contactRoutes];
```

Route names are global and unique — that is what makes `goTo('Topic')` work
from anywhere. **Nesting means one thing everywhere:** the child sits on top
of the parent in the back stack *and* after it in the URL.

## Nesting routes

The full nesting hierarchy:

```
<Tab>                    → bottom tab
  <Tab.Top>              → top-tab bar (a stack card)
    <Route>              → top-tab page
  <Route>                → screen in the tab's stack
    <Route>              → pushed on top of the parent
```

A `<Route>` nested under another `<Route>` pushes it on top in the back
stack and appends it in the URL. Here's how the tree maps to URLs:

```tsx
<Tab name="Home">
  <Tab.Top name="Explore">
    <Route name="Trending" component={Trending}>
      <Route name="Topic" component={Topic} path="topic" />
    </Route>
    <Route name="Latest" component={Latest} />
  </Tab.Top>
</Tab>
```

The tree above produces `myapp://trending/topic?topicId=12`:

| Tree node | URL segment | Why |
|---|---|---|
| `<Tab name="Home">` | — | Bottom tabs never appear in URLs |
| `<Tab.Top name="Explore">` | — | A top-tab bar is not a prefix for its pages; `explore` is its *own* URL |
| `<Route name="Trending">` | `trending` | No `path` given, so it defaults to the kebab-cased name |
| `<Route name="Topic" path="topic">` | `topic` | Nested under `Trending`, so appended after it |

`path` defaults to the kebab-cased route name (`EditProfile` → `edit-profile`);
pass `path` when you want a different segment, or `path="topic/:topicId"` for a
path param. Query params like `?topicId=12` come from `route.params`.

```
goTo('Topic', { topicId: '12' })   →  /trending/topic?topicId=12
goTo('Trending')                   →  /trending
goTo('Latest')                     →  /latest
goTo('Explore')                    →  /explore   (the bar, on its first page)
```

A nested `<Route>` under a `<Tab.Top>` page is a screen *inside* that
top-tab bar's stack — it pushes on top of the top-tab bar, not the bottom
tab's stack.

## Screens that belong to every tab

A `<Route>` declared outside every `<Tab>` is *shared*: it is mounted in each
tab's stack, so `goTo('Settings')` pushes it in the tab the user is already in,
the tab bar stays put, and back returns there.

```tsx
export const settingsRoutes = <Route name="Settings" component={Settings} path="settings" />;
```

## Root-level screens with \<Root\>

Use `<Root>` to place screens directly in the root stack — beside Tabs and
modals — without a nested navigator.

```tsx
import { Root, Route } from 'app-navigation';

export const contactRoutes = (
  <Root
    options={{
      headerShown: true,
      title: 'Contact',
      headerShadowVisible: false,
      headerBackButtonDisplayMode: 'minimal',
    }}
  >
    <Route name="Contact" component={Contact} path="contact" />
  </Root>
);
```

`options` accepts `NativeStackNavigationOptions` and is merged into every
child route — route-specific options override the group defaults.

### Top-tab bar options

`<Tab.Top>` has two option slots, because it is two things: a card in the
stack, and a bar with pages. `stackOptions` is the card (header, title),
`topTabOptions` is the bar and its pages:

```tsx
<Tab.Top
  name="Explore"
  stackOptions={{ headerShown: true, title: 'Explore' }}
  topTabOptions={{
    tabBarScrollEnabled: true,
    tabBarItemStyle: { width: 'auto' },
  }}
>
```

Scrolling is what you want once the tabs stop fitting the screen width.

### Reading the focused page

`useFocusedTopTab(bar)` returns the page of a `<Tab.Top>` that is focused
right now, and re-renders on every swipe or tap of the bar. It reads the
container, so it works anywhere under `<Navigation>` — including the header
*above* the bar, which is a stack card and has no other way to see it:

```tsx
function ExploreTitle() {
  const page = useFocusedTopTab('Explore'); // 'Trending' | 'Latest' | …
  return <Text>{page ?? 'Explore'}</Text>;
}

<Tab.Top
  name="Explore"
  stackOptions={{ headerShown: true, headerTitle: () => <ExploreTitle /> }}
>
```

`headerLeft` and `headerRight` are component slots as well, so a bar item
follows the page the same way — put the hook in the item, not in the options:

```tsx
function ExploreRight() {
  const page = useFocusedTopTab('Explore');
  return page === 'Trending' ? <ShareButton /> : <FilterButton page={page} />;
}

stackOptions={{ headerShown: true, headerRight: () => <ExploreRight /> }}
```

The options object itself is read once, so don't try to branch inside it — the
slot component re-renders on its own. `headerLeft` replaces the native back
button, so render your own back affordance if the card can be pushed onto.

`focusedTopTab('Explore')` is the same value outside React — analytics, or a
`goTo()` decision. Both are `undefined` until that bar is mounted.

## Modal screens

```tsx
<Modal
  name="EditProfile"
  component={EditProfile}
  options={{ headerShown: false }}
/>
```

Modals are presented over everything, siblings of the tab navigator. Use
`<Header native>` inside modal screens to configure the native bar — no
`headerShown: false` needed in that case.

## Global screen options

Set defaults for every screen of a given kind. Per-screen options always win.

```tsx
import { configureNavigationOptions } from 'app-navigation';

configureNavigationOptions({
  root: {
    headerShown: true,
    headerShadowVisible: false,
    headerBackButtonDisplayMode: 'minimal',
  },
  shared: { headerShown: false },
  modal: { presentation: 'modal', headerShown: true },
});
```

All three keys are optional. The type is `NativeStackNavigationOptions`.
`root` covers `<Root>` cards, `modal` covers `<Modal>`, and `shared` covers
every card in a tab's stack — its own `<Route>`s as well as shared ones.

## Tab bar icons

`<Tab options>` is React Navigation's `BottomTabNavigationOptions`, so the icon
is `tabBarIcon` — declared on the tab itself, in the feature file that owns it.
The library ships no icon set; use whichever one the app already has.

```tsx
<Tab
  name="Home"
  options={{
    title: 'Home',
    tabBarIcon: ({ focused, color, size }) => (
      <Ionicons name={focused ? 'home' : 'home-outline'} color={color} size={size} />
    ),
  }}
/>
```

`<Route options>` is `NativeStackNavigationOptions` (or
`MaterialTopTabNavigationOptions` for a `<Tab.Top>` page), `<Modal options>` and
`<Root options>` are `NativeStackNavigationOptions`, and `<Tab.Top>` splits its
two: `stackOptions` for the card, `topTabOptions` for the bar.

## NavigationContainer props

Everything `NavigationContainer` takes passes straight through. Only `linking`
is off-limits — it is derived from the tree. `theme` is accepted and forwarded,
widened to also take `{ light, dark }` (see below).

```tsx
<Navigation
  prefixes={['myapp://']}
  onReady={() => SplashScreen.hide()}
  onStateChange={(state) => analytics.screen(state)}
  fallback={<Splash />}
>
  {routes}
</Navigation>
```

## Dark and light theme

Nothing to switch on: the app follows the OS setting, using React Navigation's
default light and dark palettes. Headers, tab bars, cards and the JS `<Header>`
all read from it.

Pass your own to override:

```tsx
import { Navigation, DefaultTheme, DarkTheme } from 'app-navigation';

const light = { ...DefaultTheme, colors: { ...DefaultTheme.colors, primary: '#0a7' } };
const dark = { ...DarkTheme, colors: { ...DarkTheme.colors, primary: '#0fb' } };

<Navigation prefixes={[…]} theme={{ light, dark }}>{routes}</Navigation>
```

Pass a single theme instead of `{ light, dark }` to pin the app to it and ignore
the OS setting.

Your own screens read the current palette with `useTheme()`:

```tsx
import { useTheme } from 'app-navigation';

const { colors, dark } = useTheme();
<View style={{ backgroundColor: colors.background }} />
```

## Screens and headers

```tsx
export function ProfileMain() {
  return (
    <Screen>
      <Header title="Profile" left={<Text>☰</Text>} right={<Button title="Edit" … />} />
      <ScrollView>…</ScrollView>
    </Screen>
  );
}
```

- `<Header title left right />` — default bar, JS-rendered, notch-safe.
- `<Header>{({ back, navigation, route, options }) => …}</Header>` — fully
  custom; `left`/`right` accept the same function form (`NativeStackHeaderProps`).
- `<Header native title="Home" options={{ headerLargeTitle: true }} />` —
  platform header with large titles, blur, search bars and native back.
- No `<Header>` — the stack's default header.

## Deferring screens off the startup path

```tsx
import { Route, lazy } from 'app-navigation';

<Route name="Topic" loader={lazy(() => import('./Topic'), 'Topic')} path="topic" />
```

Metro still bundles the module but does not *evaluate* it until the screen is
first shown. Use `loader={lazy(...)}` for screens behind a tap and leave the
ones each tab opens on eager.

## Types

Every name and param is typed via a codegen — nobody hand-writes the type map.

```tsx
export function Topic({ route }: ScreenProps<{ topicId: string }>) {
  return <Text>{route.params.topicId}</Text>;
}
```

```sh
npx app-navigation-codegen           # one-shot
npx app-navigation-codegen --watch   # rewrite on every save
```

```ts
// generated/routes.d.ts — do not edit
declare module 'app-navigation' {
  interface RouteParams {
    Topic: { topicId: string };
    Contact: undefined;
  }
}
```

### Keeping it current

Wrap your Metro config so `expo start` is the only thing anyone has to run:

```js
// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const { withRouteTypes } = require('app-navigation/metro');

module.exports = withRouteTypes(getDefaultConfig(__dirname));
```

It starts the watcher in dev (skipped when `NODE_ENV=production`), uses the
config's own `projectRoot`, and returns the config untouched.

```json
"typecheck": "app-navigation-codegen && tsc --noEmit"
```

`--check` fails instead of writing, if you would rather CI catch a stale file.

## Navigating

```tsx
import { goTo, push, back } from 'app-navigation';

goTo('Topic', { topicId: '12' });   // typed name, typed params
push('/trending/topic?topicId=12'); // same thing, URL-first
push('myapp://trending/topic');     // any scheme:// is stripped first
back();                             // one step, no-op at the root
```

`goTo` walks the route's ancestor chain, so arriving from anywhere leaves the
same back stack a deep link would. `push` just resolves the URL to a name and
params and calls `goTo` — it throws if nothing matches. React Navigation's
`<Link>` and `useLinkTo` work too; the same linking config drives them.

## Deep links

`<Navigation prefixes={[...]}>` is the whole setup — the link config is derived
from the tree, so there is no second table to keep in sync.

```tsx
<Navigation prefixes={['myapp://', 'https://myapp.com']}>{routes}</Navigation>
```

A URL is matched against the flattened route table (longest path first, so
`/trending/topic` wins over `/trending`), then the target's ancestor chain is
expanded into a real back stack:

| Link | Lands on | Back stack it restores |
|---|---|---|
| `myapp://trending/topic?topicId=12` | `Topic` | `HomeMain` → `Explore` (bar on `Trending`) → `Topic { topicId: '12' }` |
| `myapp://trending` | `Trending` | `HomeMain` → `Explore` (bar on `Trending`) |
| `myapp://explore` | the top-tab bar | `HomeMain` → `Explore` (its first page) |
| `myapp://profile` | `ProfileMain` | the Profile tab |
| `myapp://contact` | a `<Root>` card | `Tabs` → `Contact`, a sibling of the tabs |
| `myapp://edit-profile` | a `<Modal>` | `Tabs` → `EditProfile`, presented over them |
| `myapp://settings` | a shared route | opened in the first tab on a cold link |

So a cold `myapp://trending/topic?topicId=12` gives:

```
HomeMain  →  Explore (Trending)  →  Topic { topicId: '12' }
                                     ↑ focused

back →  Explore (Trending)   back →  HomeMain   back →  stays in the app
```

The rules behind that:

- **The chain is the history.** Nesting a `<Route>` under another is what puts
  the parent underneath it in the stack — the same nesting that appends the
  URL segment.
- **The tab's `initialRoute` goes in first** (`HomeMain` above), so back from a
  cold link never drops the user straight out of the app.
- **A top-tab page costs one card.** Its bar (`Explore`) is the stack card, and
  the bar opens focused on the linked page.
- **Params are strings.** Path params (`path="topic/:topicId"`) and query
  params both land in `route.params`; there is no coercion.
- **Unknown paths fall through** — no match means no state, and React
  Navigation ignores the link instead of guessing.
- **State → URL too.** Wherever the user navigates, `getPathFromState` prints
  the focused route's full path back out, so a link, `push()` and `goTo()` all
  agree on one URL per screen.

Testing links in Expo Go: its URLs are `exp://<host>:8081/--/<path>`, so add
`exp://127.0.0.1:8081/--` to `prefixes` in dev (or `expo-linking`'s
`Linking.createURL('/')`), then:

```sh
npx uri-scheme open "exp://127.0.0.1:8081/--/trending/topic?topicId=12" --ios
```

## Files

Under `packages/app-navigation/`:

| | |
|---|---|
| `src/tree.tsx` | `<Tab>`, `<Root>`, `<Tab.Top>`, `<Route>`, `<Modal>` and the tree walker |
| `src/registry.ts` | the flattened route table (names, paths, ancestors) |
| `src/linking.ts` | URL <-> state, including the ancestor chain as history |
| `src/navigators.tsx` | every navigator, synthesized from the registry; `configureNavigationOptions` |
| `src/Navigation.tsx` | the container — pass it `prefixes` and the tree |
| `src/navigate.ts` | `goTo`, `push`, `back`, `useFocusedTopTab`, `navigationRef` |
| `src/screens.tsx` | `lazy()` and what a navigator actually mounts for a route |
| `src/Screen.tsx`, `src/Header.tsx` | `<Screen>`, `<Header>` |
| `bin/codegen.js` | derives `RouteParams` from the tree via the TS checker (`--watch`) |
| `generated/routes.d.ts` | its output, referenced by `src/index.ts` |
| `test/linking.check.ts` | self-check for the URL <-> state <-> history rules (`npm run check`) |
