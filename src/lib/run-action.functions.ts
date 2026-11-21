import { createServerFn } from "@tanstack/react-start";
import type { ExecutionActionType } from "@/lib/types";

// ─── helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks if a port is currently in use.
 */
async function isPortInUse(port: number, host = "localhost"): Promise<boolean> {
  const net = await import("node:net");
  return new Promise((resolve) => {
    const sock = new net.Socket();
    sock.once("connect", () => {
      sock.destroy();
      resolve(true);
    });
    sock.once("error", () => {
      sock.destroy();
      resolve(false);
    });
    sock.connect(port, host);
  });
}

/**
 * Kills any process currently listening on the specified port.
 * Uses Windows netstat + taskkill.
 */
async function killProcessOnPort(port: number): Promise<void> {
  try {
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const run = promisify(exec);

    const { stdout } = await run(`netstat -ano | findstr :${port}`);
    const lines = stdout.split("\n");
    const pids = new Set<string>();

    for (const line of lines) {
      const parts = line.trim().split(/\s+/);
      const state = parts[3];
      const pid = parts[parts.length - 1];
      if ((state === "LISTENING" || parts.includes("LISTENING")) && pid && /^\d+$/.test(pid) && pid !== "0") {
        pids.add(pid);
      }
    }

    for (const pid of pids) {
      if (Number(pid) !== process.pid) {
        try {
          await run(`taskkill /F /T /PID ${pid}`);
        } catch {
          // ignora
        }
      }
    }

    await new Promise((r) => setTimeout(r, 400));
  } catch {
    // ignora se findstr não encontrar nada
  }
}

/**
 * Polls a TCP port until it responds or the timeout is reached.
 */
async function waitForPort(url: string, timeoutMs = 25000): Promise<void> {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname || "localhost";
    const port = parseInt(parsed.port) || (parsed.protocol === "https:" ? 443 : 80);
    const net = await import("node:net");

    await new Promise<void>((resolve) => {
      const deadline = Date.now() + timeoutMs;
      function attempt() {
        if (Date.now() > deadline) { resolve(); return; }
        const sock = new net.Socket();
        sock.once("connect", () => { sock.destroy(); resolve(); });
        sock.once("error", () => { sock.destroy(); setTimeout(attempt, 600); });
        sock.connect(port, host);
      }
      attempt();
    });
  } catch {
    // prossegue se URL for inválida
  }
}

// ─── openExplorer ─────────────────────────────────────────────────────────────

/**
 * Opens Windows Explorer directly at the specified folder path.
 */
export const openExplorer = createServerFn({ method: "POST" })
  .validator((input: { path: string }) => input)
  .handler(async ({ data }) => {
    try {
      const fs = await import("node:fs/promises");
      const { spawn } = await import("node:child_process");
      const targetPath = data.path.trim();

      if (!targetPath) {
        return { ok: false as const, message: "Diretório não configurado." };
      }

      try {
        const stat = await fs.stat(targetPath);
        if (!stat.isDirectory()) {
          return { ok: false as const, message: `O caminho "${targetPath}" não é uma pasta.` };
        }
      } catch {
        return { ok: false as const, message: `A pasta "${targetPath}" não foi encontrada no Windows.` };
      }

      spawn("explorer.exe", [targetPath], {
        detached: true,
        stdio: "ignore",
      }).unref();

      return { ok: true as const };
    } catch (e) {
      console.error("[openExplorer] erro:", e);
      return { ok: false as const, message: String(e) };
    }
  });

// ─── runAction ────────────────────────────────────────────────────────────────

