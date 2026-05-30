// audit engine — run-ready, parameterized. Invoke from the /audit skill:
//   Workflow({ scriptPath: "<skill>/engine.workflow.js", args: {...} })
// args (all optional except surfaces): {
//   targetType: 'android-app-code'|'running-app'|'website'|'cli'|'api'|'code',
//   target: string,                       // path / base URL / binary
//   surfaces: [{ id, name, hint }],       // screens / routes / pages / commands
//   lenses: [string],                     // ids from LENS_LIB (default: all)
//   personas: [{ name, goal }],           // fresh-eyes journeys (default: a generic spread)
//   competitors: [string],                // for the competitive lens
//   designSkills: [string],               // file paths of the user's UI skills to apply
//   antiFeatures: string,                 // "never propose / removed" list
//   projectContext: string,               // 1-paragraph what-this-is (NO solutions)
//   groundTruth: boolean,                 // exercise the real artifact (default true)
// }
export const meta = {
  name: 'audit-engine',
  description: 'Universal multi-agent audit engine: per-surface lenses + fresh-eyes personas + competitive teardown, adversarially verified, synthesized into a ranked fix list.',
  phases: [{ title: 'Audit' }, { title: 'Verify' }, { title: 'Synthesize' }],
}

const a = args || {}
const TYPE = a.targetType || 'code'
const GT = a.groundTruth !== false
const SURFACES = (a.surfaces && a.surfaces.length) ? a.surfaces : [{ id: 's1', name: a.target || 'the app', hint: '' }]
const DESIGN = a.designSkills || []
const ANTI = a.antiFeatures || '(none provided — infer from README/CLAUDE.md)'
const CTX = a.projectContext || 'A software product under audit.'
const PERSONAS = (a.personas && a.personas.length) ? a.personas : [
  { name: 'first-timer', goal: 'accomplish the single most obvious core task, having never seen this before' },
  { name: 'power user', goal: 'do the full real workflow fast, with keyboard/shortcuts/bulk actions' },
  { name: 'impatient / break-it user', goal: 'tap fast, double-submit, go offline, enter weird input, hit Back at bad times' },
]
const COMPETITORS = a.competitors || []

// How to EXERCISE a surface for this target type (ground-truth instructions woven into every agent).
const EXERCISE = ({
  'website': 'Open the page in the browser via the Playwright MCP. CLICK every control; TYPE into every field; SUBMIT and watch the network panel to confirm the write actually persisted (status 2xx + the value present on reload); navigate away and back to check it stuck; screenshot. Check console for errors.',
  'running-app': 'Drive the app on the connected device: launch it, ALWAYS read element bounds from a uiautomator dump (never blind-tap), tap/enter, screencap before+after, and verify the change persisted by re-opening the screen and (where possible) reading it back from the backend/logcat. Watch logcat for swallowed errors.',
  'android-app-code': 'Trace the code path AND, if a device is connected, drive the screen to confirm. A whole-object .update() includes a field; a partial update may silently omit it; a column the DB lacks throws. Confirm the StateFlow updates and the value round-trips.',
  'cli': 'Actually RUN the command with real and edge inputs; check exit codes, stdout/stderr, idempotency, and that side effects persisted.',
  'api': 'Actually CALL the endpoint with valid + boundary + malformed payloads; assert status, body, persistence (GET back), and error shape.',
  'code': 'Read the implementation AND its call sites; trace each user-facing action to its effect; confirm it is wired, persisted, and consistent.',
})[TYPE] || 'Exercise the real artifact; do not trust that a control works because it renders.'

