import { webFileSystemService } from "./web";
import type { FileSystemService } from "./types";

// Swap this for a desktop implementation when packaging with Tauri/Electron.
export const fileSystem: FileSystemService = webFileSystemService;
export type { FileSystemService, OsResult, PickedDirectory } from "./types";
