---
name: customer-audit
description: >-
  Universal, multi-agent, VISION-VERIFIED audit that makes any app, website, tool, CLI, API, or MCP
  server genuinely great. Fans out one agent per surface and exercises EVERY single control (button,
  field, toggle, menu, tab, swipe, long-press, drag) for real — screenshotting before/after and
  looking at the result — across every lens: does each control actually work + persist + sync, the
  "does the UI lie?" trust audit, UI/interaction craft & motion, fresh-eyes customer journeys,
  competitive teardown, accessibility, performance, security, microcopy, empty/error/edge states.
  Adversarially verifies every finding, then returns a ranked fix list (or auto-fixes). Detects and
  uses the available MCP servers (e.g. Playwright for websites) and routes UI findings through the
  user's installed design skills. Trigger when the user says "audit", "customer audit", "review every
  page/screen", "find everything wrong or missing", "test every button", "QA this", "make this
  badass/premium", "is everything working and in sync", or runs /customer-audit.
---

# /customer-audit — universal, vision-verified, multi-agent audit

Reproduce a ruthless, parallel, **ground-truth** audit of ANY target, the way a demanding customer +
a senior engineer would together. The method is fixed; the target varies. The whole point is to
catch the ONE dead control, the field that doesn't save, the screen that doesn't sync — *before the
user trips over it* — and to make the thing feel premium. Default to maximum thoroughness.

## Works on everything
`android-app-code` · `running-app` (device/emulator) · `website` · `cli` · `api` · `mcp-server` ·
`desktop/electron` · `library` · any `code`. Pick the target type, then exercise it the right way.

## Modes (`$ARGUMENTS`)
- `/customer-audit` — full audit of the current project (all lenses, all surfaces, every control).
- `/customer-audit ui` — craft + motion + a11y + tokens + delight (routed through design skills).
- `/customer-audit customer` — fresh-eyes personas + competitive teardown (what's missing/confusing).
- `/customer-audit <path|url|surface>` — scope to one area / page / route / command.
- `/customer-audit fix` — run, then AUTO-APPLY confirmed fixes (worktree-isolated, verified, committed).
- `/customer-audit redesign <surface>` — tournament: generate N design variants, judge, ship the winner.

## The seven steps
1. **Scope.** Identify the TYPE. Infer from the repo/URL; ask ONE short question only if truly ambiguous.
2. **Inventory the environment.** Detect available **MCP servers** (`ToolSearch` for "playwright",
   "browser", and any domain servers) and tooling (`adb devices`, a dev server / URL, the build/test/
   run command). The right exercise engine depends on this — for a website the **Playwright MCP** IS
   how you click and see; for an app it's `adb`.
3. **Discover the user's skills.** List `./.claude/skills/`, `~/.claude/skills/`, and plugin skills.
   Note the **design/UI skills** (e.g. `emil-design-eng`, `impeccable`, `frontend-design`,
   `ui-ux-pro-max`, `taste-skill`) — READ each and apply its principles to every UI finding, and use
   them in `redesign` mode. Note `deep-research` (use for the competitive lens).
4. **Enumerate surfaces AND their controls.** List every screen/route/page/command, and within each,
   every interactive element. Fan-out is one agent per surface; each agent must hit EVERY control on
   its surface — none skipped (the whole point is catching the one dead one). Log anything you skip.
5. **Configure.** Lenses (default = all), a persona spread, competitors, design-skill paths, the
   anti-features list, a one-paragraph product context (the *what*, not solutions), `groundTruth: true`,
   and the MCP/tooling available.
6. **Run the engine.** `Workflow({ scriptPath: "<this skill dir>/engine.workflow.js", args: {...} })`.
   It fans out per-surface (vision-verifying every control) + fresh-eyes personas + competitive
   teardown, **adversarially verifies every finding**, dedupes, and returns the ranked report.
7. **Deliver (or fix).** Present the ranked report (location + the evidence you SAW + the fix). In
   `fix` mode, one worktree-isolated fix agent per confirmed independent finding → build/verify →
   commit; shared-file fixes serially. Offer to hand the backlog to **/overnight**.

## SEE it work — vision IS the verification (the heart of this skill)
A control "rendering" proves nothing. For EVERY interactive element:
1. **Screenshot the before.** 2. **Interact** (tap/click/type/drag/swipe — read real element bounds
from a `uiautomator dump` on Android or the accessibility tree / Playwright snapshot on web; never
blind-tap). 3. **Screenshot the after.** 4. **LOOK at both with vision** and confirm the visible
result is correct. 5. **Confirm it persisted**: reload / reopen and look again; on web watch the
network for a 2xx + the value present; on app read it back from backend/logcat. Logs say the write
fired — the *screenshot* says the user sees the truth.

| Target | Exercise + SEE |
| --- | --- |
| website | Playwright MCP: `navigate` → `snapshot`/`screenshot` → `click`/`type`/`fill` → screenshot → check `network_requests` for the persisted write → reload → screenshot. Read console. |
| running-app | `adb`: launch → `uiautomator dump` for bounds → tap/type → `screencap` before+after → reopen to confirm it stuck → logcat for swallowed errors. |
| cli / api | Run/call with real + boundary + malformed inputs; assert exit/status, output, persistence (read back), error shape. |
| mcp-server | Enumerate its tools; call each with valid + edge args; assert schema-valid results, errors, side effects. |

## Lenses (engine implements all; scope with mode)
functional-persistence · **trust-audit** (controls that render but never persist; success shown on
failed writes; optimistic updates with no rollback; stale shown as fresh) · cross-surface-sync ·
ui-interaction-craft · motion · accessibility · performance · security-privacy · microcopy-tone ·
empty-and-error-states · edge-cases · design-token-consistency · onboarding-first-run · delight ·
fresh-eyes-customer-journeys · competitive-gaps.

## Principles that make it trustworthy
- **Ground truth, seen with vision.** Exercise + screenshot every control. "Renders" ≠ "works";
  "saves" ≠ "syncs". If you couldn't see it work, say so.
- **Fan out by surface; hit every control.** Exhaustive + parallel.
- **Fresh-eyes personas carry ZERO project memory** — "you are <persona>, here's your goal, first
  time here." Spread: first-timer, power user, impatient/break-it (double-submit, offline, weird input).
- **Adversarial verify.** Every finding gets a skeptic who tries to refute it; keep only confirmed.
- **Route UI through the user's design skills**; in `redesign`, generate 3–5 variants, judge, synthesize.
- **Respect anti-features** (pass the "never add / removed" list to every agent).
- **Honest report** — locations + observed evidence + concrete fixes; no inflated severity, no guesses.

See `engine.workflow.js` (run-ready, parameterized) for the exact agent choreography.
