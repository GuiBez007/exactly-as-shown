import { createServerFn } from "@tanstack/react-start";

/**
 * Reads/writes the app data as a JSON file inside the project (data/ambientes-data.json).
 * Works where the server has a writable disk (local dev / desktop). On read-only hosts
 * the calls report `ok: false` and the app keeps working from the browser copy.
 */
const FILE = "data/ambientes-data.json";

export const readDataFile = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const fs = await import("node:fs/promises");
    const raw = await fs.readFile(FILE, "utf8");
    return { ok: true as const, json: raw };
  } catch {
    return { ok: false as const, json: null };
  }
});

export const writeDataFile = createServerFn({ method: "POST" })
  .inputValidator((input: { json: string }) => {
    if (typeof input?.json !== "string") throw new Error("invalid");
    JSON.parse(input.json);
    return input;
  })
  .handler(async ({ data }) => {
    try {
      const fs = await import("node:fs/promises");
      await fs.mkdir("data", { recursive: true });
      await fs.writeFile(FILE, data.json, "utf8");
      return { ok: true };
    } catch {
      return { ok: false };
    }
  });