// ── Lens library: id -> what to hunt for. Selected by args.lenses (default = all). ──
const LENS_LIB = {
  'functional-persistence': 'FUNCTION & PERSISTENCE: does every control actually DO something and SAVE it (right field/column), or is the handler empty / a TODO / a hardcoded value / a UI that lies? This is the #1 trust-killer — a control that renders but never persists.',
  'cross-surface-sync': 'SYNC: when this data changes here, does every OTHER surface that shows it update without a manual refresh? Hunt for duplicated state/store/repository instances, missing invalidation, and counters/labels that disagree across surfaces.',
  'ui-interaction-craft': 'UI CRAFT: spacing/alignment/typography rhythm, hierarchy, press feedback, hit targets, consistency with the design tokens, dialog/sheet styling, and anything that reads as generic or unfinished. Apply the user\'s design skills (see DESIGN).',
  'motion': 'MOTION: durations (UI < ~300ms, ease-out for enters), nothing that "pops" huge then settles, interruptible transitions, no animation on high-frequency actions, snappy drag that follows the finger. Flag janky, slow, or absent motion where it would aid comprehension.',
  'fresh-eyes-customer-journeys': 'FRESH-EYES: (handled by dedicated persona agents) real users with no product knowledge attempting real goals — where they get stuck, confused, or wish for something missing.',
  'competitive-gaps': 'COMPETITIVE: (handled by dedicated agents) capabilities best-in-class rivals have that this lacks and that fit the product\'s ethos.',
  'accessibility': 'A11Y: touch-target >=48dp / 24px, color contrast, focus order, labels/content-descriptions/alt text, screen-reader sanity, dynamic-type/zoom, motion-reduction. Name concrete failures.',
  'performance': 'PERF: jank sources (work on the main thread, unkeyed lists, unnecessary recompositions/re-renders, oversized images, layout thrash), slow first paint, memory leaks. Be specific about the hot path.',
  'security-privacy': 'SECURITY/PRIVACY: secrets in client, missing authz checks, injection, over-broad permissions, PII in logs, enumeration, unvalidated input, insecure deep links. Weigh severity for the product\'s context.',
  'microcopy-tone': 'COPY: labels/errors/empty-states that are vague, robotic, blaming, or jargon-y; inconsistent voice; missing the next action. Propose the exact better words.',
  'empty-and-error-states': 'EMPTY/ERROR: every list/screen with no data and every failure path — is there a calm, helpful, on-brand state with a clear next step, or a blank/raw-error/dead-end?',
  'edge-cases': 'EDGE CASES: long text, zero/one/many, offline, slow network, duplicates, timezones/DST, huge numbers, rapid double-tap, interruption, permission denied. Which break or silently swallow?',
  'design-token-consistency': 'TOKENS: are colors/spacing/radii/type pulled from the shared system, or are there one-off hardcoded values and drifting variants? List the offenders.',
  'onboarding-first-run': 'FIRST RUN: the cold-start / empty-account / first-use path — is it obvious what to do first, or dropped into a blank, confusing state? (Tie to the first-timer persona.)',
  'delight': 'DELIGHT: one or two high-leverage, on-brand moments (a thoughtful transition, a satisfying confirmation, a smart default) that would make this memorable WITHOUT violating the anti-features.',
  'trust-audit': 'TRUST: specifically hunt for "the UI lies" — toggles/fields/pickers that appear functional but do nothing, optimistic updates with no rollback, success messages on failed writes, stale data shown as fresh. These destroy user trust fastest.',
}

const lensIds = (a.lenses && a.lenses.length ? a.lenses : Object.keys(LENS_LIB))
  .filter(id => LENS_LIB[id] && id !== 'fresh-eyes-customer-journeys' && id !== 'competitive-gaps')
const wantPersonas = !a.lenses || a.lenses.includes('fresh-eyes-customer-journeys')
const wantCompetitive = (!a.lenses || a.lenses.includes('competitive-gaps'))

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          severity: { type: 'string', enum: ['P0', 'P1', 'P2', 'P3'] },
          lens: { type: 'string' },
          evidence: { type: 'string' },        // what you observed when you exercised it
          location: { type: 'string' },        // file:line OR url+selector OR command
          fix: { type: 'string' },
        },
        required: ['title', 'severity', 'lens', 'evidence', 'location', 'fix'],
      },
    },
  },
  required: ['findings'],
}
const VERDICT = {
  type: 'object',
  properties: {
    isReal: { type: 'boolean' },
    confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    reasoning: { type: 'string' },
    refinedFix: { type: 'string' },
  },
  required: ['isReal', 'confidence', 'reasoning'],
}
const REPORT = {
  type: 'object',
  properties: {
    summary: { type: 'string' },
    p0p1: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, location: { type: 'string' }, fix: { type: 'string' } }, required: ['title', 'location', 'fix'] } },
    p2p3: { type: 'array', items: { type: 'object', properties: { title: { type: 'string' }, location: { type: 'string' }, fix: { type: 'string' } }, required: ['title', 'location', 'fix'] } },
    syncProblems: { type: 'array', items: { type: 'string' } },
    missingFeatures: { type: 'array', items: { type: 'string' } },
    uiCraft: { type: 'array', items: { type: 'string' } },
    fixOrder: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'p0p1', 'p2p3', 'fixOrder'],
}

