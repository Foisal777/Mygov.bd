-- ============================================================================
-- myGov Demo — Supabase schema
-- Run this whole file once in: Supabase Dashboard → SQL Editor → New query
-- Safe to re-run (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (1:1 with auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  full_name     text,
  email         text,
  mobile        text,                       -- display form, e.g. "+88 01712345678"
  mobile_digits text,                       -- normalized, e.g. "8801712345678"
  channel       text check (channel in ('mobile', 'email')) default 'mobile',
  nid           text,
  birth_date    date,
  gender        text,
  division      text,
  district      text,
  address       text,
  photo         text,
  documents     jsonb default '[]'::jsonb,
  is_verified   boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create unique index if not exists profiles_mobile_digits_key
  on public.profiles (mobile_digits) where mobile_digits is not null;
create unique index if not exists profiles_email_key
  on public.profiles (email) where email is not null;

-- ---------------------------------------------------------------------------
-- 2. OTP REQUESTS  (service-role only — no client-facing RLS policies)
-- ---------------------------------------------------------------------------
create table if not exists public.otp_requests (
  id          uuid primary key default gen_random_uuid(),
  channel     text not null check (channel in ('mobile', 'email')),
  target      text not null,
  code_hash   text not null,
  attempts    int  not null default 0,
  consumed    boolean not null default false,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
create index if not exists otp_requests_target_idx
  on public.otp_requests (target, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. APPLICATIONS
-- ---------------------------------------------------------------------------
create table if not exists public.applications (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  tracking_no    text not null unique,
  service_name   text not null,
  service_sector text,
  office         text,
  fee            text,
  status         text not null default 'submitted'
                 check (status in ('submitted', 'processing', 'approved', 'delivered', 'rejected')),
  timeline       jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists applications_user_idx on public.applications (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 4. DEMO TRACKING  (sample data so the tracking page works pre-signup)
-- ---------------------------------------------------------------------------
create table if not exists public.demo_tracking (
  id               uuid primary key default gen_random_uuid(),
  tracking_no      text not null unique,
  service_name     text not null,
  office           text,
  status           text not null,
  applicant_mobile text not null,
  created_at       timestamptz not null default now(),
  timeline         jsonb
);

-- ---------------------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
alter table public.profiles     enable row level security;
alter table public.otp_requests enable row level security;
alter table public.applications enable row level security;
alter table public.demo_tracking enable row level security;

-- profiles: a user can only read / change / insert their own row
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- applications: owner only
drop policy if exists "applications select own" on public.applications;
create policy "applications select own" on public.applications
  for select using (auth.uid() = user_id);

drop policy if exists "applications insert own" on public.applications;
create policy "applications insert own" on public.applications
  for insert with check (auth.uid() = user_id);

-- otp_requests: intentionally NO anon/authenticated policies.
-- Only the service-role key (Netlify Functions) can touch this table.

-- demo_tracking: world-readable sample records
drop policy if exists "demo_tracking read" on public.demo_tracking;
create policy "demo_tracking read" on public.demo_tracking
  for select using (true);

-- ---------------------------------------------------------------------------
-- 6. Auto-create a profile row whenever an auth user is created
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, mobile, mobile_digits, channel)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    case when new.email not like '%@phone.mygov-demo.app' then new.email else null end,
    new.raw_user_meta_data ->> 'mobile',
    null,
    coalesce(new.raw_user_meta_data ->> 'channel', 'mobile')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 7. RPCs callable from the browser with the anon key
-- ---------------------------------------------------------------------------

-- Duplicate check without exposing other people's rows
create or replace function public.identifier_taken(
  p_mobile text default null,
  p_email  text default null
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'mobile', exists (select 1 from public.profiles where mobile_digits = p_mobile),
    'email',  exists (select 1 from public.profiles where lower(email) = lower(p_email))
  );
$$;

-- Public tracking lookup by mobile + tracking number
create or replace function public.track_application(
  p_mobile  text,
  p_tracking text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select to_jsonb(a) into result
  from public.applications a
  join public.profiles p on p.id = a.user_id
  where p.mobile_digits = p_mobile
    and a.tracking_no = p_tracking
  limit 1;

  if result is not null then
    return result;
  end if;

  select to_jsonb(d) into result
  from public.demo_tracking d
  where d.tracking_no = p_tracking
    and d.applicant_mobile = p_mobile
  limit 1;

  return result; -- null when nothing found
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Seed demo tracking records (idempotent)
-- ---------------------------------------------------------------------------
insert into public.demo_tracking (tracking_no, service_name, office, status, applicant_mobile, timeline)
values
  (
    'BD-DEMO-1001',
    'বিদেশগামী নাগরিকদের সার্টিফিকেট সত্যায়ন',
    'পররাষ্ট্র মন্ত্রণালয়',
    'processing',
    '8801700000000',
    '[{"status":"submitted","label":"আবেদন জমা হয়েছে","date":"' || (now() - interval '3 days')::timestamptz || '"},
      {"status":"processing","label":"দপ্তরে প্রক্রিয়াধীন","date":"' || (now() - interval '1 day')::timestamptz || '"},
      {"status":"delivered","label":"সেবা বিতরণ হয়েছে","date":null}]'
  ),
  (
    'BD-DEMO-1002',
    'জন্ম নিবন্ধন সনদ সংশোধন',
    'স্থানীয় সরকার বিভাগ',
    'delivered',
    '8801700000000',
    '[{"status":"submitted","label":"আবেদন জমা হয়েছে","date":"' || (now() - interval '8 days')::timestamptz || '"},
      {"status":"processing","label":"দপ্তরে প্রক্রিয়াধীন","date":"' || (now() - interval '6 days')::timestamptz || '"},
      {"status":"delivered","label":"সেবা বিতরণ হয়েছে","date":"' || (now() - interval '4 days')::timestamptz || '"}]'
  )
on conflict (tracking_no) do nothing;

-- ============================================================================
-- Done. Auth settings tip:
-- For mobile-only sign-ups (synthetic emails) turn OFF
-- Authentication → Sign In/Up → "Confirm email" so those users can log in
-- without clicking an email link.
-- For 6-digit email OTP, edit the "Magic Link" email template and replace
-- {{ .ConfirmationURL }} with the raw token: {{ .Token }}
-- ============================================================================
