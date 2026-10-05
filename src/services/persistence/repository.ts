import type { AppData } from "@/lib/types";
import { createSeedData } from "./seed";

/**
 * Persistence abstraction. The web MVP uses localStorage; a desktop build
 * (Tauri/Electron) or a database can provide another implementation.
 */
export interface AppRepository {
  load(): AppData;
  save(data: AppData): void;
}

const KEY = "ambientes:data:v1";

export const localStorageRepository: AppRepository = {
  load() {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (!raw) {
        const seed = createSeedData();
        window.localStorage.setItem(KEY, JSON.stringify(seed));
        return seed;
      }
      return JSON.parse(raw) as AppData;
    } catch {
      return createSeedData();
    }
  },
  save(data) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Falha ao salvar dados", e);
    }
  },
};

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
