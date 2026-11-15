-- Row Level Security checks for the pf_ tables (two users + anonymous).
-- Run with: supabase/tests/run-rls-tests.sh
-- CI expects exactly 20 ERROR lines (the "expect error" steps below).
\set A 'aaaaaaaa-0000-0000-0000-000000000001'
\set B 'bbbbbbbb-0000-0000-0000-000000000002'
\echo '1. User A creates an unpublished portfolio (user_id filled automatically)'
set role authenticated; select set_config('request.jwt.claim.sub', :'A', false);
insert into public.pf_profiles (content) values ('{"name": "User A"}');
select count(*) as a_sees_own from public.pf_profiles;
\echo '2. User B cannot see, change or delete A''s unpublished portfolio'
select set_config('request.jwt.claim.sub', :'B', false);
select count(*) as b_sees_unpublished from public.pf_profiles;
with u as (update public.pf_profiles set content = '{"name": "hacked"}' returning 1) select count(*) as b_updated from u;
with d as (delete from public.pf_profiles returning 1) select count(*) as b_deleted from d;
\echo '3. Anonymous visitors cannot see unpublished portfolios'
reset role; set role anon;
select count(*) as anon_sees_unpublished from public.pf_profiles;
\echo '4. A publishes at /p/user-a; visitors and B can read it, but B still cannot change it'
reset role; set role authenticated; select set_config('request.jwt.claim.sub', :'A', false);
update public.pf_profiles set slug = 'user-a', published = true;
reset role; set role anon;
select count(*) as anon_sees_published from public.pf_profiles where slug = 'user-a';
select content->>'name' as anon_reads_name from public.pf_profiles where slug = 'user-a';
reset role; set role authenticated; select set_config('request.jwt.claim.sub', :'B', false);
select count(*) as b_sees_published from public.pf_profiles;
with u as (update public.pf_profiles set content = '{"name": "hacked"}' returning 1) select count(*) as b_updated_published from u;
\set ON_ERROR_STOP 0
\echo '5. B cannot create a portfolio owned by A (expect error)'
insert into public.pf_profiles (user_id, content) values (:'A', '{}');
\echo '6. B cannot hand their own row over to A (expect error)'
insert into public.pf_profiles (content) values ('{"name": "User B"}');
update public.pf_profiles set user_id = :'A' where user_id = :'B';
\echo '7. Invalid content is rejected (expect error)'
update public.pf_profiles set content = '[1, 2, 3]' where user_id = :'B';
\echo '8. B cannot take A''s address, use a bad address, or publish without one (expect 4 errors)'
update public.pf_profiles set slug = 'user-a' where user_id = :'B';
update public.pf_profiles set slug = 'Bad Address!' where user_id = :'B';
update public.pf_profiles set slug = 'a--b' where user_id = :'B';
update public.pf_profiles set published = true where user_id = :'B';
\echo '9. Visitors cannot write or see who owns a portfolio (expect permission denied, 3 times)'
reset role; set role anon;
insert into public.pf_profiles (content) values ('{}');
update public.pf_profiles set content = '{}';
select user_id from public.pf_profiles;
\echo '10. Final state as superuser: A''s published row is untouched, B has their own'
reset role; select user_id = :'A' as is_a, slug, published, content->>'name' as name from public.pf_profiles order by created_at;

-- ---------------------------------------------------------------------------
-- Résumé upload history (pf_resume_uploads + pf-resumes bucket)
-- ---------------------------------------------------------------------------
\set U1 '11111111-1111-4111-8111-111111111111'
\set U2 '22222222-2222-4222-8222-222222222222'
\set U3 '33333333-3333-4333-8333-333333333333'
\echo '11. A visitor without an account records an upload, with phone number and claim token'
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select set_config('request.headers', '{"x-forwarded-for": "203.0.113.7, 10.0.0.1"}', false);
insert into public.pf_resume_uploads (id, source, consent_at, file_name, file_type, file_size, file_path, name, email, phone, parsed, raw_text, claim_token_hash)
values (:'U1', 'file', now(), 'cv.pdf', 'application/pdf', 1234, 'uploads/11111111-1111-4111-8111-111111111111.pdf', 'Visitor One', 'v@example.com', '+254 700 000 000', '{"name": "Visitor One"}', 'raw text',
        encode(sha256(convert_to('secret-token', 'UTF8')), 'hex'));
