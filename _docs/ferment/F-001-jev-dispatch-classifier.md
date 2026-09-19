---
# --- identity ---
id: F-001
slug: jev-dispatch-classifier
title: "Jev in the sprint: dispatch classifier, not a second compact"
type: ferment_note
schema_version: 1

# --- lifecycle ---
status: fermenting
created: 2026-09-19
review_by: 2026-12-18
promoted_to: null
compost_reason: null

# --- provenance ---
origin:
  kind: chat
  session_ref: "grok 01a0bba2-17f8-7313-afb9-5c5f3cf31d67 · cwd /Users/trust/Dev/utils · clone kjon-life/fast-jev-compaction, audit, sprint-compact-tech, Haiku routing"
  date: 2026-09-19
  participants: [kjon, grok]
sources:
  - path: README.md
    note: "Upstream: Claude Code session.compact function-hook plugin + npm library. Types from Claude 2.1.274. Key via TYPESAFE_API_KEY."
  - path: bin/compact-transcript.ts
    note: "Fork-local offline CLI. Env key only. --dry-run = char shares, drop-all ceiling, built-in compactMetadata. No network."
  - path: ~/Dev/tessera/.claude/skills/sprint-compact-tech/SKILL.md
    note: "HOLD → § Resume + hub-resume.md → operator /compact → kill seats → respawn from files. Not a classifier. Not replaced by Jev."
  - path: ~/Dev/ops-workspace/.claude/skills/sprint-compact-tech/SKILL.md
    note: "Same protocol, ops-workspace copy."
  - path: ~/Dev/tessera/_docs/design/_prompts/orchestration/00-SYSTEM.md
    note: "Frontmatter-is-truth. H-8 denies per-invocation model. Role tiers: mechanical-execution vs implementation+review. Context budget table ~60/70/10k. Hub Thinness Contract."
  - path: ~/Dev/tessera/_docs/design/_prompts/orchestration/03-HARNESS.md
    note: "H-8 model resolution + dispatch deny. H-9 idle seats are billable."
  - path: ~/.config/secrets/api_keys.sh
    note: "Secret habitat (sourced from ~/.zshrc). TYPESAFE_API_KEY is not present. Do not use ~/.typesafe_key or settings.json."
  - path: ~/.claude/projects/-Users-trust-Dev-tessera/9dc6c73c-53da-4ea2-af6c-0f3221a8d7f1.jsonl
    note: "Measured hub session. 18MB, 1891 assistant turns, max 649687 input-side tokens, 6 manual /compact events."

# --- scope ---
projects:
  - fast-jev-compaction
  - tessera
  - ops-workspace
primary_project: fast-jev-compaction

# --- conceptual ontology ---
concepts:
  - dispatch_classifier
  - frontmatter_is_truth
  - mechanical_execution_tier
  - hub_thinness
  - compact_is_lossy_on_purpose
  - spawn_token_floor
  - mis_tier
  - haiku_implementer_gap
entities:
  - Jev
  - TypeSafe_System_One
  - sprint-compact-tech
  - session.compact
  - H-8
  - H-9
  - backend-agent
  - codegen-agent
  - register-agent
  - compact-transcript.ts
relations:
  - { from: Jev_compaction, rel: does_not_replace, to: sprint-compact-tech }
  - { from: Jev_compaction, rel: cannot_delete, to: spawn_token_floor }
  - { from: session.compact, rel: requires, to: Claude_2_1_274_function_hooks }
  - { from: H-8, rel: forbids, to: per_invocation_model }
  - { from: classifier, rel: chooses, to: subagent_type }
  - { from: mechanical_execution_tier, rel: is, to: haiku_seats }
  - { from: implementation_tier, rel: is, to: opus_seats }

