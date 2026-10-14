import { describe, expect, test } from "bun:test";
import { freshHomeAndApp, runGolive } from "./helpers.ts";

describe("approval gates (un gusano no pregunta)", () => {
  test("apply without --plan refuses with usage", () => {
    const { home, app } = freshHomeAndApp();
    runGolive(["init", "--stack", "hosting=vercel", "--json"], { cwd: app, home });
    const r = runGolive(["apply", "--json"], { cwd: app, home });
    expect(r.exitCode).toBe(1);
    expect(r.json).toBeTruthy();
    const err = r.json!.error as Record<string, unknown>;
    expect(err.code).toBe("usage");
    expect(String(err.message)).toContain(
      "apply needs --plan <planId> (from `plan` or `teardown`, approved by the human)",
    );
  });

  test("apply with --plan but without --yes refuses", () => {
    const { home, app } = freshHomeAndApp();
    runGolive(["init", "--stack", "hosting=vercel", "--json"], { cwd: app, home });
    const plan = runGolive(["plan", "--json"], { cwd: app, home });
    expect(plan.exitCode).toBe(0);
    const planId = plan.json!.planId as string;
    expect(planId).toMatch(/^[0-9a-f]{12}$/);

    const r = runGolive(["apply", "--plan", planId, "--json"], { cwd: app, home });
    expect(r.exitCode).toBe(1);
    expect(r.json).toBeTruthy();
    const err = r.json!.error as Record<string, unknown>;
    expect(err.code).toBe("usage");
    expect(String(err.message)).toContain(
      "refusing to write without --yes (the human must approve the plan first)",
    );
  });
});
