# Agent Village — Data Infrastructure: a fixture document with a deliberately long heading

Proposed scope of work for a small data platform, written to exercise every construct the reader has to handle well. This paragraph doubles as the lede and the OpenGraph description.

## Context

Agent Village runs a handful of long-lived agents that produce events, logs, and artefacts. Today those land in three places and nobody has a single view. This document proposes a **minimal** pipeline, an *opinionated* schema, and a `dbt` project on top.

> The goal is not a data warehouse. The goal is one table Timour can trust.

A long URL to check wrapping: https://example.com/a/very/long/path/that/keeps/going/and/going/with?query=parameters&and=more&stuff=true&even=longer

## Proposed scope

1. Ingest agent events into Postgres via a thin HTTP collector.
2. Model them with dbt into three marts: `runs`, `tool_calls`, `costs`.
3. Expose a read-only dashboard.

- Unordered list item one
- Unordered list item two
  - Nested item
- [x] A completed task
- [ ] An open task

## Deliverables

| Deliverable | Owner | Week | Notes |
| --- | --- | :---: | --- |
| Collector service | Carter | 1 | Node, one endpoint, idempotent writes |
| dbt project | Carter | 2 | Three marts, tests on every primary key |
| Dashboard | Carter | 3 | Evidence or Metabase, whichever is quicker |
| Handover doc | Carter | 3 | This document, updated |

```ts
export async function collect(event: AgentEvent): Promise<void> {
  const id = hash(event.runId, event.seq);
  await sql`insert into events (id, payload) values (${id}, ${event}) on conflict do nothing`;
}
```

```bash
curl -X POST https://share.carter.md/api/share \
  -H "Authorization: Bearer $SHARE_TOKEN" \
  -H "Content-Type: text/markdown" \
  --data-binary @proposal.md
```

---

## Not in scope

Real-time streaming, multi-tenant access control, and anything that needs a Kafka cluster. Inline `code`, a [link to the site](https://cartercrouch.dev), and an image reference that should be sanitised but harmless: ![alt](https://cartercrouch.dev/profile.jpeg)

<script>alert("this should never run")</script>

### A third-level heading

Final paragraph with a footnote-like aside — hairline rules above, whitespace below.
