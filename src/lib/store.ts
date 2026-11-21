import { useSyncExternalStore } from "react";
import type {
  AppData,
  ChecklistItem,
  Directory,
  DirectoryType,
  Environment,
  ExecutionAction,
  ExecutionActionType,
  Priority,
  TreeNode,
} from "./types";
import { uid } from "./id";
import { emptyData, fileRepository, type AppRepository } from "@/services/persistence/repository";
import { flattenTree } from "@/services/persistence/seed";

const repo: AppRepository = fileRepository;

interface Snapshot {
  ready: boolean;
  data: AppData;
}

const SERVER: Snapshot = { ready: false, data: emptyData() };
let snapshot: Snapshot = SERVER;
let loaded = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (!loaded) {
    loaded = true;
    // State starts as ready: false; disk is the sole source of truth.
    void repo.loadRemote().then((data) => {
      snapshot = { ready: true, data };
      emit();
    });
  }
  return () => {
    listeners.delete(l);
  };
}

function update(fn: (d: AppData) => AppData) {
  const data = fn(snapshot.data);
  snapshot = { ready: true, data };
  repo.save(data);
  emit();
}

export function useStore(): Snapshot {
  return useSyncExternalStore(subscribe, () => snapshot, () => SERVER);
}

const now = () => Date.now();

/* ---------- Environments ---------- */

export function createEnvironment(name: string, icon: string | null): string {
  const id = uid();
  const t = now();
  update((d) => ({
    ...d,
    environments: [...d.environments, { id, name, icon, description: "", priority: 2, createdAt: t, updatedAt: t }],
  }));
  return id;
}

export function updateEnvironment(id: string, patch: Partial<Omit<Environment, "id" | "createdAt">>) {
  update((d) => ({
    ...d,
    environments: d.environments.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now() } : e)),
  }));
}

export const setEnvironmentPriority = (id: string, priority: Priority) => updateEnvironment(id, { priority });

export function deleteEnvironment(id: string) {
  update((d) => {
    const cfgIds = new Set(d.executionConfigs.filter((c) => c.environmentId === id).map((c) => c.id));
    return {
      ...d,
      environments: d.environments.filter((e) => e.id !== id),
      directories: d.directories.filter((x) => x.environmentId !== id),
      environmentChecklists: d.environmentChecklists.filter((x) => x.environmentId !== id),
      executionConfigs: d.executionConfigs.filter((c) => !cfgIds.has(c.id)),
      executionActions: d.executionActions.filter((a) => !cfgIds.has(a.executionConfigId)),
    };
  });
}

/* ---------- Directories ---------- */

export function createDirectory(input: {
  environmentId: string;
  parentId: string | null;
  name: string;
  path: string;
  type: DirectoryType;
  children?: TreeNode[] | undefined;
}): string {
  const id = uid();
  const t = now();
  update((d) => {
    const root: Directory = {
      id,
      environmentId: input.environmentId,
      parentId: input.parentId,
      name: input.name,
      path: input.path,
      type: input.type,
      createdAt: t,
    };
    const kids = input.children ? flattenTree(input.children, input.environmentId, id, input.path, t) : [];
    return { ...d, directories: [...d.directories, root, ...kids] };
  });
  return id;
}

export function renameDirectory(id: string, name: string) {
  const cleanName = name.trim();
  if (!cleanName) return;
  update((d) => ({
    ...d,
    directories: d.directories.map((dir) => (dir.id === id ? { ...dir, name: cleanName } : dir)),
  }));
}

export function deleteDirectory(id: string) {
  update((d) => {
    const remove = new Set([id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const x of d.directories) {
        if (x.parentId && remove.has(x.parentId) && !remove.has(x.id)) {
          remove.add(x.id);
          grew = true;
        }
      }
    }
    const cfgIds = new Set(
      d.executionConfigs.filter((c) => c.directoryId && remove.has(c.directoryId)).map((c) => c.id),
    );
    return {
      ...d,
      directories: d.directories.filter((x) => !remove.has(x.id)),
      executionConfigs: d.executionConfigs.filter((c) => !cfgIds.has(c.id)),
      executionActions: d.executionActions.filter((a) => !cfgIds.has(a.executionConfigId)),
    };
  });
}

