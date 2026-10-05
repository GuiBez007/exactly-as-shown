import type { TreeNode } from "@/lib/types";

const f = (name: string): TreeNode => ({ name, type: "file" });
const d = (name: string, children: TreeNode[] = []): TreeNode => ({ name, type: "folder", children });

/** Simulated project structure (used only when real file access is unavailable). */
export const SAMPLE_PROJECT_TREE: TreeNode[] = [
  d("public"),
  d("src", [
    d("assets"),
    d("components", [d("Button", [f("index.tsx"), f("styles.ts")])]),
    d("contexts"),
    d("hooks"),
    d("pages", [d("Home", [f("index.tsx"), d("components")])]),
    d("services"),
    d("styles"),
    d("utils"),
    f("App.tsx"),
    f("main.tsx"),
  ]),
];
