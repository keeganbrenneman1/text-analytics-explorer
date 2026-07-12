# Text Analytics Explorer — Spec

_A living reference doc, not a frozen contract. Update as decisions change._

## Why

Most data — and a growing share of new data — is textual and unstructured. Text
analytics (TA) exists to give that data structure, enabling both strategic review
(e.g. auditing terms & conditions) and operational action (e.g. reaching out to
customers harmed by fine print).

TA is increasingly commoditized by LLMs. This project demonstrates hands-on
capability to design and build an LLM-powered TA product, not just use one.

## Tech stack

- **Frontend**: React, deployed as a static site (Vercel or Netlify free tier)
- **Database**: Supabase (free-tier Postgres + auto-generated API)
- **Extraction**: starts as a rule-based mock function behind a single interface;
  swapped for real Claude API calls once the UI and data model are stable.
  This seam is intentional — same function signature in, real LLM call out —
  so the swap doesn't touch UI code.
- **Auth**: none for v1. Single implicit user/workspace. No permissioning.

## Data model

- **Project**: top-level container. Has its own topics, themes, documents,
  and threshold settings. No connection between projects — shared vocabulary
  requires re-upload or re-creation in each project.
- **Document**: bound to one project. Unique key per project, system-reserved
  (not solely user-supplied). Ranges from a few characters (tweet) to
  thousands (call transcript).
  - Uploading an identical document again is **blocked**.
  - Uploading a document with the same key but different content **replaces**
    the prior version and triggers reprocessing (so counts don't drift).
  - Every document lands in one of three states after extraction:
    - **Tagged** — matched topic(s), optionally theme(s)
    - **Orphaned** — matched a parent topic, no child topic → flags for mining
    - **Untagged** — nothing matched
- **Topic**: durable, "what"-oriented, can nest up to **3 levels deep**,
  user-seedable, persists even if source documents are deleted. Matched
  against the existing project taxonomy before minting a new one.
- **Theme**: fleeting, "why/how"-oriented (sentiment, cause, pattern), flat
  (no nesting). Also matched against existing project vocabulary rather than
  freely regenerated each time. Not required per document.
- **Promotion**: theme → topic. Triggered by system logic/threshold, never
  purely manual (an admin can always create a topic directly instead).
  LLM proposes a reframed topic name; admin confirms/edits/denies.
- **Merge**: semantic dedup of two topics or two themes. Always proposed,
  never automatic. Admin confirms/edits/denies.
- **Insight**: explicitly **out of scope for v1** — a future, threshold-gated,
  cross-document synthesis layer, distinct from per-document extraction.

## Suggestion lifecycle

Every suggestion (topic/theme creation, promotion, merge) has three states:

- **Pending** — awaiting action. Visible for a rolling **90-day** window,
  used for prioritization.
- **Confirmed** — accepted, becomes part of the taxonomy.
- **Denied** — rejected. Visible for a rolling **30-day** window (who denied
  it, when). Denials suppress semantically similar re-suggestions **for that
  30-day window only** — if something similar resurfaces after 30 days, that's
  a deliberate signal it may be different enough to warrant reconsideration.
  Denials can be **undone** ("undeny"), returning the item immediately to
  pending.

## Per-project mining settings

Three independent dials, each set to **Conservative / Balanced / Aggressive**:

- **Detection** — how readily new topics/themes are suggested
- **Promotion** — how readily a theme is proposed for promotion
- **Merging** — how readily two items are proposed for merging

Mining runs **daily** across the whole project by default; manual "run now"
is always available.

## Screens

1. **Upload** — drop/browse files, duplicate-key handling, recent uploads
   list with state badges (Tagged/Orphaned/Untagged).
2. **Text Analytics** (grouped nav item, tabs within):
   - **Taxonomy** — expandable tree (up to 3 levels), click a topic to drill
     into its documents, "+ Add topic/subtopic" for manual seeding.
   - **Suggestions** — three separate inboxes (Creation, Promotion, Merge),
     each with confirm/deny/rename actions and confidence + source excerpt.
   - **Pending** — 90-day rolling list across all suggestion types.
   - **Denied** — 30-day rolling list, with Undeny.
   - **Sandbox** — type any sentence, see a non-persistent preview of how it
     would classify (topics matched, theme signal, tagged/orphaned/untagged
     verdict), evaluated at the project's current threshold. Explainability
     first: always show *why*, not just the result.
3. **Documents** — searchable/filterable list of all documents (by state, or
   "has pending"), reachable directly or as a drill-target from Reports and
   Taxonomy. Document detail shows full text with topics/themes highlighted
   inline; spans tied to a pending decision get a distinct texture (not just
   a color) so pending vs. confirmed is visually unambiguous.
4. **Reports** — topic/theme occurrence counts (accumulated across batches),
   tagged/orphaned/untagged rate, each drillable into the Documents list.
5. **Settings** — the three threshold dials, plus a placeholder area for
   future per-project settings.
6. **Cold-Start / New Project** — choose an out-of-the-box starter model
   (e.g. Airline CX, Hotel Guest Experience, Support Ticket Triage), each
   bundled with a matching sample dataset, or start from a blank taxonomy.

## Deliberately deferred (not in v1)

- Insights (cross-document synthesized claims, threshold-gated)
- Date-based trend aggregation (falls back to upload date if a document has
  no native date field — flag the date source on any future trend chart so
  upload-date clustering isn't mistaken for a real behavioral trend)
- Statistical measures (avg/median) over trend aggregations
- Scheduled/crawled/polled ingestion (v1 is manual upload only)
- Denial/promotion attribution beyond a simple "who/when" (no full audit
  trail or role permissioning)

## Build sequencing

Left to Claude Code's judgment, with one constraint: extraction logic should
be isolated behind a single function/module from the start, so swapping the
mock implementation for a real Claude API call later doesn't require
touching UI or state-management code.
