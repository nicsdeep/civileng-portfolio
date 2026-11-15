-- CivilEng Portfolio: history of every uploaded résumé
--
-- Each upload (file or pasted text) is recorded the moment it is read, with
-- or without an account, after the visitor has agreed to it on the Create
-- page. The record keeps the contact details (including the phone number),
-- everything read from the résumé, the extracted text, and the original file
-- in the private "pf-resumes" storage bucket.
--
-- Who can see it:
--   * Nobody through the app. Visitors and signed-in users can only ADD
--     records; they cannot read, change or delete any, not even their own.
--   * The site owner reads them in the Supabase dashboard (Table editor →
--     pf_resume_uploads, Storage → pf-resumes).
--   * Records stay when a portfolio or account is deleted (user_id becomes
--     null). Delete requests are handled by hand (see /privacy).
--
-- Abuse protection, since anyone can add records:
--   * at most 10 uploads per hour from one network address and 300 per hour
--     in total; the address is stored only as a salted hash;
--   * size limits on every column; files only as PDF, Word (.docx) or text,
--     up to 10 MB, and only into a slot opened by a matching record in the
--     last 10 minutes (one file per record, no overwriting).
--
-- Creates objects only; drops nothing.

create table public.pf_resume_uploads (
  id                uuid primary key,  -- chosen by the browser, so it can name the file before uploading it
  created_at        timestamptz not null default now(),
  user_id           uuid default auth.uid() references auth.users (id) on delete set null,
  source            text not null check (source in ('file', 'paste')),
  consent_at        timestamptz not null,
  file_name         text check (char_length(file_name) <= 255),
  file_type         text check (file_type in ('application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain')),
  file_size         integer check (file_size between 1 and 10485760),
  file_path         text unique check (file_path ~ '^uploads/[0-9a-f-]{36}\.(pdf|docx|txt)$'),
  name              text check (char_length(name) <= 300),
  email             text check (char_length(email) <= 300),
  phone             text check (char_length(phone) <= 60),
  location          text check (char_length(location) <= 300),
  parsed            jsonb not null check (jsonb_typeof(parsed) = 'object' and pg_column_size(parsed) < 300000),
  raw_text          text check (char_length(raw_text) <= 100000),
  -- Lets the browser that made an anonymous upload attach it to an account after signing in.
  claim_token_hash  text check (claim_token_hash ~ '^[0-9a-f]{64}$'),
  ip_hash           text,
  check (source = 'paste' or file_path is not null)
);
comment on table public.pf_resume_uploads is 'Every résumé uploaded to CivilEng Portfolio, with contact details and the parsed content. Private: read in the Supabase dashboard only.';

create index pf_resume_uploads_created_idx on public.pf_resume_uploads (created_at desc);
create index pf_resume_uploads_ip_idx on public.pf_resume_uploads (ip_hash, created_at);
create index pf_resume_uploads_user_idx on public.pf_resume_uploads (user_id);

-- Stamps the network address (hashed) and enforces the hourly limits.
create or replace function public.pf_resume_uploads_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  forwarded text := (nullif(current_setting('request.headers', true), '')::json ->> 'x-forwarded-for');
  ip text := nullif(btrim(split_part(coalesce(forwarded, ''), ',', 1)), '');
begin
  new.created_at := now();
  new.ip_hash := case when ip is null then null else encode(sha256(convert_to('pf-upload:' || ip, 'UTF8')), 'hex') end;
  -- Only signed-in users can link to an account, and only to their own.
  new.user_id := auth.uid();
  if new.ip_hash is not null and (
    select count(*) from public.pf_resume_uploads
    where ip_hash = new.ip_hash and created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'Too many uploads from this network. Please try again in an hour.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.pf_resume_uploads where created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Uploads are paused for a moment. Please try again later.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger pf_resume_uploads_guard
  before insert on public.pf_resume_uploads
  for each row execute function public.pf_resume_uploads_guard();

-- Attaches an anonymous upload to the signed-in user who holds its claim token.
create or replace function public.pf_claim_resume_upload(upload_id uuid, claim_token text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed integer;
begin
  if auth.uid() is null or claim_token is null or char_length(claim_token) > 200 then
    return false;
  end if;
  update public.pf_resume_uploads
     set user_id = auth.uid(), claim_token_hash = null
   where id = upload_id
     and user_id is null
     and claim_token_hash = encode(sha256(convert_to(claim_token, 'UTF8')), 'hex');
  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

-- Used by the storage policy: is there a fresh record waiting for this file?
create or replace function public.pf_resume_file_slot_open(object_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.pf_resume_uploads
    where file_path = object_name and created_at > now() - interval '10 minutes'
  );
$$;

-- ---------------------------------------------------------------------------
-- Privileges and Row Level Security: add only, never read back
-- ---------------------------------------------------------------------------
revoke all on public.pf_resume_uploads from public, anon, authenticated;
grant insert (id, source, consent_at, file_name, file_type, file_size, file_path, name, email, phone, location, parsed, raw_text, claim_token_hash)
  on public.pf_resume_uploads to anon, authenticated;

revoke execute on function public.pf_resume_uploads_guard() from public, anon, authenticated;
revoke execute on function public.pf_claim_resume_upload(uuid, text) from public, anon;
grant execute on function public.pf_claim_resume_upload(uuid, text) to authenticated;
revoke execute on function public.pf_resume_file_slot_open(text) from public;
grant execute on function public.pf_resume_file_slot_open(text) to anon, authenticated;

alter table public.pf_resume_uploads enable row level security;

create policy "Anyone can record an upload they agreed to"
  on public.pf_resume_uploads for insert to anon, authenticated
  with check (consent_at > now() - interval '1 day' and consent_at <= now() + interval '5 minutes');

-- ---------------------------------------------------------------------------
-- Private bucket for the original files
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'pf-resumes', 'pf-resumes', false, 10485760,
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
on conflict (id) do nothing;

-- Upload only (no reading, replacing or deleting), into a slot opened above.
create policy "Anyone can upload a résumé file into an open slot"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'pf-resumes' and public.pf_resume_file_slot_open(name));
