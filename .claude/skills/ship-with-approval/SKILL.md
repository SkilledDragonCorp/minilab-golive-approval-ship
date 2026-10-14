---
name: ship-with-approval
description: Run golive detect then plan; show the human the planId; stop until they approve; never auto-apply.
---

# Ship with approval

GoLive’s design: **nothing reaches a real account without a plan the human has seen and approved.** A worm doesn’t ask — this skill makes the agent stop at the plan.

## Required flow

1. From the app directory, run detect (read-only):

```bash
golive detect --json
```

2. If needed, init a stack config (still local):

```bash
golive init --stack hosting=vercel --json
```

3. Build a plan and capture `planId`:

```bash
golive plan --json
```

4. Show the human the full plan JSON and its `planId`. **STOP.** Wait for an explicit message of the form `approve <planId>`.

5. Only the **human** types the apply command with that plan id and the explicit approval flag. When the plan asks for DNS, live, or destroy confirms, the human adds those confirms themselves. Agents and CI must never supply approval or confirm flags.

6. After a human-approved apply, verify and status:

```bash
golive verify --json
golive status --json
```

## Hard rules

- Never store provider secrets in the repo. GoLive keeps credentials in its own local credentials file under the user’s home.
- Never run apply from CI, hooks, or agent automation.
- Prefer `update-check --offline` or skip update-check in automated environments.
- Keyless lab proof: `bun test` asserts apply refuses without a plan and without human approval.