/* ---------- Checklists ---------- */

export function createChecklist(name: string, environmentId?: string): string {
  const id = uid();
  const t = now();
  update((d) => ({
    ...d,
    checklists: [...d.checklists, { id, name, createdAt: t, updatedAt: t }],
    environmentChecklists: environmentId
      ? [...d.environmentChecklists, { environmentId, checklistId: id }]
      : d.environmentChecklists,
  }));
  return id;
}

export function renameChecklist(id: string, name: string) {
  update((d) => ({
    ...d,
    checklists: d.checklists.map((c) => (c.id === id ? { ...c, name, updatedAt: now() } : c)),
  }));
}

export function deleteChecklist(id: string) {
  update((d) => ({
    ...d,
    checklists: d.checklists.filter((c) => c.id !== id),
    checklistItems: d.checklistItems.filter((i) => i.checklistId !== id),
    environmentChecklists: d.environmentChecklists.filter((x) => x.checklistId !== id),
  }));
}

const maxPos = (d: AppData, checklistId: string) =>
  d.checklistItems.filter((i) => i.checklistId === checklistId).reduce((m, i) => Math.max(m, i.position), 0);

export function addChecklistItem(checklistId: string, text: string) {
  const t = now();
  update((d) => ({
    ...d,
    checklistItems: [
      ...d.checklistItems,
      { id: uid(), checklistId, text, completed: false, position: maxPos(d, checklistId) + 1, createdAt: t, updatedAt: t },
    ],
  }));
}

/** Toggling moves the item to the end of its group (completed items sit at the bottom). */
export function toggleChecklistItem(id: string) {
  update((d) => ({
    ...d,
    checklistItems: d.checklistItems.map((i) =>
      i.id === id ? { ...i, completed: !i.completed, position: maxPos(d, i.checklistId) + 1, updatedAt: now() } : i,
    ),
  }));
}

function patchItem(id: string, patch: Partial<ChecklistItem>) {
  update((d) => ({
    ...d,
    checklistItems: d.checklistItems.map((i) => (i.id === id ? { ...i, ...patch, updatedAt: now() } : i)),
  }));
}

/** Soft delete: item leaves the active list but stays stored (shown struck-through). */
export const removeChecklistItem = (id: string) => patchItem(id, { deleted: true });
export const restoreChecklistItem = (id: string) => patchItem(id, { deleted: false });
export const updateChecklistItem = (
  id: string,
  patch: Partial<Pick<ChecklistItem, "text" | "description" | "price" | "includeInTotal">>,
) => patchItem(id, patch);

export function purgeChecklistItem(id: string) {
  update((d) => ({ ...d, checklistItems: d.checklistItems.filter((i) => i.id !== id) }));
}

/** Swap an active item with its neighbour inside the same completion group. */
export function moveChecklistItem(id: string, dir: -1 | 1) {
  update((d) => {
    const item = d.checklistItems.find((i) => i.id === id);
    if (!item) return d;
    const group = sortedItems(d, item.checklistId).filter((i) => i.completed === item.completed);
    const idx = group.findIndex((i) => i.id === id);
    const other = group[idx + dir];
    if (!other) return d;
    return {
      ...d,
      checklistItems: d.checklistItems.map((i) =>
        i.id === id ? { ...i, position: other.position } : i.id === other.id ? { ...i, position: item.position } : i,
      ),
    };
  });
}

export function toggleAssociation(environmentId: string, checklistId: string) {
  update((d) => {
    const exists = d.environmentChecklists.some(
      (x) => x.environmentId === environmentId && x.checklistId === checklistId,
    );
    return {
      ...d,
      environmentChecklists: exists
        ? d.environmentChecklists.filter((x) => !(x.environmentId === environmentId && x.checklistId === checklistId))
        : [...d.environmentChecklists, { environmentId, checklistId }],
    };
  });
}

/* ---------- Execution configuration ---------- */

export interface ExecutionDraft {
  name: string;
  enabled: boolean;
  projectPath?: string;
  actions: { type: ExecutionActionType; value: string }[];
}

