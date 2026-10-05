import type { AppData, Directory, TreeNode } from "@/lib/types";
import { uid } from "@/lib/id";
import { SAMPLE_PROJECT_TREE } from "@/services/filesystem/mock-data";

export function flattenTree(
  nodes: TreeNode[],
  environmentId: string,
  parentId: string | null,
  parentPath: string,
  now: number,
): Directory[] {
  const out: Directory[] = [];
  for (const n of nodes) {
    const id = uid();
    const path = parentPath ? `${parentPath}\\${n.name}` : n.name;
    out.push({ id, environmentId, parentId, name: n.name, path, type: n.type, createdAt: now });
    if (n.children?.length) out.push(...flattenTree(n.children, environmentId, id, path, now));
  }
  return out;
}

export function createSeedData(): AppData {
  const now = Date.now();
  const dev = uid(), ent = uid(), casa = uid();
  const rootId = uid();
  const study = uid(), buy = uid();
  return {
    version: 1,
    environments: [
      { id: dev, name: "Desenvolvimento", icon: null, description: "Projetos e estudos de programação.", priority: 3, createdAt: now, updatedAt: now },
      { id: ent, name: "Entretenimento", icon: null, description: "", priority: 2, createdAt: now + 1, updatedAt: now },
      { id: casa, name: "Casa", icon: null, description: "", priority: 1, createdAt: now + 2, updatedAt: now },
    ],
    directories: [
      { id: rootId, environmentId: dev, parentId: null, name: "meu-app", path: "C:\\Projetos\\meu-app", type: "folder", createdAt: now },
      ...flattenTree(SAMPLE_PROJECT_TREE, dev, rootId, "C:\\Projetos\\meu-app", now),
    ],
    checklists: [
      { id: study, name: "Coisas para estudar", createdAt: now, updatedAt: now },
      { id: buy, name: "Coisas para comprar", createdAt: now + 1, updatedAt: now },
    ],
    checklistItems: [
      { id: uid(), checklistId: study, text: "Projeto CountBus", completed: true, position: 3, createdAt: now, updatedAt: now },
      { id: uid(), checklistId: study, text: "Estudar Spring Boot", completed: false, position: 1, createdAt: now, updatedAt: now },
      { id: uid(), checklistId: study, text: "Melhorar documentação", completed: false, position: 2, createdAt: now, updatedAt: now },
      { id: uid(), checklistId: buy, text: "Cabo HDMI", completed: false, position: 1, createdAt: now, updatedAt: now },
    ],
    environmentChecklists: [{ environmentId: dev, checklistId: study }],
    executionConfigs: [],
    executionActions: [],
  };
}