\echo '12. ...and uploads the file into its slot, but cannot read uploads or files (expect 3 errors)'
insert into storage.objects (bucket_id, name) values ('pf-resumes', 'uploads/11111111-1111-4111-8111-111111111111.pdf');
select count(*) from public.pf_resume_uploads;
select phone from public.pf_resume_uploads;
update public.pf_resume_uploads set phone = 'x';
select count(*) as anon_reads_files from storage.objects;
\echo '13. Files cannot go anywhere without a fresh record (expect 2 errors)'
insert into storage.objects (bucket_id, name) values ('pf-resumes', 'uploads/99999999-9999-4999-8999-999999999999.pdf');
insert into storage.objects (bucket_id, name) values ('pf-resumes', 'uploads/11111111-1111-4111-8111-111111111111.pdf');
\echo '14. Uploads need consent and valid values (expect 3 errors)'
insert into public.pf_resume_uploads (id, source, consent_at, parsed) values (:'U2', 'paste', now() - interval '3 days', '{}');
insert into public.pf_resume_uploads (id, source, consent_at, parsed) values (:'U2', 'file', now(), '{}');
insert into public.pf_resume_uploads (id, source, consent_at, parsed, user_id) values (:'U2', 'paste', now(), '{}', :'A');
\echo '15. A signed-in user cannot read history either, even their own (expect 1 error)'
reset role; set role authenticated; select set_config('request.jwt.claim.sub', :'B', false);
insert into public.pf_resume_uploads (id, source, consent_at, parsed, raw_text) values (:'U2', 'paste', now(), '{"name": "User B"}', 'pasted');
select count(*) from public.pf_resume_uploads;
\echo '16. Claiming: wrong token fails, right token links the anonymous upload to B'
select public.pf_claim_resume_upload(:'U1', 'wrong-token') as claim_wrong;
select public.pf_claim_resume_upload(:'U1', 'secret-token') as claim_right;
select public.pf_claim_resume_upload(:'U1', 'secret-token') as claim_again;
\echo '17. Rate limit: the 11th upload in an hour from one address is refused (expect 1 error)'
reset role; set role anon; select set_config('request.jwt.claim.sub', '', false);
select set_config('request.headers', '{"x-forwarded-for": "198.51.100.9"}', false);
insert into public.pf_resume_uploads (id, source, consent_at, parsed)
  select gen_random_uuid(), 'paste', now(), '{}' from generate_series(1, 10);
insert into public.pf_resume_uploads (id, source, consent_at, parsed) values (:'U3', 'paste', now(), '{}');
\echo '17b. A record from a pasted LinkedIn link (no file) is accepted'
select set_config('request.headers', '{"x-forwarded-for": "198.51.100.77"}', false);
insert into public.pf_resume_uploads (id, source, consent_at, parsed, raw_text) values (gen_random_uuid(), 'link', now(), '{"name": "Link Person"}', 'https://www.linkedin.com/in/link-person');
reset role; select count(*) as link_records from public.pf_resume_uploads where source = 'link'; set role anon;
\echo '18. History as the site owner sees it (superuser)'
reset role;
select name, phone, source, user_id = :'B' as linked_to_b, ip_hash is not null as has_ip_hash, ip_hash <> '203.0.113.7' as ip_not_stored, claim_token_hash is null as token_cleared
  from public.pf_resume_uploads where id in (:'U1', :'U2') order by created_at;
select count(*) as files_stored from storage.objects where bucket_id = 'pf-resumes';
\echo '19. Deleting an account keeps its upload history'
delete from auth.users where id = :'B';
select count(*) as uploads_kept, count(user_id) as still_linked from public.pf_resume_uploads where id in (:'U1', :'U2');
