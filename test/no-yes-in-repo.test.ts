import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./helpers.ts";

const FORBIDDEN = ["--yes", "--confirm-live", "--confirm-dns", "--confirm-destroy"];
const SCAN_ROOTS = ["scripts", ".github/workflows", ".claude/skills"];

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

/** True if a line looks like an invocation of `golive apply` that passes a forbidden flag. */
function linePassesApprovalFlag(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.startsWith("#") || trimmed.startsWith("//") || trimmed.startsWith("*")) {
    return false;
  }
  // Prose / skill instructions that tell humans what *not* to automate — skip markdown fence labels
  if (/^```/.test(trimmed)) return false;

  const hasApply =
    /\bgolive\b/.test(line) && /\bapply\b/.test(line);
  if (!hasApply) return false;

  // Skill docs may describe the human-only command; those lines must not be executable shell.
  // Fail when the line looks like a shell/CLI invocation (not "the human types" prose).
  const looksExecutable =
    /^\s*(golive|node|bun|npx|pnpm|npm)\b/.test(line) ||
    /\$\{?golive/i.test(line) ||
    /spawn\w*\(\s*\[/.test(line) ||
    /execFileSync\([^)]*golive/i.test(line);

  if (!looksExecutable) return false;

  return FORBIDDEN.some((flag) => line.includes(flag));
}

describe("CI never approves", () => {
  test("scripts, workflows, and skills never pass approval flags to golive apply", () => {
    const offenders: string[] = [];
    for (const rel of SCAN_ROOTS) {
      const dir = join(ROOT, rel);
      for (const file of walk(dir)) {
        const text = readFileSync(file, "utf8");
        const lines = text.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          if (linePassesApprovalFlag(lines[i]!)) {
            offenders.push(`${file}:${i + 1}: ${lines[i]!.trim()}`);
          }
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