export const runAction = createServerFn({ method: "POST" })
  .validator((input: { type: ExecutionActionType; value: string; projectPath?: string }) => input)
  .handler(async ({ data }) => {
    try {
      const { spawn } = await import("node:child_process");
      const fs = await import("node:fs/promises");
      const path = await import("node:path");
      const { type, value, projectPath } = data;

      // 1. Abrir URL no navegador padrão do Windows via start
      if (type === "url") {
        const rawUrl = value.trim();
        if (!rawUrl) return { ok: false as const, openUrl: null, message: "URL vazia" };
        const fullUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;

        // No Windows, cmd.exe /c start "" "url" abre no navegador padrão do sistema de forma confiável
        spawn("cmd.exe", ["/c", "start", "", fullUrl], {
          stdio: "ignore",
          windowsHide: true,
        }).unref();

        return { ok: true as const, openUrl: fullUrl };
      }

      // 2. Abrir Terminal
      if (type === "terminal") {
        const targetDir = (value.trim() || projectPath?.trim() || "").trim();
        if (!targetDir) {
          return { ok: false as const, openUrl: null, message: "Diretório do projeto não configurado." };
        }
        spawn("cmd.exe", ["/c", "start", "cmd.exe", "/K", `cd /d "${targetDir}"`], {
          stdio: "ignore",
        }).unref();
        return { ok: true as const, openUrl: null };
      }

      // 3. Duplo clique em (arquivo + extensão)
      if (type === "file" || type === "batch" || type === "executable" || type === "application") {
        let fileName = value.trim();
        if (value.includes("|")) {
          const [n = "", ext = ""] = value.split("|");
          const cleanExt = ext.trim() ? (ext.trim().startsWith(".") ? ext.trim() : `.${ext.trim()}`) : "";
          fileName = `${n.trim()}${cleanExt}`;
        }

        if (!fileName) {
          return { ok: false as const, openUrl: null, message: "Nome do arquivo não informado." };
        }

        const cwd = projectPath?.trim() || undefined;
        const fullPath = cwd && !path.isAbsolute(fileName) ? path.join(cwd, fileName) : fileName;

        // start "" "fullPath" executa exatamente como um duplo clique do usuário no Windows
        spawn("cmd.exe", ["/c", "start", "", fullPath], {
          cwd,
          stdio: "ignore",
          windowsHide: true,
        }).unref();

        return { ok: true as const, openUrl: null };
      }

      // 4. Projeto npm (sempre roda npm run dev)
      if (type === "npm") {
        let cwd = projectPath?.trim() || "";
        let portOrUrl = value.trim();

        // Compatibilidade com formato legado "dir|script|port"
        if (value.includes("|")) {
          const parts = value.split("|");
          if (parts[0]) cwd = parts[0].trim();
          portOrUrl = (parts[2] ?? "").trim();
        }

        if (!cwd) {
          return { ok: false as const, openUrl: null, message: "Diretório do projeto não configurado." };
        }

        // Valida se a pasta existe
        try {
          const stat = await fs.stat(cwd);
          if (!stat.isDirectory()) {
            return { ok: false as const, openUrl: null, message: `O caminho "${cwd}" não é uma pasta válida.` };
          }
        } catch {
          return { ok: false as const, openUrl: null, message: `A pasta "${cwd}" não foi encontrada no disco.` };
        }

        let openUrl = "";
        let targetPort: number | null = null;
        const npmArgs = ["run", "dev"];
        const extraEnv: Record<string, string> = {};

        if (portOrUrl) {
          if (/^\d+$/.test(portOrUrl)) {
            targetPort = parseInt(portOrUrl, 10);
            extraEnv["PORT"] = portOrUrl;
            npmArgs.push("--", "--port", portOrUrl);
            openUrl = `http://localhost:${portOrUrl}`;
          } else if (/^https?:\/\//i.test(portOrUrl)) {
            openUrl = portOrUrl;
            try {
              const parsed = new URL(portOrUrl);
              if (parsed.port) {
                targetPort = parseInt(parsed.port, 10);
                extraEnv["PORT"] = parsed.port;
                npmArgs.push("--", "--port", parsed.port);
              }
            } catch {
              // ignora
            }
          } else {
            openUrl = `http://${portOrUrl}`;
          }
        }

        // Se uma porta foi definida e já estiver em uso, encerra o processo anterior
        if (targetPort) {
          const inUse = await isPortInUse(targetPort);
          if (inUse) {
            console.log(`[runAction] Porta ${targetPort} ocupada. Liberando processo antigo...`);
            await killProcessOnPort(targetPort);
          }
        }

        // Executa npm run dev no mesmo terminal do Node
        const child = spawn("cmd.exe", ["/c", "npm", ...npmArgs], {
          cwd,
          stdio: "inherit",
          windowsHide: true,
          env: {
            ...process.env,
            ...extraEnv,
          },
        });

        child.on("error", (err) => {
          console.error(`[runAction] Erro ao executar npm ${npmArgs.join(" ")} em ${cwd}:`, err);
        });

        child.unref();

        if (openUrl) {
          await waitForPort(openUrl);
          return { ok: true as const, openUrl };
        }

        return { ok: true as const, openUrl: null };
      }

      return { ok: false as const, openUrl: null, message: `Tipo desconhecido: ${type}` };
    } catch (e) {
      console.error("[runAction] erro:", e);
      return { ok: false as const, openUrl: null, message: String(e) };
    }
  });

