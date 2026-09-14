# navigation

npm workspace:

| | |
|---|---|
| `packages/app-navigation` | the library — [docs](packages/app-navigation/README.md) |
| `example` | an Expo app that consumes it |

```sh
npm install
npm start        # run the example (Expo) — also starts the route-type watcher
npm run check    # the library's URL <-> state <-> history self-check
npm run typecheck  # regenerates packages/app-navigation/generated/routes.d.ts, then tsc
```

The example resolves `app-navigation` through the workspace symlink and Metro
watches the package source, so editing the library hot-reloads the app.
