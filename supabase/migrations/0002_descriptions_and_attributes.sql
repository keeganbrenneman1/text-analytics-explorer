-- Adds: topic/theme descriptions, and a flexible per-project structured
-- attribute registry (Source, Region, Channel, ...) with a matching
-- documents.attributes column to hold each document's values.

alter table topics add column description text;
alter table themes add column description text;

alter table documents add column attributes jsonb not null default '{}'::jsonb;
create index documents_attributes_idx on documents using gin (attributes);

create table project_attributes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references projects(id) on delete cascade,
  key text not null,
  label text not null,
  type text not null default 'text' check (type in ('text', 'number', 'date', 'select')),
  options text[] not null default '{}',
  created_at timestamptz not null default now(),
  unique (project_id, key)
);

create index project_attributes_project_id_idx on project_attributes(project_id);

alter table project_attributes enable row level security;
create policy "anon full access" on project_attributes for all using (true) with check (true);
