import { createServerFn } from "@tanstack/react-start";
import type { AppData } from "@/lib/types";

/**
 * Persists each AppData slice in its own JSON file under data/.
 * On read, the seven files are merged into a single AppData object.
 * On write, the object is split and each slice is written concurrently.
 *
 * data/
 *   environments.json
 *   directories.json
 *   checklists.json
 *   checklist-items.json
 *   environment-checklists.json
 *   execution-configs.json
 *   execution-actions.json
 *
 * The legacy data/ambientes-data.json is no longer used by the app but is
 * kept as a reference — run data/index.js to regenerate it from the slices.
 */

const DIR = "data";

const FILES = {
  environments: `${DIR}/environments.json`,
  directories: `${DIR}/directories.json`,
  checklists: `${DIR}/checklists.json`,
  checklistItems: `${DIR}/checklist-items.json`,
  environmentChecklists: `${DIR}/environment-checklists.json`,
  executionConfigs: `${DIR}/execution-configs.json`,
  executionActions: `${DIR}/execution-actions.json`,
} as const;

type SliceKey = keyof typeof FILES;

// ---------------------------------------------------------------------------
// Helpers (server-side only)
// ---------------------------------------------------------------------------

async function readSlice<T>(fs: typeof import("node:fs/promises"), key: SliceKey): Promise<T[]> {
  try {
    const raw = await fs.readFile(FILES[key], "utf8");
    return JSON.parse(raw) as T[];
  } catch (e: unknown) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") console.error(`readSlice(${key}): erro ao ler`, e);
    return [];
  }
}

async function writeSlice(
  fs: typeof import("node:fs/promises"),
  key: SliceKey,
  data: unknown[],
): Promise<void> {
  await fs.writeFile(FILES[key], JSON.stringify(data, null, 2), "utf8");
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const readDataFile = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const fs = await import("node:fs/promises");
    await fs.mkdir(DIR, { recursive: true });

    const [
      environments,
      directories,
      checklists,
      checklistItems,
      environmentChecklists,
      executionConfigs,
      executionActions,
    ] = await Promise.all([
      readSlice(fs, "environments"),
      readSlice(fs, "directories"),
      readSlice(fs, "checklists"),
      readSlice(fs, "checklistItems"),
      readSlice(fs, "environmentChecklists"),
      readSlice(fs, "executionConfigs"),
      readSlice(fs, "executionActions"),
    ]);

    const appData: AppData = {
      version: 1,
      environments: environments as AppData["environments"],
      directories: directories as AppData["directories"],
      checklists: checklists as AppData["checklists"],
      checklistItems: checklistItems as AppData["checklistItems"],
      environmentChecklists: environmentChecklists as AppData["environmentChecklists"],
      executionConfigs: executionConfigs as AppData["executionConfigs"],
      executionActions: executionActions as AppData["executionActions"],
    };

    return { ok: true as const, json: JSON.stringify(appData) };
  } catch (e) {
    console.error("readDataFile: erro ao ler arquivos", e);
    return { ok: false as const, json: null };
  }
});

export const writeDataFile = createServerFn({ method: "POST" })
  .validator((input: { json: string }) => {
    if (typeof input?.json !== "string") throw new Error("invalid");
    JSON.parse(input.json);
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const fs = await import("node:fs/promises");
      await fs.mkdir(DIR, { recursive: true });

      const appData = JSON.parse(data.json) as AppData;

      await Promise.all([
        writeSlice(fs, "environments", appData.environments),
        writeSlice(fs, "directories", appData.directories),
        writeSlice(fs, "checklists", appData.checklists),
        writeSlice(fs, "checklistItems", appData.checklistItems),
        writeSlice(fs, "environmentChecklists", appData.environmentChecklists),
        writeSlice(fs, "executionConfigs", appData.executionConfigs),
        writeSlice(fs, "executionActions", appData.executionActions),
      ]);

      return { ok: true };
    } catch (e) {
      console.error("writeDataFile: erro ao gravar arquivos", e);
      return { ok: false };
    }
  });
