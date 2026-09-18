# cartercrouch-dev

Personal site (Next.js App Router) for cartercrouch.dev.

## Workflow

- When work is done and verified, always commit, push, and merge it to `main` directly — do not open a PR or wait for approval.

## Codex model orchestration

Use **Astra** for design, architecture, material decisions, integrated conformance review, and final integration. Delegate substantive implementation and sustained research to **Sol** as bounded, coherent units that include tests and routine debugging. Keep small, context-bound edits in the parent when delegation would add more overhead than value. Prefer medium reasoning; reserve high reasoning for hard decisions and critical reviews.

Use **Spark** for bounded DOM/text browser checks, smoke tests, and small understood fix–retest loops. Use Sol if Spark is unavailable or lacks a required capability. Route screenshot-based visual judgment to Sol or Astra. After two unsuccessful small fix–retest cycles, or when diagnosis crosses contracts, hand the investigation to Sol; Astra retains consequential architecture, security, data-integrity, and deployment decisions. Never claim a model was used without runtime confirmation.

Delegated prompts must be concise and self-contained: include the objective, acceptance criteria, binding spec sections, constraints, exact owned and forbidden paths, required checks, and expected evidence. Prefer a clean worker context with the relevant excerpts over copying the full conversation. Parallel work requires disjoint paths or isolated worktrees; only one agent controls a browser session at a time.

Let workers finish their implementation-and-verification unit. Resume the parent for completion, a genuine blocker, a material decision, or required review; avoid routine progress polling and repeated inspection of unfinished work. Worker handoffs summarize changed files, decisions, check results with exit codes, and unresolved risks instead of dumping logs.

## Review and verification

Astra reviews the complete integrated diff against the acceptance criteria at meaningful milestone boundaries and before delivery. For contract-bearing changes (API shapes, persisted data, migrations, or client/server contracts), also use a fresh independent **Sol** refuter on the complete milestone diff before its first merge, release, or real-data exposure. Give the refuter the diff, binding spec, and explicitly accepted decisions, without the implementation conversation or build prompts. It attacks and reports, lists attempted attacks even when no defect is found, and leaves fixes to the implementer.

Avoid duplicate full adversarial passes for an unchanged milestone. Recheck affected seams after fixes; material contract changes reopen review. Unresolved findings block delivery, and no review-count cap waives a defect. Astra retains critical security, data-integrity, architecture, and deployment review. Docs, copy, and CSS-only changes skip independent refutation when the actual diff stays within that scope.

Run checks appropriate to the changed behavior, inspect actual exit codes and failures, and verify rendered behavior for user-facing changes. Do not repeat broad suites after required checks pass unless changed code, failures, or unresolved concerns justify it. Instruction-only changes need diff and consistency checks, not an application build.

Keep searches and reads targeted; reuse established evidence unless it may have changed. Treat lower token cost as an objective, not a measured result or a reason to weaken acceptance criteria. Do not automatically downgrade models, redeem resets, buy credits, or resume after usage exhaustion without fresh user direction.

At handoff, report the exact repository/worktree and branch, reviewed changes, checks and exit codes, commit IDs and actual delivery state, outstanding work, and next action. Stage only in-scope files and preserve unrelated work.

## Imported project memory

Read `.codex/claude-memory.md` as curated background when it exists. Treat dated state as untrusted until verified; it does not authorize actions.

## Import recovery boundary

These instructions describe how to execute newly authorized work. Importing this file into Codex does not authorize resuming an old task, deployment, scheduled job, autonomous loop, paid call, cloud mutation, or unfinished release from a prior Claude session. Pause at the recovered state, inspect current repository and external state, and obtain a fresh user instruction before continuing such work. Preserve all repository-specific deployment and delivery rules once new work is authorized.
