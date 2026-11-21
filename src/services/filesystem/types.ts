import type { ExecutionAction, TreeNode } from "@/lib/types";

export type OsResult =
  | { ok: true }
  | { ok: false; reason: "requires-desktop" | "cancelled" | "error"; message: string };

export interface PickedDirectory {
  name: string;
  /** Absolute path, when the platform exposes it (desktop). Browsers don't. */
  path: string | null;
  tree: TreeNode[];
}

/**
 * Operating-system integration layer. The UI talks only to this interface.
 * A desktop implementation (Tauri/Electron) can replace the web one.
 */
export interface FileSystemService {
  readonly platform: "web" | "desktop";
  canPickDirectory(): boolean;
  pickDirectory(): Promise<PickedDirectory | null>;
  openInExplorer(path: string): Promise<OsResult>;
  runAction(action: ExecutionAction, projectPath?: string): Promise<OsResult>;
}
