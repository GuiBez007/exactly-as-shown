import type { TreeNode } from "@/lib/types";
import type { FileSystemService, OsResult } from "./types";
import { runAction as serverRunAction, openExplorer as serverOpenExplorer } from "@/lib/run-action.functions";

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

/** Browser implementation — delegates OS actions to the Node.js server function. */
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

  async openInExplorer(path: string): Promise<OsResult> {
    try {
      const r = await serverOpenExplorer({ data: { path } });
      return r.ok
        ? { ok: true }
        : { ok: false, reason: "error", message: r.message ?? "Erro ao abrir no Windows." };
    } catch (e) {
      return { ok: false, reason: "error", message: String(e) };
    }
  },

  async runAction(action, projectPath): Promise<OsResult> {
    try {
      const r = await serverRunAction({
        data: {
          type: action.type,
          value: action.value,
          ...(projectPath !== undefined ? { projectPath } : {}),
        },
      });

      // Se for npm com openUrl, abre a página local do projeto no navegador
      if (r.ok && r.openUrl && action.type === "npm") {
        window.open(r.openUrl, "_blank", "noopener");
      }

      return r.ok
        ? { ok: true }
        : { ok: false, reason: "error", message: r.message ?? "Erro ao executar" };
    } catch (e) {
      return { ok: false, reason: "error", message: String(e) };
    }
  },
};
