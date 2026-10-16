# Wide tables, anchors and footnotes: a fixture for the reader

This fixture exists to exercise the parts of the reader a long design document leans on: tables far wider than a phone, links that jump within the page, and footnotes that go there and back.[^scope] Every name and number in it is made up.

Jump to [the seven-column table](#seven-columns), to [the deep heading](#a-fifth-level-heading), or to [the end](#closing-notes). A link to [another site](https://example.com/page#section) must keep its own fragment.

## Ten columns

The table below is wider than any phone and wider than the desktop column. On screen it scrolls inside its own box, with a shadow on the edge that has more table behind it.

| Component | Owner | Ingest path | Storage | Retention | Consent scope | Refresh cadence | Failure mode | Backfill | Notes |
|---|---|---|---|---|---|---|---|---|---|
| Event collector | Platform | `collector.events.v1_ingest_pipeline_primary` | Postgres | 90 days | Participant-level | Every fifteen minutes | Retries with exponential backoff | Manual replay | Internationalisation-dependent formatting |
| Session archive | Research | Nightly export | Object storage | Indefinite | Cohort-level | Daily | Partial export, flagged downstream | Automatic | Counterintuitively the cheapest component |
| Identity crosswalk | Data | Batch join | Postgres | Experiment length | Participant-level | Hourly | Stale mapping, surfaced in the dashboard | Rebuild from source | Uncharacteristically sensitive to clock skew |
| Metrics marts | Analytics | dbt run | Postgres | Rolling year | Aggregate only | Every six hours | Model fails closed | Full refresh | `marts.verified_useful_outcomes_per_eligible_intention` |

## Seven columns

A narrower table, still wider than a phone.

| Step | Input | Output | Owner | Duration | Blocking | Status |
|---|---|---|---|---|---|---|
| Parse | Markdown source | Syntax tree | Reader | Milliseconds | No | Done |
| Sanitize | Syntax tree | Safe tree | Reader | Milliseconds | Yes | Done |
| Paginate | Safe tree | Printable document | PDF route | Seconds | No | Under review |

### A third-level heading

The paragraph below is hard-wrapped at about eighty columns, the way an agent
writes Markdown. Each single newline becomes a line break, as it does in
Obsidian, so it renders as short ragged lines rather than one flowing paragraph.

#### A fourth-level heading

A code line two hundred characters long, which scrolls on screen and wraps in print:

```text
reader.render(document, { theme: "light", size: 15, contents: true, footnotes: true, anchors: "prefixed", tables: "scroll-with-cue", print: { page: "A4", margins: "default" } }) // this line runs past two hundred characters
```

##### A fifth-level heading

Back to [the ten-column table](#ten-columns), or on to a second note.[^second]

## **Closing notes**

The heading above is bold, which renders in the emphasis colour, as Obsidian shows it. Its anchor still works: [back to the top of this section](#closing-notes).

[^scope]: The first footnote. Its back-reference returns to the opening paragraph.

[^second]: The second footnote, referenced from the fifth-level heading's section.
