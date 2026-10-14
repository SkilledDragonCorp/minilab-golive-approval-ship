import { describe, expect, test } from "bun:test";
import {
  EXPECTED_BUNDLE_DIGEST,
  EXPECTED_VERSION,
  freshHomeAndApp,
  runGolive,
} from "./helpers.ts";

describe("golive version", () => {
  test("pins version and bundleDigest", () => {
    const { home, app } = freshHomeAndApp();
    const r = runGolive(["version", "--json"], { cwd: app, home });
    expect(r.exitCode, `stdout=${r.stdout}\nstderr=${r.stderr}`).toBe(0);
    expect(r.json).toBeTruthy();
    expect(r.json!.version).toBe(EXPECTED_VERSION);
    const release = r.json!.release as Record<string, unknown> | undefined;
    expect(release).toBeTruthy();
    expect(release!.bundleDigest).toBe(EXPECTED_BUNDLE_DIGEST);
    const source = release!.source as Record<string, unknown> | undefined;
    expect(source?.ref).toBe(`v${EXPECTED_VERSION}`);
  });
});
