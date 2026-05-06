create table public.analytics_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  session_id text not null,
  event_name text not null,
  event_props jsonb not null default '{}'::jsonb,
  page_path text,
  created_at timestamptz not null default now()
);

create index idx_analytics_events_user_created on public.analytics_events(user_id, created_at desc);
create index idx_analytics_events_session_created on public.analytics_events(session_id, created_at desc);
create index idx_analytics_events_name_created on public.analytics_events(event_name, created_at desc);

alter table public.analytics_events enable row level security;

create policy "anyone can insert own events"
  on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);