import React from "react";
import { Route, Tab, Modal, Root, buildRegistry } from "../src/tree";
import { stackScreensOf, groupsOf, pagesOf, byKind, chainOf } from "../src/registry";

const Dummy = () => null;
const TABS = Number(process.env.TABS ?? 5);
const ids = Array.from({ length: TABS }, (_, i) => i);

// 100 routes: 5 tabs x (1 main + a 4-page top-tab bar + 12 stack cards,
// half of them nested two deep) + 5 shared + 5 modals + 5 root cards.
function tree() {
  const tabs = ids.map((t) => (
    <Tab key={t} name={`Tab${t}`}>
      <Route name={`Main${t}`} component={Dummy} />
      <Tab.Top name={`Bar${t}`}>
        {[0, 1, 2, 3].map((p) => (
          <Route key={p} name={`Page${t}_${p}`} component={Dummy} />
        ))}
      </Tab.Top>
      {[0, 1, 2, 3, 4, 5].map((c) => (
        <Route key={c} name={`Card${t}_${c}`} component={Dummy}>
          <Route name={`Deep${t}_${c}`} component={Dummy} />
        </Route>
      ))}
    </Tab>
  ));
  return (
    <>
      {tabs}
      {ids.map((s) => (
        <Route key={s} name={`Shared${s}`} component={Dummy} />
      ))}
      <Root>
        {ids.map((r) => (
          <Route key={r} name={`RootCard${r}`} component={Dummy} />
        ))}
      </Root>
      {ids.map((m) => (
        <Modal key={m} name={`Modal${m}`} component={Dummy} />
      ))}
    </>
  );
}

const t = tree();
buildRegistry(t); // warm
const total = byKind("tab").length + byKind("screen").length + byKind("topTab").length +
  byKind("group").length + byKind("shared").length + byKind("root").length + byKind("modal").length;
console.log("entries:", total);

const time = (label: string, n: number, fn: () => void) => {
  for (let i = 0; i < 200; i++) fn(); // warm JIT
  const s = performance.now();
  for (let i = 0; i < n; i++) fn();
  console.log(`${label}: ${((performance.now() - s) / n).toFixed(3)} ms`);
};

time("buildRegistry (walk tree + validate)", 2000, () => buildRegistry(t));

// What the synthesized navigators read on every render.
time("all registry queries one navigator pass", 5000, () => {
  byKind("tab");
  byKind("root");
  byKind("modal");
  for (const tab of byKind("tab")) {
    stackScreensOf(tab.name);
    for (const g of groupsOf(tab.name)) pagesOf(g.name);
  }
});

time("chainOf(deepest)", 20000, () => chainOf(`Deep${TABS - 1}_5`));
