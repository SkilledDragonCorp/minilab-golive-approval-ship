import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

export const ROOT = join(import.meta.dir, "..");
export const GOLIVE_BIN = join(ROOT, "node_modules", "golive", "bin", "golive.mjs");

/** Observed box run 2026-10-13 ~03:50 CT against golive@0.1.0-alpha.9 */
export const EXPECTED_VERSION = "0.1.0-alpha.9";
export const EXPECTED_BUNDLE_DIGEST =
  "e7bc6549ea6f2f8c95728d6e5611159c876a1f38d6db0009f7aa053f12f7133b";

export type GoliveResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  json: Record<string, unknown> | null;
};

/** Run pinned npm golive CLI via Node with env { PATH, HOME } only. */
export function runGolive(
  args: string[],
  opts: { cwd: string; home: string },
): GoliveResult {
  const r = Bun.spawnSync(["node", GOLIVE_BIN, ...args], {
    cwd: opts.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: opts.home,
    },
  });
  const stdout = r.stdout?.toString() ?? "";
  const stderr = r.stderr?.toString() ?? "";
  let json: Record<string, unknown> | null = null;
  const text = stdout.trim() || stderr.trim();
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
    // non-JSON or mixed output
    const start = text.indexOf("{");
    if (start >= 0) {
      try {
        json = JSON.parse(text.slice(start)) as Record<string, unknown>;
      } catch {
        json = null;
      }
    }
  }
  return { exitCode: r.exitCode ?? 1, stdout, stderr, json };
}

export function freshHomeAndApp(): { home: string; app: string } {
  const home = mkdtempSync(join(tmpdir(), "golive-lab-home-"));
  const app = mkdtempSync(join(tmpdir(), "golive-lab-app-"));
  writeFileSync(
    join(app, "package.json"),
    JSON.stringify(
      {
        name: "demo",
        version: "1.0.0",
        dependencies: { next: "15.0.0" },
      },
      null,
      2,
    ) + "\n",
  );
  mkdirSync(join(home, ".golive"), { recursive: true });
  return { home, app };
}
