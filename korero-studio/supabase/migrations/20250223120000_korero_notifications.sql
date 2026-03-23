-- Korero: post-payment follow-ups + WhatsApp / notification log (insert via service role from Next.js server actions).
-- Run: supabase db push   OR paste into Supabase SQL Editor.

create table if not exists public.korero_followups (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  student_email text,
  student_phone text,
  experience_level text not null,
  note text,
  payment_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.korero_notification_log (
  id uuid primary key default gen_random_uuid(),
  kind text not null,
  payload jsonb,
  to_phone text,
  body text,
  created_at timestamptz not null default now()
);

comment on table public.korero_followups is 'Student post-payment experience survey rows; written by server actions.';
comment on table public.korero_notification_log is 'WhatsApp / admin notification audit trail.';

create index if not exists korero_followups_created_at on public.korero_followups (created_at desc);
create index if not exists korero_notification_log_created_at on public.korero_notification_log (created_at desc);

alter table public.korero_followups enable row level security;
alter table public.korero_notification_log enable row level security;
