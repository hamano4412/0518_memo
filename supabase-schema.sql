create extension if not exists pgcrypto;

create table if not exists public.meeting_records (
  id uuid primary key default gen_random_uuid(),
  company text not null default '',
  our_contact text not null default '',
  their_contact text not null default '',
  meeting_date date,
  summary text not null default '',
  decision text not null default '',
  homework text not null default '',
  due_date date,
  created_at timestamptz not null default now()
);

create index if not exists meeting_records_created_at_idx
  on public.meeting_records (created_at desc);
