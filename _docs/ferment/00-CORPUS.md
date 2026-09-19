# Ferment corpus — diverging ideas not yet planned commitments

**Purpose:** Hold high-signal ideas, chat residues, and half-formed claims that
are **not ready to schedule** and **not research conclusions yet**. Ferment is
deliberate delay with structure — a parking lot with kill criteria, not a second
backlog and not a second research stream.

**Why this exists:** This checkout is a pinned fork of TypeSafe Jev compaction
(`origin` = `kjon-life/fast-jev-compaction`, `upstream` = `tamaratran/fast-jev-compaction`).
Chat about how it fits tessera/ops sprint methodology throws off diverging threads
(plugin vs CLI, compact vs classify, Haiku routing). If they only live in scrollback,
they die. If they go straight into a plugin install or a tessera sprint, they fake
commitment. Ferment is the middle state: **track the divergence until it promotes,
composts, or becomes a real plan.**

**Lineage:** Cap, admission, lifecycle, and frontmatter grammar are ops-workspace's
(`~/Dev/ops-workspace/_docs/ferment/00-CORPUS.md`), itself from tessera. Location
and project scope are this repo's. Do not copy ops-workspace or tessera F-notes here.

---

## Location decision (locked)

| Option | Verdict |
|--------|---------|
| tessera `_docs/ferment/` only | Reject as home. Sibling corpus; cross-links allowed, not ownership. |
| ops-workspace `_docs/ferment/` only | Reject as home. That corpus is company-runtime / conventions. Cross-link. |
| `~/Dev/utils/jev/` | Reject. Legal docs only (`_docs/agreements_*`). |
| Ad-hoc folder, no index | Reject. Becomes “just another folder.” |
| **`fast-jev-compaction/_docs/ferment/`** | **Primary home for this fork's ferment.** Git-versioned, next to `src/` / `bin/`. |

---

## What ferment is / is not

| Is | Is not |
|----|--------|
| Diverging ideas not yet planned commitments | A plugin install or a tessera sprint |
| Claim candidates, method sketches, decision residues | Frozen plans |
| Structured delay with `review_by` | Infinite open items |
| Promotion path into a design / eval / tessera plan | Replacement for upstream README |
| Cap-bounded (12 fermenting) | Dumping ground for every chat |

**Promotion targets when ripe:**

- A design note under `_docs/design/` in this clone
- A tessera/ops-workspace sprint or design (pointer from `promoted_to`)
- Upstream PR on `origin` only if it is code this fork should keep
- Compost — default

---

## Anti-growth rules (non-negotiable)

1. **Hard cap:** at most **12** notes with `status: fermenting` at once.
   To add a 13th, promote or compost one first. No “just this once.”
2. **Admission gate:** enter only if the note asserts ≥1 of:
   - a **claim candidate** (falsifiable or formalizable),
   - a **method** you will reuse (eval cycle, gate shape, labeling loop),
   - a **decision residue** that would otherwise be re-litigated,
   - a **divergence** from a planned path that is not yet a sprint.
   Pure ops, single-bug talk, or already-scheduled work → do not admit.
3. **No open-forever:** every note has `review_by` (ISO date, ≤90 days from
   `created`). Missed review → `stale`; next triage must promote, re-date, or compost.
4. **Compost is success:** most notes should die. Archiving is correct, not failure.
5. **Not a work queue:** ferment notes do **not** get `BL-*` / `TD-*` IDs.
6. **Index is the only list:** `INDEX.md` is hand-maintained. File without index
   row = orphan → compost or index same day.

---

## Lifecycle

```
admitted → fermenting → ripe → promoted | composted
                ↘ stale ↗ (must resolve at triage)
```

| Status | Meaning |
|--------|---------|
| `fermenting` | Set aside on purpose; do not build yet; not a commitment |
| `ripe` | Sharp enough to draft research, design, or a sprint plan |
| `promoted` | Content lives elsewhere; this note is a stub + pointer |
| `stale` | Past `review_by` without decision |
| `composted` | Explicitly discarded; file may move to `archive/` |

---

## File grammar

- ID: `F-{NNN}` monotonic, never reused (`F-001`, `F-002`, …)
- Filename: `F-{NNN}-{slug}.md`
- Index row + file + frontmatter `id` must match
- One primary idea per note; split rather than kitchen-sink

---

## Frontmatter ontology (pre-KG)

Every ferment note carries a YAML block. Agents treat frontmatter as the typed
graph until a richer ontology surface exists.

### Template

```yaml
---
# --- identity ---
id: F-000
slug: example-slug
title: "Short title"
type: ferment_note
schema_version: 1

# --- lifecycle ---
status: fermenting          # fermenting | ripe | promoted | stale | composted
created: YYYY-MM-DD
review_by: YYYY-MM-DD       # ≤ created + 90d
promoted_to: null           # path when promoted
compost_reason: null

# --- provenance ---
origin:
  kind: chat                # chat | journal | call | reading | walk
  session_ref: null
  date: YYYY-MM-DD
  participants: [kjon, agent]
sources: []

# --- scope ---
projects:
  - fast-jev-compaction
primary_project: fast-jev-compaction

# --- conceptual ontology ---
concepts: []
entities: []
relations: []

# --- claims ---
claims:
  - id: C1
    text: "One-sentence claim"
    epistemic: hypothesis   # observation | hypothesis | design_decision | method
    confidence: 0.4
    spans_projects: false
    falsifiable: true
    status: open            # open | supported | refuted | deferred

# --- agent affordances ---
next_move: null
do_not: []
tags: []
---
```

---

## Operator loop (when you return)

1. Open `INDEX.md` only — not the whole folder.
2. Anything `stale` or past `review_by` → promote / re-date / compost **before** new admits.
3. For one `fermenting` note: re-read claims; sharpen or kill.
4. If a claim is plan-shaped → `ripe` → design/eval; if evidence-shaped → measure, then decide.
5. Stop. Do not process the whole corpus in one sitting.

---

## Related

- Sibling corpora (not this one): `ops-workspace/_docs/ferment/`, `tessera/_docs/ferment/`
- This fork: `origin` kjon-life, `upstream` tamaratran, pin `pin/kjon-life-e3f262a`
- Offline utility: `bin/compact-transcript.ts` (`npm run compact -- --dry-run`)
