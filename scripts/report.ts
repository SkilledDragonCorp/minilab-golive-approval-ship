#!/usr/bin/env bun
/**
 * Keyless report: bun test + skill frontmatter + pin metadata.
 * Writes reports/golive-approval.json (+ .md). Never deploys.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const REPORTS = join(ROOT, "reports");
const PIN_SHA = "8fd3d8e96844c79c500aabaf215d1267fcde08c5";
const EXPECTED_VERSION = "0.1.0-alpha.9";
const EXPECTED_BUNDLE_DIGEST =
  "e7bc6549ea6f2f8c95728d6e5611159c876a1f38d6db0009f7aa053f12f7133b";

type Step = {
  id: string;
  command: string;
  ok: boolean;
  exit_code: number;
  elapsed_ms: number;
  output: string;
};

function run(id: string, cmd: string[]): Step {
  const t0 = performance.now();
  const r = Bun.spawnSync(cmd, {
    cwd: ROOT,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      ...process.env,
      DISABLE_TELEMETRY: "1",
      DO_NOT_TRACK: "1",
    },
  });
  const output = `${r.stdout?.toString() ?? ""}${r.stderr?.toString() ?? ""}`;
  return {
    id,
    command: cmd.join(" "),
    ok: r.exitCode === 0,
    exit_code: r.exitCode ?? 1,
    elapsed_ms: Math.round(performance.now() - t0),
    output,
  };
}

function parseBunTest(out: string): { pass: number; fail: number } {
  const pass = Number(out.match(/(\d+)\s+pass/i)?.[1] ?? 0);
  const fail = Number(out.match(/(\d+)\s+fail/i)?.[1] ?? 0);
  return { pass, fail };
}

function readVendorPin(): string | null {
  const head = join(ROOT, "vendor", "golive-skill", ".git", "HEAD");
  if (!existsSync(head)) return null;
  const ref = readFileSync(head, "utf8").trim();
  if (ref.startsWith("ref:")) {
    const refPath = join(ROOT, "vendor", "golive-skill", ".git", ref.slice(5).trim());
    if (existsSync(refPath)) return readFileSync(refPath, "utf8").trim();
    return null;
  }
  return ref.length >= 7 ? ref : null;
}

const tAll = performance.now();
const testStep = run("bun:test", ["bun", "test", "./test"]);
const skillsStep = run("check:skills", ["bun", "run", "check:skills"]);
const mirrorsOk =
  !existsSync(join(ROOT, ".cursor", "skills")) &&
  !existsSync(join(ROOT, ".agents", "skills"));
const elapsed_ms = Math.round(performance.now() - tAll);

const counts = parseBunTest(testStep.output);
const vendorPin = readVendorPin();
const pin_sha = vendorPin && /^[0-9a-f]{7,40}$/i.test(vendorPin) ? vendorPin : PIN_SHA;

const steps = [testStep, skillsStep];
const steps_passed = steps.filter((s) => s.ok).length + (mirrorsOk ? 1 : 0);
const steps_total = steps.length + 1;
const steps_failed = steps_total - steps_passed;
const ok = steps_failed === 0 && counts.fail === 0 && mirrorsOk;

const payload = {
  generated_at: new Date().toISOString(),
  lab: "minilab-golive-approval-ship",
  keyless: true,
  never_deploys: true,
  ok,
  elapsed_ms,
  elapsed_s: Math.round(elapsed_ms / 100) / 10,
  bun: { version: Bun.version, pass: counts.pass, fail: counts.fail },
  skills: {
    ok: skillsStep.ok,
    exit_code: skillsStep.exit_code,
    elapsed_ms: skillsStep.elapsed_ms,
  },
  mirrors: { ok: mirrorsOk, forbidden: [".cursor/skills", ".agents/skills"] },
  upstream: {
    repo: "mikehasa/golive-skill",
    pin_sha,
    pin_short: pin_sha.slice(0, 8),
    expected_pin: PIN_SHA,
    pin_match: pin_sha === PIN_SHA || pin_sha.startsWith(PIN_SHA.slice(0, 8)),
    npm: `golive@${EXPECTED_VERSION}`,
    bundle_digest: EXPECTED_BUNDLE_DIGEST,
    vendor_present: existsSync(join(ROOT, "vendor", "golive-skill")),
  },
  steps: steps.map(({ id, command, ok, exit_code, elapsed_ms }) => ({
    id,
    command,
    ok,
    exit_code,
    elapsed_ms,
  })),
  headline: {
    bun_pass: counts.pass,
    bun_fail: counts.fail,
    skills_ok: skillsStep.ok,
    mirrors_ok: mirrorsOk,
    pin_short: pin_sha.slice(0, 8),
  },
};

mkdirSync(REPORTS, { recursive: true });
writeFileSync(join(REPORTS, "golive-approval.json"), `${JSON.stringify(payload, null, 2)}\n`);

const md = [
  "# GoLive approval ship — keyless report",
  "",
  `- **Generated:** ${payload.generated_at}`,
  `- **Result:** ${ok ? "GREEN" : "RED"} — ${steps_passed}/${steps_total} steps, bun ${counts.pass} pass / ${counts.fail} fail`,
  `- **Skills frontmatter:** ${skillsStep.ok ? "OK" : "FAIL"} (exit ${skillsStep.exit_code})`,
  `- **Mirrors banned:** ${mirrorsOk ? "OK" : "FAIL"}`,
  `- **Upstream pin:** mikehasa/golive-skill @ \`${pin_sha.slice(0, 8)}\` (expected \`${PIN_SHA.slice(0, 8)}\`)`,
  `- **npm:** golive@${EXPECTED_VERSION}`,
  `- **bundleDigest:** \`${EXPECTED_BUNDLE_DIGEST}\``,
  `- **Never deploys:** true (no approval flags in CI)`,
  `- **Elapsed:** ${elapsed_ms} ms (~${payload.elapsed_s} s)`,
  "",
  "## Steps",
  "",
  ...steps.map(
    (s) =>
      `- \`${s.id}\`: ${s.ok ? "PASS" : "FAIL"} (exit ${s.exit_code}, ${s.elapsed_ms} ms)`,
  ),
  `- \`mirrors\`: ${mirrorsOk ? "PASS" : "FAIL"}`,
  "",
].join("\n");
writeFileSync(join(REPORTS, "golive-approval.md"), md);

console.log(
  JSON.stringify(
    {
      ok,
      bun_pass: counts.pass,
      bun_fail: counts.fail,
      skills_ok: skillsStep.ok,
      mirrors_ok: mirrorsOk,
      pin_sha: pin_sha.slice(0, 12),
      elapsed_ms,
      report: "reports/golive-approval.json",
    },
    null,
    2,
  ),
);
if (!ok) process.exit(1);
