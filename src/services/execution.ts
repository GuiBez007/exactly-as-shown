import type { ExecutionAction } from "@/lib/types";
import { fileSystem } from "./filesystem";

export interface ExecutionReport {
  done: ExecutionAction[];
  needsDesktop: ExecutionAction[];
  failed: ExecutionAction[];
}

/** Runs configured actions in order through the OS integration layer. */
export async function runExecution(actions: ExecutionAction[]): Promise<ExecutionReport> {
  const report: ExecutionReport = { done: [], needsDesktop: [], failed: [] };
  for (const a of actions) {
    const r = await fileSystem.runAction(a);
    if (r.ok) report.done.push(a);
    else if (r.reason === "requires-desktop") report.needsDesktop.push(a);
    else report.failed.push(a);
  }
  return report;
}