export function saveExecutionConfig(
  environmentId: string,
  directoryId: string | null | undefined,
  draft: ExecutionDraft,
) {
  update((d) => {
    const existing = d.executionConfigs.find(
      (c) =>
        c.environmentId === environmentId &&
        (directoryId ? c.directoryId === directoryId : !c.directoryId),
    );
    const id = existing?.id ?? uid();
    const config = {
      id,
      environmentId,
      directoryId: directoryId ?? null,
      projectPath: draft.projectPath?.trim() || "",
      name: draft.name,
      enabled: draft.enabled,
    };
    const actions: ExecutionAction[] = draft.actions
      .filter((a) => a.type === "terminal" || a.value.trim().length > 0)
      .map((a, i) => ({ id: uid(), executionConfigId: id, type: a.type, value: a.value.trim(), position: i }));
    return {
      ...d,
      executionConfigs: existing
        ? d.executionConfigs.map((c) => (c.id === id ? config : c))
        : [...d.executionConfigs, config],
      executionActions: [...d.executionActions.filter((a) => a.executionConfigId !== id), ...actions],
    };
  });
}

export function deleteExecutionConfig(environmentId: string, directoryId?: string | null) {
  update((d) => {
    const cfg = d.executionConfigs.find(
      (c) =>
        c.environmentId === environmentId &&
        (directoryId ? c.directoryId === directoryId : !c.directoryId),
    );
    if (!cfg) return d;
    return {
      ...d,
      executionConfigs: d.executionConfigs.filter((c) => c.id !== cfg.id),
      executionActions: d.executionActions.filter((a) => a.executionConfigId !== cfg.id),
    };
  });
}

/* ---------- Selectors ---------- */

export const sortedItems = (d: AppData, checklistId: string) =>
  d.checklistItems
    .filter((i) => i.checklistId === checklistId && !i.deleted)
    .sort((a, b) => Number(a.completed) - Number(b.completed) || a.position - b.position);

export const deletedItems = (d: AppData, checklistId: string) =>
  d.checklistItems.filter((i) => i.checklistId === checklistId && i.deleted).sort((a, b) => b.updatedAt - a.updatedAt);

/** Sum of prices of active items flagged to count in the total. */
export const checklistTotal = (d: AppData, checklistId: string) =>
  sortedItems(d, checklistId).reduce((s, i) => s + (i.price != null && i.includeInTotal !== false ? i.price : 0), 0);

/** Remaining price: total sum minus prices of completed (checked) active items that count in the total. */
export const checklistRemainingTotal = (d: AppData, checklistId: string) =>
  sortedItems(d, checklistId)
    .filter((i) => !i.completed)
    .reduce((s, i) => s + (i.price != null && i.includeInTotal !== false ? i.price : 0), 0);

export const formatBRL = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function exportDataJson(d: AppData) {
  const blob = new Blob([JSON.stringify(d, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ambientes-data.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

export const sortedEnvironments = (d: AppData) =>
  [...d.environments].sort((a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt));

export const childrenOf = (d: AppData, environmentId: string, parentId: string | null) =>
  d.directories
    .filter((x) => x.environmentId === environmentId && x.parentId === parentId)
    .sort((a, b) => (a.position ?? a.createdAt) - (b.position ?? b.createdAt));

export function reorderEnvironments(orderedIds: string[]) {
  update((d) => ({
    ...d,
    environments: d.environments.map((e) => {
      const idx = orderedIds.indexOf(e.id);
      return idx !== -1 ? { ...e, position: idx } : e;
    }),
  }));
}

export function reorderDirectories(orderedIds: string[]) {
  update((d) => ({
    ...d,
    directories: d.directories.map((dir) => {
      const idx = orderedIds.indexOf(dir.id);
      return idx !== -1 ? { ...dir, position: idx } : dir;
    }),
  }));
}

export function getExecution(d: AppData, environmentId: string, directoryId?: string | null) {
  const config = d.executionConfigs.find(
    (c) =>
      c.environmentId === environmentId &&
      (directoryId ? c.directoryId === directoryId : !c.directoryId),
  );
  if (!config) return null;
  const actions = d.executionActions
    .filter((a) => a.executionConfigId === config.id)
    .sort((a, b) => a.position - b.position);
  return { config, actions };
}
