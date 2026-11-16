import type { AppData } from "@/lib/types";
import { readDataFile, writeDataFile } from "@/lib/data-file.functions";
import { createSeedData } from "./seed";

/**
 * Persistence abstraction. Primary store is a JSON file inside the project
 * (data/ambientes-data.json, via server functions); localStorage is kept as an
 * instant-load cache and fallback when the server disk isn't writable.
 */
export interface AppRepository {
  load(): AppData;
  loadRemote(): Promise<AppData | null>;
  save(data: AppData): void;
}

const KEY = "ambientes:data:v1";
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
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw) as AppData;
    } catch {
      /* ignore */
    }
    return createSeedData();
  },
  async loadRemote() {
    try {
      const res = await readDataFile();
      if (res.ok && res.json) return JSON.parse(res.json) as AppData;
    } catch {
      /* ignore */
    }
    return null;
  },
  save(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Falha ao salvar dados", e);
    }
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