const head = `TARGET: ${CTX}\nTYPE: ${TYPE}${a.target ? ' @ ' + a.target : ''}\nANTI-FEATURES (never propose / already removed): ${ANTI}\nGROUND TRUTH: ${GT ? 'YES — ' + EXERCISE : 'read-only static analysis (note where you could not confirm by exercising)'}\nDESIGN SKILLS to apply for any UI judgement (READ each file and apply its principles): ${DESIGN.length ? DESIGN.join(', ') : '(none installed — apply general craft: spacing, hierarchy, ease-out motion < 300ms, real press feedback)'}\nReport ONLY concrete, verifiable defects (exact location + the evidence you observed). Fewer real findings beat speculation.`

const lensText = lensIds.map(id => `• [${id}] ${LENS_LIB[id]}`).join('\n')

phase('Audit')
const surfaceRuns = SURFACES.map(s => () =>
  agent(`${head}\n\nAUDIT THIS SURFACE: ${s.name}${s.hint ? ' — ' + s.hint : ''}\n\nRun EVERY lens below on it. For each lens, EXERCISE the surface (don't assume), and report concrete findings with the exact location and the evidence you saw.\n\nLENSES:\n${lensText}`,
    { label: `audit:${s.id}`, phase: 'Audit', schema: FINDINGS }))

const personaRuns = wantPersonas ? PERSONAS.map(p => () =>
  agent(`You are a real person: the "${p.name}". Your goal: ${p.goal}. You have NEVER seen this product and know nothing about how it was built — react only to what you experience.\n\n${GT ? EXERCISE + '\n' : ''}Attempt your goal on: ${CTX} (${a.target || TYPE}). Narrate where you hesitate, get confused, can't find something, have to do too many steps, or wish something existed. Then list the concrete friction points and missing things as findings (lens = "fresh-eyes-customer-journeys"), each with where it happened and a fix. Do NOT propose anything in the anti-features list: ${ANTI}.`,
    { label: `persona:${p.name}`, phase: 'Audit', schema: FINDINGS })) : []

const compRuns = (wantCompetitive && COMPETITORS.length) ? COMPETITORS.map(c => () =>
  agent(`${head}\n\nCOMPETITIVE TEARDOWN: research "${c}" (use web search). Extract the strongest capabilities/interactions it has that THIS product lacks AND that fit its ethos (respect the anti-features). For each, return a finding (lens = "competitive-gaps", severity by impact) describing the gap and how to adopt it here.`,
    { label: `compete:${(c || '').slice(0, 18)}`, phase: 'Audit', schema: FINDINGS })) : []

const audited = await parallel([...surfaceRuns, ...personaRuns, ...compRuns])
const raw = audited.filter(Boolean).flatMap(r => (r.findings || []))
log(`${raw.length} candidate findings from ${SURFACES.length} surfaces + ${personaRuns.length} personas + ${compRuns.length} competitors`)

phase('Verify')
const verified = await parallel(raw.map(f => () =>
  agent(`${head}\n\nADVERSARIALLY VERIFY this finding by re-exercising / re-reading the named location. Default isReal=FALSE unless you can confirm the exact broken path, missing persistence, sync break, or precise UI/a11y flaw. Reject vague claims and over-escalated severities.\n\nFinding [${f.severity}/${f.lens}] ${f.title}\nEvidence: ${f.evidence}\nLocation: ${f.location}\nProposed fix: ${f.fix}`,
    { label: `verify:${(f.title || '').slice(0, 24)}`, phase: 'Verify', schema: VERDICT })
    .then(v => ({ ...f, ...v }))))
const real = verified.filter(Boolean).filter(v => v.isReal && v.confidence !== 'low')
log(`${real.length}/${raw.length} confirmed`)

phase('Synthesize')
const report = await agent(
  `${head}\n\nCONFIRMED findings (each adversarially verified):\n` +
  (real.length ? real.map(f => `- [${f.severity}/${f.lens}] ${f.title} @ ${f.location} — ${f.refinedFix || f.fix}`).join('\n') : '(none)') +
  `\n\nDedupe overlaps, then produce: p0p1 (trust-breakers: silent non-saving controls, sync breaks, data loss, crashes), p2p3 (confusing/clutter/partial), syncProblems, missingFeatures (from personas/competitors), uiCraft (concrete polish with locations), and fixOrder (sequence — highest user-trust impact first, then high-impact/low-effort). Be concrete with locations.`,
  { label: 'synthesize', phase: 'Synthesize', schema: REPORT })

return report
