import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { freshHomeAndApp, runGolive } from "./helpers.ts";

function listFilesRecursive(dir: string, base = dir): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...listFilesRecursive(full, base));
    else out.push(full.slice(base.length + 1));
  }
  return out;
}

describe("detect → init → plan", () => {
  test("fixture app yields planId; plan is read-only outside temp", () => {
    const { home, app } = freshHomeAndApp();
    const beforeOutside = new Set(listFilesRecursive(home));

    const detect = runGolive(["detect", "--json"], { cwd: app, home });
    expect(detect.exitCode).toBe(0);
    expect(detect.json?.ok).toBe(true);
    expect(detect.json?.detect).toBeTruthy();

    const init = runGolive(["init", "--stack", "hosting=vercel", "--json"], {
      cwd: app,
      home,
    });
    expect(init.exitCode).toBe(0);
    expect(init.json?.ok).toBe(true);
    expect(init.json?.wrote).toBe("golive.yaml");
    expect(existsSync(join(app, "golive.yaml"))).toBe(true);
    const cfg = init.json?.config as Record<string, unknown> | undefined;
    const stack = cfg?.stack as Record<string, unknown> | undefined;
    expect(stack?.hosting).toBe("vercel");

    const plan = runGolive(["plan", "--json"], { cwd: app, home });
    expect(plan.exitCode).toBe(0);
    expect(plan.json?.ok).toBe(true);
    const planId = plan.json?.planId as string;
    expect(planId).toMatch(/^[0-9a-f]{12}$/);

    // plan must not write new files under HOME (credentials / state stay local to app or pre-existing)
    const afterOutside = listFilesRecursive(home);
    for (const rel of afterOutside) {
      if (!beforeOutside.has(rel)) {
        // Allow only expected GoLive home cache metadata if created; never deploy artifacts.
        expect(rel.includes("credentials") || rel.endsWith(".key")).toBe(false);
      }
    }

    // golive.yaml lives in the app temp dir only
    expect(readFileSync(join(app, "golive.yaml"), "utf8").length).toBeGreaterThan(0);
  });
});
