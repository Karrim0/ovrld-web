begin;

select plan(12);

select is(
  (select count(*)::integer from public.exercises where created_by is null and is_custom = false),
  40,
  'canonical public exercise catalog contains 40 exercises'
);

select is(
  (select count(distinct lower(name))::integer from public.exercises where created_by is null and is_custom = false),
  40,
  'canonical exercise names are unique'
);

select is(
  (select count(*)::integer from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'),
  12,
  'public schema contains 12 app tables'
);

select is(
  (select count(*)::integer
   from pg_type t
   join pg_namespace n on n.oid = t.typnamespace
   where n.nspname = 'public' and t.typtype = 'e'),
  7,
  'public schema contains 7 enums'
);

select is(
  (select count(*)::integer
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'),
  51,
  'public schema contains 51 functions/RPCs'
);

select is(
  (select count(*)::integer from pg_policies where schemaname = 'public'),
  26,
  'public schema contains 26 RLS policies'
);

select is(
  (select count(*)::integer
   from pg_trigger t
   join pg_class c on c.oid = t.tgrelid
   join pg_namespace n on n.oid = c.relnamespace
   where not t.tgisinternal and n.nspname = 'public'),
  26,
  'public tables contain 26 custom triggers'
);

select ok(
  exists (
    select 1
    from pg_trigger t
    join pg_class c on c.oid = t.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal
      and n.nspname = 'auth'
      and c.relname = 'users'
      and t.tgname = 'on_auth_user_created'
      and p.proname = 'handle_new_auth_user'
  ),
  'auth.users profile bootstrap trigger exists'
);

select is(
  (select count(*)::integer from storage.buckets where id = 'avatars' and public = true and file_size_limit = 5242880),
  1,
  'public avatars bucket exists with the expected size limit'
);

select is(
  (select count(*)::integer
   from pg_policies
   where schemaname = 'storage'
     and tablename = 'objects'
     and policyname in (
       'avatars_public_read',
       'avatars_user_insert',
       'avatars_user_update',
       'avatars_user_delete'
     )),
  4,
  'avatars bucket has all four expected policies'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_exercises'
      and column_name = 'target_reps_min'
      and column_default = '8'
  ),
  'workout_exercises.target_reps_min exists'
);

select ok(
  exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'workout_sets'
      and column_name = 'notes'
  ),
  'workout_sets.notes exists'
);

select * from finish();
rollback;
