# text-analytics-explorer

## Status
IN PROGRESS — app scaffold, Supabase schema, and mock extraction/mining engine are built and wired end-to-end. Real-LLM extraction is still mocked (see [Extraction seam](#extraction-seam-mock--real)).

## Stack

- **Frontend**: React + TypeScript, built with Vite, styled with Tailwind CSS
- **Database**: Supabase (Postgres + auto-generated REST API), no auth in v1 (single implicit workspace)
- **Extraction**: rule-based mock behind a single isolated module — see below

## Getting started

1. Create a free [Supabase](https://supabase.com) project.
2. In the Supabase SQL editor (or via `supabase db push` with the CLI), run the migrations in `supabase/migrations/` **in order** against your project: `0001_init.sql` first (all core tables, the two count-increment RPC functions, permissive RLS policies), then `0002_descriptions_and_attributes.sql` (topic/theme descriptions, the structured-attribute registry). If you already have a live project from before `0002` existed, you must run it against that same project before deploying newer code — the app will error on missing columns/tables otherwise.
3. Copy `.env.example` to `.env.local` and fill in your project's URL and anon key (Project Settings → API in the Supabase dashboard):
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```
4. Install dependencies and run the dev server:
   ```
   npm install
   npm run dev
   ```
5. Open the app. With no projects yet, you'll land on the cold-start screen — pick a starter model (seeds a taxonomy + sample documents) or start blank.

Without a configured Supabase project, the app shows a "Connect Supabase" screen instead of crashing.

## Architecture

```
src/
  lib/
    extraction/        # isolated extraction + mining engine (see below) — no Supabase imports
    api/                # Supabase-backed data access layer (projects, taxonomy, documents, suggestions, mining, sandbox, attributes, reports)
    supabase.ts         # client + isSupabaseConfigured guard
    database.types.ts   # hand-written Supabase schema types
    types.ts            # app-facing domain types
    starterModels.ts    # cold-start taxonomy + sample document fixtures
  components/           # screens (Upload, Taxonomy, Suggestions, Pending, Denied, Sandbox, Documents, Reports, Settings, Cold-Start)
  App.tsx               # nav shell, project loading/switching
supabase/
  migrations/0001_init.sql
  migrations/0002_descriptions_and_attributes.sql
```

### Extraction seam (mock → real)

Everything upstream imports the extraction API from `src/lib/extraction/index.ts`:

- `extractDocument(input) => ExtractionResult` — classifies one document's text against a project's *existing* topic/theme keyword lists. Same function powers real document uploads and the non-persistent Sandbox preview.
- `computeSuggestions(input) => ProposedSuggestion[]` — the batch/mining counterpart. Re-runs `extractDocument` across every document, aggregates recurring unmatched terms, orphan clusters, theme occurrence/age, and name-similar pairs into topic/theme creation, promotion, and merge suggestions.

The current implementation (`mockExtractor.ts`, `mining.ts`) is deliberately rule-based: keyword/substring matching, deterministic pseudo-confidence, Jaccard similarity for merges. To swap in a real Claude-backed extractor later, implement the `Extractor` type (see `extraction/types.ts`) in a new file and change one export in `extraction/index.ts` — no UI or API-layer code needs to change.

### Data model

Mirrors `TA spec.md` directly: projects own topics (nested up to 3 levels), themes (flat), and documents; documents accrue `document_topics`/`document_themes` matches; every proposed change (topic/theme creation, promotion, merge) is a row in `suggestions` with a `pending → confirmed | denied` lifecycle and a normalized `signature` used both to avoid duplicate active suggestions and to suppress near-duplicates of a denial for 30 days.

Topics and themes carry a `description` (templated by the same mock-now/real-later seam as extraction — `src/lib/extraction/description.ts` — auto-generated on creation, or backfilled on demand from the Taxonomy screen). Projects also have a `project_attributes` registry (currently seeded with a single "Source" field) plus a `documents.attributes` JSONB column, so Upload/Documents/Reports can all filter and aggregate on structured metadata generically rather than each hardcoding a field name. Reports additionally computes topic co-occurrence (which topic pairs get tagged on the same document) client-side from the existing single taxonomy. Each project still has exactly one taxonomy — supporting multiple parallel taxonomies per project was considered and deliberately deferred as a much larger schema/architecture change with no concrete need yet.

### Known v1 simplifications

- Document detail shows matched topics/themes as a list with quoted excerpts rather than literal inline-highlighted spans in the running text — the mock extractor stores excerpts, not character offsets.
- Mining is manual ("Run mining now" in Settings) rather than an actual daily scheduled job; wiring a Supabase Edge Function + `pg_cron` for that is a natural next step.
- A document's identity key (`doc_key`, used for duplicate-blocking/replace) defaults to its file name rather than a separately-reserved system key.

## Background

Text Analytics is increasingly commoditized. LLMs for all put a world with TA everywhere within reach. While traditionally for customer experience/experience management, TA could be applied to any text at all.

## Why

Most data - and an increasing proportion of new data and sources - is textual and unstructured. TA exists to give that data structure. Given better structure, an organization can perform analytics and strategic tasks like reviewing the terms and conditions associated with a plane ticket’s purchase and operational tasks like directly reaching out to customers that have been negatively impacted by the fine print in the terms and conditions.

## What it does (high level)
-Given text, extract topics and themes
—Text is bound by a single document. It can range from a few characters (in the case of a tweet) to thousands characters (in the case of a transcribed phone call)
—Topics describe a bucket of data and categorize the text into those buckets. Topics are durable and can be thought of as the columns a TA system is trying to sort text into. Topics can be multiple levels deep. Topics are more what, concerned with what the text is about
—-Customers are able to seed their own topics
—Themes are lighter weight than topics - and fleeting. If a theme manifests frequently enough, then it might be “promoted” to a topic. Themes cannot be multiple levels deep. Themes are more why/how, concerned with the underlying messages, sentiment, or patterns of meaning
—-Give the user an opportunity to confirm/deny the promotion of a theme to a topic
-Given multiple sets of text, try to reconcile/de-dupe topics and themes where possible
—Multiple sets of text describe multiple documents
—Reconcile/de-dupe refers to merging similar concepts on the basic of semantics
—Give the user an opportunity to confirm/deny the attempted merge
-With topics and themes, a user is able to run simple reports on the counts of a topic or theme occurring. These counts accumulate across batches
### Data model
-Topics and themes are bound by a project 
—A project can take many shapes, but it is usually bound by a set of sources that accrue to 1+ use cases 
—An individual account or brand could have multiple projects
—Topics and themes can occur in multiple projects but there is no connection between the assets in each project. For a user to have the same topics and themes across projects, they need to upload the same documents and/or create the topics and themes in both projects
-Documents are unique per project. There needs to be a unique key per document
—Customers can provide unique identifiers of their own, but we need to reserve our own uniqueness because duplicates will cause major issues 
—Uploading a document twice, if it is identical, blocks the subsequent upload. If it is different, it replaces the previous upload
### User stories
As a topic admin,
I need to be able to upload documents and receive recommended topics and themes,
So that I can quickly create text analytics assets.

As a topic admin with known unknowns, 
I need to be able to create a topic ontology manually,
So that I don’t need to rely on the AI.

As a topic admin,
I need periodic recommended topics and theme identification,
So that my model stays fresh with the data.

As a topic admin,
I need to be able to confirm or deny theme promotion to topics,
So that my model stays fresh. 

As a topic admin,
I need to be able to confirm or deny theme and topic creation,
So that the system does not spin out of my control.

As a topic admin,
I need to be able to update the names of topics and themes,
So that the topics fit the naming conventions my organization has in place and remain cogent.

As a topic admin, 
I need to be able to merge or deny topic and themes creation,
So that the system does not take an action I disagree with. 

As a topic admin,
I need to be able to see the past 30 days of denied theme promotions, topic and theme creations, and merges,
So that I can distinguish between the work done (denied) and the work to do (pending).

As a topic admin, 
I should not see semantically similar themes identified as those in my denial queue,
So that I am not inundated with repeats.

As a topic admin, 
I need to be able to see the past 90 days of pending theme promotions, topic and theme creations, and merges,
So that I prioritize the TA work to be done.

As a topic admin,
I need to be able to specify conservative, balanced, and aggressive, per project, wrt detection, promotion, and merging,
So that I can be more confident or aggressive when something surfaces.

As a topic admin,
I need to be able to undeny accidental denials,
So that those items are moved back to pending and I can undo mistakes I or other admins made.
### Futures
-insight mining
-basic aggregation options like an ability to create trends on some sort of date field
—If a document doesn’t have a date, then the upload date would need to be used
-An ability to create some statistical measures like averages and medians to aggregate by those dates would be useful for understanding if an issue is truly one off or the beginning of a trend
-an ability to schedule, crawl, or poll data sources so that uploads aren’t all manual
