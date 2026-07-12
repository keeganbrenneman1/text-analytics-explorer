-- Text Analytics Explorer — initial schema
-- v1 has no auth (single implicit workspace), so RLS policies below are
-- intentionally permissive for the anon key. Revisit before multi-tenant use.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- projects
-- ---------------------------------------------------------------------------
create table projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  detection_threshold text not null default 'balanced'
    check (detection_threshold in ('conservative', 'balanced', 'aggressive')),
  promotion_threshold text not null default 'balanced'
    check (promotion_threshold in ('conservative', 'balanced', 'aggressive')),
  merge_threshold text not null default 'balanced'
    check (merge_threshold in ('conservative', 'balanced', 'aggressive')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- topics — durable, "what"-oriented, nest up to 3 levels deep
-- ---------------------------------------------------------------------------
create table topics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  parent_id uuid references topics(id) on delete cascade,
  name text not null,
  depth smallint not null check (depth between 1 and 3),
  keywords text[] not null default '{}',
  doc_count integer not null default 0,
  created_at timestamptz not null default now()
);

create index topics_project_id_idx on topics(project_id);
create index topics_parent_id_idx on topics(parent_id);

-- ---------------------------------------------------------------------------
-- themes — fleeting, "why/how"-oriented, flat (no nesting)
-- ---------------------------------------------------------------------------
create table themes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  name text not null,
  keywords text[] not null default '{}',
  polarity text check (polarity in ('positive', 'negative', 'neutral')),
  doc_count integer not null default 0,
  first_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index themes_project_id_idx on themes(project_id);

-- ---------------------------------------------------------------------------
-- documents — unique per project by doc_key; identical re-upload is blocked,
-- differing content with the same key replaces the prior version.
-- ---------------------------------------------------------------------------
create table documents (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  doc_key text not null,
  name text not null,
  content text not null,
  content_hash text not null,
  state text not null check (state in ('tagged', 'orphaned', 'untagged')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (project_id, doc_key)
);

create index documents_project_id_idx on documents(project_id);

-- ---------------------------------------------------------------------------
-- document <-> topic / theme matches produced by extraction
-- ---------------------------------------------------------------------------
create table document_topics (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  topic_id uuid not null references topics(id) on delete cascade,
  confidence numeric(4, 3) not null default 0,
  excerpt text,
  orphan boolean not null default false,
  created_at timestamptz not null default now(),
  unique (document_id, topic_id)
);

create index document_topics_document_id_idx on document_topics(document_id);
create index document_topics_topic_id_idx on document_topics(topic_id);

create table document_themes (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents(id) on delete cascade,
  theme_id uuid not null references themes(id) on delete cascade,
  confidence numeric(4, 3) not null default 0,
  excerpt text,
  created_at timestamptz not null default now(),
  unique (document_id, theme_id)
);

create index document_themes_document_id_idx on document_themes(document_id);
create index document_themes_theme_id_idx on document_themes(theme_id);

-- ---------------------------------------------------------------------------
-- suggestions — creation / promotion / merge, each with a pending -> confirmed
-- | denied lifecycle. `signature` is a normalized dedup key used both to
-- avoid re-raising an already-pending suggestion and to suppress a denied
-- suggestion's near-duplicates for 30 days.
-- ---------------------------------------------------------------------------
create table suggestions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  kind text not null check (kind in ('topic_creation', 'theme_creation', 'promotion', 'merge')),
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'denied')),
  signature text not null,
  confidence numeric(4, 3) not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by text
);

create index suggestions_project_id_idx on suggestions(project_id);
create index suggestions_status_idx on suggestions(project_id, status);

-- only one active (pending) suggestion per project/kind/signature at a time
create unique index suggestions_active_signature_idx
  on suggestions(project_id, kind, signature)
  where status = 'pending';

-- ---------------------------------------------------------------------------
-- atomic doc_count adjustments (avoid read-modify-write races from the client)
-- ---------------------------------------------------------------------------
create or replace function increment_topic_doc_count(p_topic_id uuid, p_delta int)
returns void as $$
begin
  update topics set doc_count = doc_count + p_delta where id = p_topic_id;
end;
$$ language plpgsql;

create or replace function increment_theme_doc_count(p_theme_id uuid, p_delta int)
returns void as $$
begin
  update themes set doc_count = doc_count + p_delta where id = p_theme_id;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------------
-- keep documents.updated_at current on replace-upload
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger documents_set_updated_at
  before update on documents
  for each row
  execute function set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS — v1 has no auth, single implicit workspace. Open policies for the
-- anon key so the browser client can read/write directly. Tighten this
-- (real auth + per-user/workspace scoping) before this ever handles
-- multi-tenant or sensitive data.
-- ---------------------------------------------------------------------------
alter table projects enable row level security;
alter table topics enable row level security;
alter table themes enable row level security;
alter table documents enable row level security;
alter table document_topics enable row level security;
alter table document_themes enable row level security;
alter table suggestions enable row level security;

create policy "anon full access" on projects for all using (true) with check (true);
create policy "anon full access" on topics for all using (true) with check (true);
create policy "anon full access" on themes for all using (true) with check (true);
create policy "anon full access" on documents for all using (true) with check (true);
create policy "anon full access" on document_topics for all using (true) with check (true);
create policy "anon full access" on document_themes for all using (true) with check (true);
create policy "anon full access" on suggestions for all using (true) with check (true);
