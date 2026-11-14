-- Row Level Security checks for the pf_ tables (two users + anonymous).
-- Run with: supabase/tests/run-rls-tests.sh
-- CI expects exactly 10 ERROR lines (the "expect error" steps below).
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
