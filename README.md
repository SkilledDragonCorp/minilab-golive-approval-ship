# minilab-golive-approval-ship

**Built by SkilledDragon LLC — architecture-led software engineering · [skilleddragon.com](https://skilleddragon.com)**

Bun/TypeScript minilab: prove [GoLive](https://github.com/mikehasa/golive-skill)’s ship-with-approval gates — `apply` refuses without `--plan` and without human `--yes` — and keep CI **keyless** (never deploys).

Featured upstream: [mikehasa/golive-skill](https://github.com/mikehasa/golive-skill) @ `8fd3d8e96844c79c500aabaf215d1267fcde08c5` (MIT) · npm [`golive@0.1.0-alpha.9`](https://www.npmjs.com/package/golive)

## What we built

| Piece | Purpose |
| --- | --- |
| `.claude/skills/ship-with-approval/SKILL.md` | Agent skill: detect → plan → stop for human approval |
| `.claude/skills/golive/` | Upstream skill installed from vendored pin via `skills@1.7.2` |
| `golive@0.1.0-alpha.9` | Exact-pinned CLI (Bun child via Node) |
| `test/gates.test.ts` | Refusal paths: no plan / no `--yes` (exit 1 + exact messages) |
| `test/no-yes-in-repo.test.ts` | CI/scripts/skills never pass approval flags to `golive apply` |
| `scripts/upstream-ci.sh` | Upstream validate cohort (pnpm 9.12.2 + vitest + tsc) at the pin |
| `scripts/upstream-runtime-smoke.mjs` | Upstream Node 20 runtime smoke, copied verbatim |
| `bun run report` | Writes `reports/golive-approval.json` (+ `.md`) |
| CI | `lab` + `upstream` + `upstream-runtime-node20` + `security` (gitleaks 8.30.1, osv-scanner 2.7.0) |

### Observed pin (box run 2026-10-13)

| Field | Value |
| --- | --- |
| version | `0.1.0-alpha.9` |
| release.source.ref | `v0.1.0-alpha.9` |
| bundleDigest | `e7bc6549ea6f2f8c95728d6e5611159c876a1f38d6db0009f7aa053f12f7133b` |

## What GoLive is

Flow on **your** accounts: **detect → plan → human approve → apply → verify**. Plans are read-only. Writes require an explicit human approval flag. This lab never runs apply with approval in CI.

## What we tested (real commands)

Pin:

```text
8fd3d8e96844c79c500aabaf215d1267fcde08c5
```

Local minilab (keyless):

```bash
export PATH="/usr/local/opt/git/bin:$PATH"   # cellar git 2.39 when system git is older
bash scripts/fetch-upstream.sh
bun install
bun run typecheck
bun run check:skills
bun test
bun run report
bun audit
test ! -e .cursor/skills && test ! -e .agents/skills
```

Upstream cohort (network; pnpm 9.12.2, Node 24):

```bash
bash scripts/upstream-ci.sh
```

Upstream Node 20 runtime smoke:

```bash
bash scripts/run-upstream-runtime-smoke.sh
```

| Suite | Expectation |
| --- | --- |
| `bun test ./test` | version digest, detect→plan, both refusal gates, no approval flags in repo |
| `bun run report` | `reports/golive-approval.json` green |
| Upstream `pnpm vitest run` + `pnpm tsc --noEmit` | green at pin |
| Node 20 smoke | help / version / menu / detect on copied skill |

## Setup

- **Node** `>=24` (see `.nvmrc`); Node **20** only for the upstream runtime smoke job
- **Bun** `>=1.2.0` (CI uses `1.4.3`)
- **pnpm** `9.12.2` for upstream scripts
- Prefer **Git ≥ 2.31** on `PATH` for shallow fetch/checkout (Homebrew/cellar `git` 2.39.0)

```bash
nvm use
bun install
bun run hooks:install   # optional: gitleaks pre-commit
bash scripts/fetch-upstream.sh
```

Install the upstream skill (after vendor):

```bash
DISABLE_TELEMETRY=1 bun --bun x skills@1.7.2 add ./vendor/golive-skill/skills/golive \
  --skill golive -a claude-code -y --copy
```

## Tutorial (ends at plan — live apply is human-only)

1. Create a throwaway app with a `package.json` that includes a hosting framework (e.g. Next).
2. Run `golive detect --json` — inspect findings.
3. Run `golive init --stack hosting=vercel --json` — writes local `golive.yaml`.
4. Run `golive plan --json` — note `planId` (12 hex chars). Show the plan to a human.
5. **Stop.** Do not apply from an agent or CI.
6. **Manual / human-only (not in CI):** after reviewing the plan, the human may apply with that plan id and the approval flag (plus DNS/live/destroy confirms if the plan requires them), then `golive verify` / `golive status`.

## Using these skills in Claude Code and Cursor

- **Claude Code / Cursor:** skills live only under `.claude/skills/` (`ship-with-approval`, `golive`).
- Do **not** mirror into `.cursor/skills` or `.agents/skills` — CI fails if those exist.
- Ask the agent to follow `/ship-with-approval` (or open that skill) before any deploy-shaped work.

## API keys

| Key / account | Required for CI? | Notes |
| --- | --- | --- |
| None | No | Keyless lane is complete without secrets |
| Vercel / Cloudflare / DNS provider tokens | Only for optional live apply on your machine | Stored via GoLive’s local credentials file — never commit |

Live path accounts are whatever `golive menu --json` lists for your stack. This lab does not deploy.

## Telemetry

Upstream README: no GoLive account, hosted backend, or product telemetry. `update-check` contacts public release metadata — CI uses only offline/skipped update-check paths. Lab env: `DISABLE_TELEMETRY=1`, `DO_NOT_TRACK=1`.

## License

MIT (this lab) · upstream MIT.
