export type Priority = 1 | 2 | 3; // 1 baixa, 2 média, 3 alta

export interface Environment {
  id: string;
  name: string;
  icon: string | null; // data URL (square, resized)
  description: string;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
}

export type DirectoryType = "folder" | "file";

export interface Directory {
  id: string;
  environmentId: string;
  parentId: string | null;
  name: string;
  path: string;
  type: DirectoryType;
  createdAt: number;
}

export interface Checklist {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface ChecklistItem {
  id: string;
  checklistId: string;
  text: string;
  completed: boolean;
  position: number;
  description?: string;
  price?: number;
  includeInTotal?: boolean;
  deleted?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface EnvironmentChecklist {
  environmentId: string;
  checklistId: string;
}

export interface ExecutionConfig {
  id: string;
  environmentId: string;
  name: string;
  enabled: boolean;
}

export type ExecutionActionType = "executable" | "batch" | "terminal" | "url" | "application";

export interface ExecutionAction {
  id: string;
  executionConfigId: string;
  type: ExecutionActionType;
  value: string;
  position: number;
}

export interface AppData {
  version: 1;
  environments: Environment[];
  directories: Directory[];
  checklists: Checklist[];
  checklistItems: ChecklistItem[];
  environmentChecklists: EnvironmentChecklist[];
  executionConfigs: ExecutionConfig[];
  executionActions: ExecutionAction[];
}

/** Lightweight tree node used when importing a directory structure. */
export interface TreeNode {
  name: string;
  type: DirectoryType;
  children?: TreeNode[];
}

export const PRIORITY_LABEL: Record<Priority, string> = { 1: "Baixa", 2: "Média", 3: "Alta" };

export const ACTION_TYPE_LABEL: Record<ExecutionActionType, string> = {
  terminal: "Abrir terminal em",
  batch: "Executar .bat",
  executable: "Executar .exe",
  application: "Abrir programa",
  url: "Abrir URL",
};
