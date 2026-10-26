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

-- ============================================================================
-- 9. Admin panel support: blocked flag, rich applications, services table
--    (same statements as supabase/admin-and-services.sql)
-- ============================================================================
alter table public.profiles add column if not exists blocked boolean not null default false;
alter table public.applications add column if not exists form_data jsonb;
alter table public.applications add column if not exists admin_note text;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

drop trigger if exists applications_touch on public.applications;
create trigger applications_touch before update on public.applications
for each row execute function public.touch_updated_at();

create table if not exists public.services (
  id text primary key, name text not null, sector text, office text, fee text,
  days text, recipient text, "desc" text, docs jsonb default '[]'::jsonb,
  form text, popular boolean default false, active boolean default true,
  sort int default 100, created_at timestamptz default now()
);
alter table public.services enable row level security;
drop policy if exists "services public read" on public.services;
create policy "services public read" on public.services for select using (true);
-- 3. Seed the service catalogue (matches assets/js/services-data.js) --------
insert into public.services (id, name, sector, office, fee, days, recipient, popular, form, "desc", docs, sort)
values
  ('srv-1','বিদেশগামী শিক্ষার্থীদের সার্টিফিকেট সত্যায়ন','sec-65','পররাষ্ট্র মন্ত্রণালয়','৳ ৫০০','৭ কার্যদিবস','citizen',true,null,
   'বিদেশে উচ্চশিক্ষা বা চাকরির জন্য শিক্ষাগত সনদ ও অন্যান্য কাগজপত্রের সত্যায়ন (অ্যাপোস্টিল)।',
   '["জাতীয় পরিচয়পত্র (NID)","মূল সনদ ও গ্রেডশিট","পাসপোর্ট কপি","পাসপোর্ট সাইজ ছবি"]'::jsonb, 1),
  ('srv-2','জন্ম নিবন্ধন সনদের জন্য আবেদন','sec-3','স্থানীয় সরকার বিভাগ','বিনামূল্যে','১৫ কার্যদিবস','citizen',true,null,
   'নবজাতক ও প্রাপ্তবয়স্কদের জন্ম নিবন্ধন সনদ ইস্যু ও সংশোধনের আবেদন।',
   '["টিকাদান কার্ড / হাসপাতালের প্রত্যয়ন","পিতা-মাতার NID","বাসিন্দা প্রমাণ"]'::jsonb, 2),
  ('srv-3','ট্রেড লাইসেন্স (নতুন / নবায়ন)','sec-7','সিটি কর্পোরেশন / পৌরসভা','৳ ১,০০০ – ৫,০০০','১০ কার্যদিবস','business',true,null,
   'ব্যবসা প্রতিষ্ঠান পরিচালনার জন্য ট্রেড লাইসেন্স ইস্যু ও বার্ষিক নবায়ন।',
   '["জাতীয় পরিচয়পত্র","ভাড়ার চুক্তি / মালিকানা দলিল","হোল্ডিং ট্যাক্স রশিদ","ছবি"]'::jsonb, 3),
  ('srv-4','টিন সার্টিফিকেট (e-TIN) নিবন্ধন','sec-9','জাতীয় রাজস্ব বোর্ড (NBR)','বিনামূল্যে','১ কার্যদিবস','business',true,null,
   'আয়কর প্রদান ও ব্যবসায়িক লেনদেনের জন্য ট্যাক্সপেয়ার আইডেন্টিফিকেশন নম্বর।',
   '["জাতীয় পরিচয়পত্র","মোবাইল নম্বর","ঠিকানা প্রমাণ"]'::jsonb, 4),
  ('srv-5','বয়স্ক ভাতার আবেদন','sec-4','সমাজসেবা অধিদপ্তর','বিনামূল্যে','৩০ কার্যদিবস','citizen',true,null,
   '৬৫ বছর বা তদূর্ধ্ব নাগরিকদের মাসিক বয়স্ক ভাতা কর্মসূচিতে অন্তর্ভুক্তি।',
   '["জাতীয় পরিচয়পত্র","জন্ম নিবন্ধন / বয়স প্রমাণ","ভোটার এলাকা প্রমাণ"]'::jsonb, 5),
  ('srv-6','জমির নামজারি (মিউটেশন)','sec-1','ইউনিয়ন ভূমি অফিস','৳ ১,১০০','২১ কার্যদিবস','citizen',false,null,
   'ক্রয়, উত্তরাধিকার বা হেবা দলিলের পর জমির খতিয়ানে নাম পরিবর্তন।',
   '["মূল দলিল","খাজনা রশিদ","পূর্বতন খতিয়ান","NID","ওয়ারিশ সনদ"]'::jsonb, 6),
  ('srv-7','সাধারণ ডায়েরি (জিডি)','sec-11','বাংলাদেশ পুলিশ','বিনামূল্যে','তাৎক্ষণিক','citizen',true,null,
   'হারানো কাগজপত্র, নিরাপত্তা উদ্বেগ বা অভিযোগের সাধারণ ডায়েরি অনলাইনে।',
   '["জাতীয় পরিচয়পত্র","ঘটনার বিবরণ","সম্পর্কিত কাগজ"]'::jsonb, 7),
  ('srv-8','চারিত্রিক প্রত্যয়ন পত্র','sec-3','ইউনিয়ন পরিষদ / ওয়ার্ড কার্যালয়','৳ ১০০','৩ কার্যদিবস','citizen',false,null,
   'চাকরি, ভিসা ও শিক্ষাপ্রতিষ্ঠানে ভর্তির জন্য চারিত্রিক ও নাগরিকত্ব প্রত্যয়ন।',
   '["জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন","ছবি","বাসিন্দা প্রমাণ"]'::jsonb, 8),
  ('srv-9','বিধবা ও স্বামী নিগৃহীতা মহিলা ভাতা','sec-4','সমাজসেবা অধিদপ্তর','বিনামূল্যে','৩০ কার্যদিবস','citizen',false,null,
   'অসচ্ছল বিধবা ও স্বামী-পরিত্যক্তা মহিলাদের জন্য মাসিক ভাতা।',
   '["জাতীয় পরিচয়পত্র","স্বামীর মৃত্যু নিবন্ধন","বাসিন্দা প্রমাণ"]'::jsonb, 9),
  ('srv-10','নতুন বিদ্যুৎ সংযোগ আবেদন','sec-49','বাংলাদেশ বিদ্যুৎ উন্নয়ন বোর্ড','৳ ২,৫০০ থেকে','২১ কার্যদিবস','citizen',false,null,
   'আবাসিক ও বাণিজ্যিক স্থাপনায় নতুন বিদ্যুৎ সংযোগের অনলাইন আবেদন।',
   '["জাতীয় পরিচয়পত্র","দলিল / ভাড়ার চুক্তি","হোল্ডিং ট্যাক্স","নকশা"]'::jsonb, 10),
  ('srv-11','কৃষি উপকরণ (সার-বীজ) সহায়তা','sec-59','কৃষি সম্প্রসারণ অধিদপ্তর','ভর্তুকি মূল্য','৭ কার্যদিবস','citizen',false,null,
   'কৃষকদের জন্য সরকার নির্ধারিত ভর্তুকি মূল্যে সার, বীজ ও কৃষি উপকরণ কার্ড।',
   '["জাতীয় পরিচয়পত্র","জমির খতিয়ান","মোবাইল নম্বর"]'::jsonb, 11),
  ('srv-12','পাসপোর্ট আবেদন (MRP / e-Passport)','sec-8','ইমিগ্রেশন ও পাসপোর্ট অধিদপ্তর','৳ ৩,৫০০ – ১১,০০০','১৫–৩০ কার্যদিবস','citizen',true,null,
   'সাধারণ ও জরুরি ডেলিভারিতে মেশিন রিডেবল / ই-পাসপোর্টের আবেদন।',
   '["জাতীয় পরিচয়পত্র / জন্ম নিবন্ধন","টিন/নাগরিকত্ব সনদ","ছবি"]'::jsonb, 12),
  ('srv-13','প্রতিবন্ধী শনাক্তকরণ ও ভাতা','sec-4','সমাজসেবা অধিদপ্তর','বিনামূল্যে','৩০ কার্যদিবস','citizen',false,null,
   'প্রতিবন্ধিত্ব শনাক্তকরণ সনদ ও সংশ্লিষ্ট ভাতা কর্মসূচির আবেদন।',
   '["জন্ম নিবন্ধন / NID","মেডিকেল প্রত্যয়ন","ছবি"]'::jsonb, 13),
  ('srv-14','মৃত্যু নিবন্ধন সনদ','sec-3','স্থানীয় সরকার বিভাগ','বিনামূল্যে','১০ কার্যদিবস','citizen',false,null,
   'মৃত ব্যক্তির নিবন্ধন ও সনদ ইস্যুর আবেদন।',
   '["হাসপাতাল/চিকিৎসকের মৃত্যু প্রত্যয়ন","ওয়ারিশদের NID","স্থান প্রমাণ"]'::jsonb, 14),
  ('srv-15','শিক্ষা প্রতিষ্ঠানে ভর্তির আবেদন','sec-16','মাধ্যমিক ও উচ্চশিক্ষা বিভাগ','বিদ্যালয় নির্ধারিত','বিজ্ঞপ্তি অনুযায়ী','citizen',false,null,
   'সরকারি স্কুল-কলেজে ডিজিটাল লটারি ভর্তি প্রক্রিয়ার অনলাইন আবেদন।',
   '["জন্ম নিবন্ধন সনদ","পূর্ববর্তী সনদ","ছবি"]'::jsonb, 15),
  ('srv-16','অস্ত্রের লাইসেন্সের আবেদন','sec-11','স্বরাষ্ট্র মন্ত্রণালয়','৳ ৫,০০০+','৬০ কার্যদিবস','citizen',false,null,
   'আগ্নেয়াস্ত্রের নতুন লাইসেন্স, নবায়ন ও বার্ষিক ফি সংক্রান্ত আবেদন।',
   '["জাতীয় পরিচয়পত্র","পুলিশ ভেরিফিকেশন ফরম","আয়কর সনদ","ছবি"]'::jsonb, 16),
  ('srv-17','নতুন সমবায় সমিতি রেজিস্ট্রেশন','sec-7','সমবায় অধিদপ্তর','৳ ১,০০০','৩০ কার্যদিবস','citizen',true,'samity',
   'নতুন সমবায় সমিতি (কৃষি, মৎস্য, বহুমুখী, আবাসন ইত্যাদি) গঠন ও নিবন্ধনের অনলাইন আবেদন।',
   '["উপচেক/প্রস্তাবিত সদস্যদের তালিকা","সমিতির প্রস্তাবিত উপবিধি","কার্যকরী কমিটির তালিকা","সম্পাদকের জাতীয় পরিচয়পত্র","গঠন সভার কার্যবিবরণী"]'::jsonb, 17),
  ('srv-18','সমবায় সমিতির বার্ষিক রিটার্ন দাখিল','sec-7','সমবায় অধিদপ্তর','৳ ২০০','৭ কার্যদিবস','business',false,'generic',
   'নিবন্ধিত সমবায় সমিতির বার্ষিক হিসাব ও রিটার্ন দাখিল সংক্রান্ত সেবা।',
   '["নিবন্ধন সনদ","বার্ষিক আর্থিক প্রতিবেদন","সাধারণ সভার কার্যবিবরণী"]'::jsonb, 18)
on conflict (id) do nothing;