// ─── pickWindowsFolder ────────────────────────────────────────────────────────

/**
 * Opens the native Windows folder-picker dialog (via PowerShell WinForms).
 * Returns the selected absolute path, or null if cancelled.
 */
export const pickWindowsFolder = createServerFn({ method: "POST" })
  .validator((input: { title?: string }) => input)
  .handler(async ({ data }) => {
    try {
      const { execFile } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const run = promisify(execFile);

      const title = (data.title ?? "Selecione a pasta do projeto").replace(/'/g, "");
      const ps = `
        Add-Type -AssemblyName System.Windows.Forms
        $d = New-Object System.Windows.Forms.FolderBrowserDialog
        $d.Description = '${title}'
        $d.ShowNewFolderButton = $false
        [void][System.Windows.Forms.Application]::EnableVisualStyles()
        if ($d.ShowDialog() -eq 'OK') { Write-Output $d.SelectedPath }
      `.trim();

      const { stdout } = await run("powershell", ["-NoProfile", "-Command", ps]);
      const picked = stdout.trim();
      return { ok: true as const, path: picked || null };
    } catch (e) {
      console.error("pickWindowsFolder: erro", e);
      return { ok: false as const, path: null };
    }
  });

// ─── readWindowsDirectoryTree ─────────────────────────────────────────────────

export interface ScannedDiskNode {
  name: string;
  type: "folder" | "file";
  path: string;
  children?: ScannedDiskNode[];
}

const IGNORE_DIR_NAMES = new Set([
  "node_modules",
  ".git",
  ".svn",
  ".hg",
  "dist",
  "build",
  ".next",
  ".nuxt",
  ".output",
  ".cache",
  ".turbo",
]);

/**
 * Recursively scans a directory on Windows to import its subfolders and files.
 * Max depth to prevent deep hierarchy explosion or symlink loops.
 */
async function scanLocalDir(dirPath: string, depth = 1, maxDepth = 4): Promise<ScannedDiskNode[]> {
  const fs = await import("node:fs/promises");
  const path = await import("node:path");

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result: ScannedDiskNode[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (IGNORE_DIR_NAMES.has(entry.name)) continue;
        const fullChildPath = path.join(dirPath, entry.name);
        const children = depth < maxDepth ? await scanLocalDir(fullChildPath, depth + 1, maxDepth) : [];
        result.push({
          name: entry.name,
          type: "folder",
          path: fullChildPath,
          children,
        });
      } else if (entry.isFile()) {
        result.push({
          name: entry.name,
          type: "file",
          path: path.join(dirPath, entry.name),
        });
      }
    }

    return result.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "folder" ? -1 : 1));
  } catch (err) {
    console.error(`scanLocalDir failed for ${dirPath}:`, err);
    return [];
  }
}

/**
 * Server function to scan a Windows directory and return its structure.
 */
export const scanWindowsDirectory = createServerFn({ method: "POST" })
  .validator((input: { directoryPath: string }) => input)
  .handler(async ({ data }) => {
    try {
      const fs = await import("node:fs/promises");
      const path = await import("node:path");

      const targetPath = data.directoryPath?.trim();
      if (!targetPath) {
        return { ok: false as const, error: "Caminho não informado" };
      }

      const stat = await fs.stat(targetPath);
      if (!stat.isDirectory()) {
        return { ok: false as const, error: "O caminho informado não é uma pasta válida" };
      }

      const folderName = path.basename(targetPath) || targetPath;
      const children = await scanLocalDir(targetPath);

      return {
        ok: true as const,
        folderName,
        children,
      };
    } catch (e: any) {
      return { ok: false as const, error: e?.message || "Erro ao ler pasta do Windows" };
    }
  });
