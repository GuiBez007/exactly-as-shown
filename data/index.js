#!/usr/bin/env node
/**
 * data/index.js
 *
 * Utilitário: lê os 7 arquivos de slice e grava ambientes-data.json completo.
 *
 * Uso:
 *   node data/index.js
 *
 * O app NÃO usa este script em runtime — ele existe para inspeção ou backup.
 * O app lê/grava diretamente nos arquivos de slice via server functions.
 */

import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dir = dirname(fileURLToPath(import.meta.url));

const FILES = {
  environments:         join(__dir, "environments.json"),
  directories:          join(__dir, "directories.json"),
  checklists:           join(__dir, "checklists.json"),
  checklistItems:       join(__dir, "checklist-items.json"),
  environmentChecklists:join(__dir, "environment-checklists.json"),
  executionConfigs:     join(__dir, "execution-configs.json"),
  executionActions:     join(__dir, "execution-actions.json"),
};

async function readSlice(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return [];
    throw e;
  }
}

async function main() {
  const [
    environments,
    directories,
    checklists,
    checklistItems,
    environmentChecklists,
    executionConfigs,
    executionActions,
  ] = await Promise.all(Object.values(FILES).map(readSlice));

  const merged = {
    version: 1,
    environments,
    directories,
    checklists,
    checklistItems,
    environmentChecklists,
    executionConfigs,
    executionActions,
  };

  const out = join(__dir, "ambientes-data.json");
  await writeFile(out, JSON.stringify(merged, null, 2), "utf8");
  console.log(`✓ ${out} gerado (${environments.length} ambientes, ${checklists.length} listas, ${directories.length} pastas)`);
}

main().catch((e) => { console.error(e); process.exit(1); });
