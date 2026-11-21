import type { AppData } from "@/lib/types";
import { readDataFile, writeDataFile } from "@/lib/data-file.functions";
import { createSeedData } from "./seed";

/**
 * Persistence abstraction.
 * The ONLY source of truth is the JSON slice files on disk under data/,
 * read/written via server functions. No browser storage is used.
 */
export interface AppRepository {
  /** Returns empty placeholder data (state starts as `ready: false`). */
  load(): AppData;
  /** Reads the data file from disk. Seeds the file if it doesn't exist yet. */
  loadRemote(): Promise<AppData>;
  /** Writes data to disk via the server function (debounced). */
  save(data: AppData): void;
}

let timer: ReturnType<typeof setTimeout> | undefined;
let pending: AppData | null = null;

function flush() {
  if (!pending) return;
  const json = JSON.stringify(pending, null, 2);
  pending = null;
  writeDataFile({ data: { json } }).catch((e) => console.error("Falha ao salvar arquivo", e));
}

export const fileRepository: AppRepository = {
  load() {
    return emptyData();
  },

  async loadRemote() {
    try {
      const res = await readDataFile();
      if (res.ok && res.json) {
        return JSON.parse(res.json) as AppData;
      }
    } catch (e) {
      console.error("Falha ao ler arquivo de dados", e);
    }

    // File doesn't exist or is unreadable — seed it.
    const seed = createSeedData();
    const json = JSON.stringify(seed, null, 2);
    await writeDataFile({ data: { json } }).catch((e) =>
      console.error("Falha ao criar arquivo seed", e),
    );
    return seed;
  },

  save(data) {
    pending = data;
    clearTimeout(timer);
    timer = setTimeout(flush, 400);
  },
};

if (typeof window !== "undefined") window.addEventListener("beforeunload", flush);

export function emptyData(): AppData {
  return {
    version: 1,
    environments: [],
    directories: [],
    checklists: [],
    checklistItems: [],
    environmentChecklists: [],
    executionConfigs: [],
    executionActions: [],
  };
}
