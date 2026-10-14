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

/**
 * Resolve a real Node binary (not Bun-as-node). GoLive's release integrity check
 * requires process.execPath to be Node when it re-spawns the bundled CLI.
 */
export function resolveNodeBinary(): string {
  const candidates = [
    process.env.NODE_BINARY,
    Bun.which("node"),
    "/usr/local/bin/node",
    "/usr/bin/node",
  ].filter((x): x is string => typeof x === "string" && x.length > 0);

  for (const bin of candidates) {
    const probe = Bun.spawnSync(
      [bin, "-p", "JSON.stringify({ name: process.release?.name, bun: typeof Bun !== 'undefined' })"],
      { stdout: "pipe", stderr: "pipe", env: { PATH: process.env.PATH ?? "" } },
    );
    if (probe.exitCode !== 0) continue;
    try {
      const info = JSON.parse((probe.stdout?.toString() ?? "").trim()) as {
        name?: string;
        bun?: boolean;
      };
      if (info.name === "node" && info.bun !== true) return bin;
    } catch {
      // try next
    }
  }
  throw new Error(
    "Could not resolve a real Node binary (got Bun-as-node or missing node). Set NODE_BINARY.",
  );
}

const NODE_BIN = resolveNodeBinary();

/** Run pinned npm golive CLI via Node with env { PATH, HOME, TMPDIR } only. */
export function runGolive(
  args: string[],
  opts: { cwd: string; home: string },
): GoliveResult {
  const r = Bun.spawnSync([NODE_BIN, GOLIVE_BIN, ...args], {
    cwd: opts.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PATH: process.env.PATH ?? "",
      HOME: opts.home,
      TMPDIR: process.env.TMPDIR ?? tmpdir(),
      LANG: process.env.LANG ?? "C.UTF-8",
    },
  });
  const stdout = r.stdout?.toString() ?? "";
  const stderr = r.stderr?.toString() ?? "";
  let json: Record<string, unknown> | null = null;
  const text = stdout.trim() || stderr.trim();
  try {
    json = JSON.parse(text) as Record<string, unknown>;
  } catch {
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