# --- claims ---
claims:
  - id: C1
    text: "sprint-compact-tech is a HOLD/write-artifacts/respawn protocol because built-in /compact is lossy. Jev does not replace it. Operator confirmed that was never the ask."
    epistemic: design_decision
    confidence: 0.95
    spans_projects: true
    falsifiable: false
    status: supported
  - id: C2
    text: "Built-in /compact already maximizes token deletion. Tessera hub 9dc6c73c: six manual compacts, 95.2–98.5% token drop (e.g. 650042→11585, 610272→15215). Jev never removes user/assistant text (~17% of content chars) so it cannot win a size contest against /compact."
    epistemic: observation
    confidence: 0.95
    spans_projects: false
    falsifiable: true
    status: supported
  - id: C3
    text: "That same hub transcript does not fit Jev's default 25k state budget (~32848 estimated tokens after full truncation, 957 tool pairs). A live plugin would throw and fall back to /compact. Hub-scale Jev compact is not a current tool."
    epistemic: observation
    confidence: 0.95
    spans_projects: false
    falsifiable: true
    status: supported
  - id: C4
    text: "The ~150k tokens that appear almost immediately are harness ingestion (TAXONOMY, CONVENTIONS, skills, MCP schemas), not stale tool results. Jev cannot touch that floor. Compacting more often does not make the next seat cheaper to start."
    epistemic: hypothesis
    confidence: 0.85
    spans_projects: true
    falsifiable: true
    status: open
  - id: C5
    text: "The classifier that belongs in this methodology is dispatch-time subagent_type selection (which carries model via frontmatter), not mid-flight model switch and not /compact. H-8 denies per-invocation model on sprint dispatches."
    epistemic: design_decision
    confidence: 0.9
    spans_projects: true
    falsifiable: false
    status: open
  - id: C6
    text: "Tessera already has 7 Haiku seats; they are mechanical-execution (codegen, register, smoke-test, sprint-close, intake, merge-readiness, prompt-observer), not small-Opus implementers. There is no Haiku backend/frontend agent. 'Haiku-level task' is empty for an implementation block without a new charter."
    epistemic: observation
    confidence: 0.95
    spans_projects: true
    falsifiable: false
    status: supported
  - id: C7
    text: "Measurable gain without function hooks: (1) spawn tokens by subagent_type — mechanical should match the ~10k budget row, not 150k; (2) mis-tier rate — Opus seats running prescribed-command briefs that already have a Haiku type; (3) H-9 idle tax. Jev live-scoring of briefs is step 4, after TYPESAFE_API_KEY exists."
    epistemic: method
    confidence: 0.8
    spans_projects: true
    falsifiable: true
    status: open
  - id: C8
    text: "Live replacement of Claude Code /compact via session.compact is blocked: running Claude is 2.1.267; plugin types are 2.1.274+; operator will not upgrade. Offline CLI on JSONL can score; it cannot change a live context window."
    epistemic: observation
    confidence: 0.95
    spans_projects: false
    falsifiable: true
    status: supported
  - id: C9
    text: "TypeSafe key habitat is process.env.TYPESAFE_API_KEY from ~/.config/secrets/api_keys.sh (zshrc). Not ~/.typesafe_key, not ~/.claude/settings.json, not plugin userConfig.apiKey, not --api-key. Key is not on the machine as of 2026-09-19."
    epistemic: design_decision
    confidence: 0.95
    spans_projects: false
    falsifiable: false
    status: supported

# --- agent affordances ---
next_move: "At triage: pick one recent tessera sprint. For each block, record subagent_type vs whether the brief was prescribed-command. Read first assistant usage (input+cache) on mechanical seats vs implementer seats. If mechanical opens at ~150k, slim-read is dead (meta-agent §555). Do not install the plugin. Do not add TYPESAFE_API_KEY until that table exists."
do_not:
  - "Install the Claude Code function-hook plugin or set CLAUDE_CODE_ENABLE_FUNCTION_HOOKS"
  - "Put TYPESAFE_API_KEY in settings.json, ~/.typesafe_key, or plugin userConfig"
  - "Replace or rewrite sprint-compact-tech"
  - "Override model/effort on a sprint Agent() call (H-8)"
  - "Charter a Haiku backend-agent without a new mechanical-implementer ingestion tier"
  - "Treat Jev char-reduction as billed-token savings vs /compact"
  - "Wire a Grok compaction host"
  - "Live-compact Orienne/PHI transcripts to api.typesafe.ai"
  - "File BL-/TD- IDs from this note"
  - "Copy this note into tessera or ops-workspace ferment — cross-link only"
