# Security Policy

**Built by [SkilledDragon LLC](https://skilleddragon.com)**

This is a **SkilledDragon educational minilab**, not a production product. We do **not** maintain these repos on a regular schedule and we do **not** operate a vulnerability response program for them.

## Contact

General questions: **hello@skilleddragon.com**  
Do not use a dedicated security mailbox for this repo — none exists.

## If you find an issue

- Prefer reporting **upstream** when the issue is in [mikehasa/golive-skill](https://github.com/mikehasa/golive-skill), the [`golive`](https://www.npmjs.com/package/golive) CLI, or other dependencies.
- For something specific to this minilab’s tests or CI, you may email hello@skilleddragon.com. There is **no SLA**, and we may not patch or reply quickly.
- Do not expect private coordinated disclosure or paid bounty handling here.

## Scope / hygiene

This repository proves GoLive’s approval gates (plan + human `--yes`) and never deploys in CI.

- Never commit `.env`, API keys, tokens, `.golive/`, or provider credentials.
- CI is **keyless** and must never pass approval flags to `golive apply`.
- Telemetry is disabled in CI via `DISABLE_TELEMETRY=1` and `DO_NOT_TRACK=1`. Upstream documents no GoLive product telemetry; release `update-check` contacts public metadata — this lab skips live update-check.

Use at your own risk. Pin versions, review the code, and treat this as sample material.
