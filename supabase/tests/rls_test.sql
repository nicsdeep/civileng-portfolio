-- Row Level Security checks for the pf_ tables (two users + anonymous).
-- Run with: supabase/tests/run-rls-tests.sh
-- CI expects exactly 5 ERROR lines (the "expect error" steps below).
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
\echo '4. A publishes; anonymous visitors and B can now read it, but B still cannot change it'
reset role; set role authenticated; select set_config('request.jwt.claim.sub', :'A', false);
update public.pf_profiles set published = true;
reset role; set role anon;
select count(*) as anon_sees_published from public.pf_profiles;
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
\echo '8. Anonymous visitors cannot write (expect permission denied, twice)'
reset role; set role anon;
insert into public.pf_profiles (user_id, content) values (:'A', '{}');
update public.pf_profiles set content = '{}';
\echo '9. Final state as superuser: A''s published row is untouched, B has their own'
reset role; select user_id = :'A' as is_a, published, content->>'name' as name from public.pf_profiles order by created_at;