tags:
  - jev
  - classifier
  - dispatch
  - compaction
  - haiku
  - H-8
  - sprint
---

# F-001 — Jev in the sprint: dispatch classifier, not a second compact

**Status:** fermenting. Clone is pinned at `e3f262a` (`origin` kjon-life, `upstream` tamaratran, push to upstream disabled). Function-hook plugin is a future host. The live question is whether TypeSafe Jev belongs at **dispatch**.

### What was tried and discarded

| Path | Verdict |
|------|---------|
| Replace `sprint-compact-tech` with Jev | Reject. Different job. HOLD/respawn stays. |
| Compact more often to beat the 150k/350k/500k creep | Reject. 150k is ingestion. Jev does not delete TAXONOMY. `/compact` already zeros the hub (95–98% token drop). |
| Per-block model override so “Haiku-level” work runs Haiku | Reject. H-8. Model is frontmatter. |
| Live `session.compact` plugin on current Claude | Blocked. 2.1.267 vs 2.1.274+; operator will not upgrade. |
| `~/.typesafe_key` / settings.json key | Reject. Habitat is `~/.config/secrets/api_keys.sh`. |

### What was measured (one tessera hub JSONL)

Session `9dc6c73c-53da-4ea2-af6c-0f3221a8d7f1`: 2552 parsed messages, 957 tool pairs (Bash 352, SendMessage 176, ScheduleWakeup 143, Agent 40). Content chars: tool results 54%, tool inputs 28%, text 17%. Drop-all-non-pinned-calls ceiling **82.7% of content chars** (text remains). Jev state **unfittable** (~32.8k vs 25k). Six built-in `/compact` events, all `manual`, 95–98% token reduction to 8–15k. Peak usage: 2 uncached input, 644701 cache-read. Hit 300k at turn 85/1891, 500k at turn 299, then ~1600 turns and six compact cycles. 1689 subagent JSONLs in that project tree (p50 ~0.9MB).

### Where a classifier actually sits

Jev `choice` on the **block card**, at spawn, picking **`subagent_type`**:

| Label | Seat |
|-------|------|
| `mechanical` | codegen / register / sprint-close / merge-readiness / smoke-test (Haiku, slim read) |
| `sonnet-ops` | deploy / state / worktree-init / hitl-herald |
| `opus-impl` | backend / frontend / migration / supabase / sentinel / staff-* |

Hub Thinness already requires this. The leak is Fable-hub (or Opus implementers) doing work that already has a Haiku type. Jev’s only edge over “Fable, pick the type” is a logged probability you can score against sentinel REVISE. It does not unlock a new model and does not shrink spawn tokens.

Haiku implementer = new charter (pathspec, tests exist, no schema/taxonomy, mechanical ingestion). Not a ferment execution. Not `backend-agent` with a different model.

### Fork residue (uncommitted as of admit)

`src/transcript.ts`, `bin/compact-transcript.ts`, tests, `npm run compact`. Env key only. `--dry-run` is the no-key eval (shares, ceiling, `compactMetadata`). 35 tests passing. Do not treat that CLI as live compact.

### Kill criteria

Compost this note if: (a) mechanical seats already spawn at the ~10k row and mis-tier is ~0, or (b) operator decides Jev stays a TypeSafe experiment with no tessera dispatch use. Promote if the sprint table in `next_move` shows a real mis-tier or a slim-read failure worth a design.
