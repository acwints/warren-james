create table workflow_runs (
  id text primary key,
  creator_id text not null,
  creator_name text not null,
  creator_snapshot jsonb not null,
  source text not null,
  source_event_id text,
  workflow_template_version text not null,
  attempt integer not null default 1,
  retry_of_run_id text references workflow_runs(id),
  status text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  triggered_by text not null,
  dry_run boolean not null default true
);

create table workflow_steps (
  run_id text not null references workflow_runs(id) on delete cascade,
  step_key text not null,
  label text not null,
  status text not null,
  started_at timestamptz,
  completed_at timestamptz,
  message text,
  artifact_id text,
  primary key (run_id, step_key)
);

create table workflow_artifacts (
  id text primary key,
  run_id text not null references workflow_runs(id) on delete cascade,
  kind text not null,
  label text not null,
  url text,
  metadata jsonb not null default '{}'
);

create table workflow_review_items (
  id text primary key,
  run_id text not null references workflow_runs(id) on delete cascade,
  title text not null,
  owner text not null,
  status text not null,
  due_at timestamptz not null,
  source text not null,
  detail text not null
);

create table workflow_audit_events (
  id text primary key,
  run_id text not null references workflow_runs(id) on delete cascade,
  at timestamptz not null,
  actor text not null,
  action text not null,
  detail text not null
);

create table source_events (
  id text primary key,
  provider text not null,
  event_type text not null,
  external_id text not null,
  object_id text,
  object_type text,
  fingerprint text not null unique,
  received_at timestamptz not null,
  status text not null,
  duplicate_deliveries integer not null default 0,
  related_run_id text references workflow_runs(id),
  raw_summary text not null
);

create index workflow_runs_creator_id_idx on workflow_runs(creator_id);
create index workflow_runs_status_idx on workflow_runs(status);
create index review_items_status_due_idx on workflow_review_items(status, due_at);
create index source_events_received_at_idx on source_events(received_at desc);
