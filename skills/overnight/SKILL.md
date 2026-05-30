---
name: overnight
description: >-
  Autonomous, long-running loop that drives a goal to completion while the user is away. Repeats
  AUDIT -> FIX -> VERIFY -> COMMIT (calling the /audit skill each round) until "nothing left to do"
  or the user interrupts, keeping a durable backlog + journal so nothing is ever lost, scheduling
  its own wake-ups for true overnight cadence, and pinging the user on blockers (device unplugged,
  build red, a decision needed). Trigger when the user says "work overnight", "keep going until I
  wake up / until it's done", "loop on this", "don't stop until nothing's left", or runs /overnight.
---

# /overnight — autonomous build/fix loop

Take a goal and relentlessly close it out, unattended, committing as you go. This skill is the
orchestrator: each round it runs the **/audit** skill (which already does discovery + functional +
sync + UI-craft + persona + competitive lenses with adversarial verify), then FIXES what's
confirmed, VERIFIES, and COMMITS — then loops. The user should be able to walk away and return to a
materially better artifact with a clean trail.

`$ARGUMENTS` = the goal (e.g. "make ZoneIN production-ready", "fix every bug in the dashboard").
No args = continue the project's stated goal / open backlog.

## Non-negotiables
- **Durable state, never lose progress.** Maintain a `TodoWrite` list AND a journal file
  (`.overnight/journal.md` or similar) recording every round: what was audited, what was fixed,
  what's left, what's blocked, the commit hashes. On resume, read it first. The todo is the source
  of truth — keep exactly one item `in_progress`.
- **Commit after every green change.** Branch first if on the default branch. Small, verified
  commits with clear messages. Build/tests must pass before committing (revert if not).
- **Ground truth.** Verify fixes on the real artifact (device screenshots / Playwright / CLI), not
  just by recompiling. A fix isn't done until it's observed working and not regressing.
- **Surface blockers, don't stall.** If something needs the user (a destructive action, a credential,
  a product decision, a disconnected device, a persistently red build), record it, do everything
  else first, and tell the user clearly — never silently spin or fake completion.
- **Know your environment.** Check what's available (`adb devices`, Playwright MCP, build command)
  and adapt. Respect the project's anti-features and conventions (CLAUDE.md).

## The loop
1. **Orient.** Read the goal, the journal, the todo, CLAUDE.md/anti-features, and current git state.
2. **Audit.** Run **/audit** (full, or scoped to the area in play) → a ranked, verified fix list.
   On the first round also run the customer + competitive lenses to seed a feature backlog.
3. **Plan.** Merge new findings into the todo, deduped, prioritized (P0/P1 trust-breakers first,
   then high-impact/low-effort, then features). Don't drop anything — park lower items, don't delete.
4. **Fix.** Work top items one at a time (or fan out independent fixes in worktrees). Build + tests
   green before each commit. Route UI work through the user's design skills.
5. **Verify.** Exercise the change on the real artifact; confirm no regression in adjacent surfaces.
6. **Commit + journal.** Record the round.
7. **Decide.** If the todo still has actionable items and you're not blocked, loop to step 2 (re-audit
   periodically, not every round — fix in batches, re-audit when a batch is done or the area changes).
   If everything actionable is done or you're blocked on the user, stop and report.

## Pacing an unattended run
- Drive continuously while there's tracked work. When you must wait on external state (CI, a deploy,
  a re-sync), use `ScheduleWakeup` with a sensible delay; for genuine idle, a long fallback heartbeat.
- Watch resource use; clean up scratch artifacts (screenshots, temp dumps) regularly.
- Periodically (every few rounds) write a short progress summary the user can skim on waking:
  what improved, commit count, what's blocked, what's next.

## Stop conditions
- Nothing actionable remains (todo drained, latest /audit comes back clean across a full pass), OR
- A blocker needs the user, OR
- The user interrupts.
Report honestly: what got done, what's verified, what's blocked, the commit trail — no inflated claims.
