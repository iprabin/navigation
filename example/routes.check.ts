/**
 * Type-level check of the generated navigation.d.ts. Each `@ts-expect-error`
 * fails `npm run typecheck` if the line stops being an error — so this catches
 * the codegen emitting looser types than the screens actually declare.
 */
import { goTo, push, replace } from "app-navigation";

export function typedRoutes() {
  goTo("Topic", { topicId: "12" });
  goTo("Contact");
  // @ts-expect-error unknown route name
  goTo("Topik", { topicId: "12" });
  // @ts-expect-error missing required param
  goTo("Topic", {});
  // @ts-expect-error wrong param type
  goTo("Topic", { topicId: 12 });

  // A URL is accepted in place of a name, by all three — its params come from
  // the path and query, so none are passed.
  goTo("/trending/topic?topicId=12");
  push("/trending/topic?topicId=12");
  replace("myapp://trending/topic?topicId=12");
  // @ts-expect-error a path must start with "/" or a scheme, or be a route name
  push("trending/topic");
}
