import type { TreeNode } from "@/lib/types";
import type { FileSystemService, OsResult } from "./types";

const DESKTOP_ONLY: OsResult = {
  ok: false,
  reason: "requires-desktop",
  message: "Esta ação precisa da versão desktop do Ambientes. O navegador não tem acesso ao Windows.",
};

const IGNORED = new Set(["node_modules", ".git", "dist", "build", ".next", ".cache"]);
const MAX_ENTRIES = 600;
const MAX_DEPTH = 5;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DirHandle = any;

async function readTree(handle: DirHandle, depth: number, counter: { n: number }): Promise<TreeNode[]> {
  const out: TreeNode[] = [];
  for await (const entry of handle.values()) {
    if (counter.n >= MAX_ENTRIES) break;
    if (IGNORED.has(entry.name)) continue;
    counter.n++;
    if (entry.kind === "directory") {
      out.push({
        name: entry.name,
        type: "folder",
        children: depth < MAX_DEPTH ? await readTree(entry, depth + 1, counter) : [],
      });
    } else {
      out.push({ name: entry.name, type: "file" });
    }
  }
  return out.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
}

/** Browser implementation: only does what the browser genuinely allows. */
export const webFileSystemService: FileSystemService = {
  platform: "web",
  canPickDirectory() {
    return typeof window !== "undefined" && "showDirectoryPicker" in window;
  },
  async pickDirectory() {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const handle = await (window as any).showDirectoryPicker({ mode: "read" });
      const tree = await readTree(handle, 1, { n: 0 });
      return { name: handle.name, path: null, tree };
    } catch {
      return null;
    }
  },
  async openInExplorer() {
    return DESKTOP_ONLY;
  },
  async runAction(action) {
    if (action.type === "url") {
      const url = /^https?:\/\//i.test(action.value) ? action.value : `http://${action.value}`;
      window.open(url, "_blank", "noopener");
      return { ok: true };
    }
    return DESKTOP_ONLY;
  },
};
