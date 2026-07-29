begin;

select plan(12);

select is(
  (
    select count(*)::integer
    from pg_proc procedure
    join pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'apply_split_template',
        'apply_imported_split',
        'assert_base_schedule_has_no_three_rest_days',
        'assert_week_schedule_has_no_three_rest_days',
        'reorder_personal_split_days'
      )
  ),
  5,
  'all five repaired RPC functions exist'
);

select ok(
  position(
    'array[]::public.weekday[]'
    in pg_get_functiondef(
      'public.apply_imported_split(jsonb)'::regprocedure
    )
  ) > 0,
  'apply_imported_split uses an explicitly typed empty weekday array'
);

select ok(
  position(
    'imported_weekdays public.weekday[] := ''{}'''
    in pg_get_functiondef(
      'public.apply_imported_split(jsonb)'::regprocedure
    )
  ) = 0,
  'apply_imported_split no longer assigns text to weekday[]'
);

select ok(
  position(
    'fri uuid'
    in pg_get_functiondef(
      'public.apply_split_template(text)'::regprocedure
    )
  ) = 0,
  'apply_split_template no longer declares an unused Friday UUID'
);

select ok(
  position(
    'perform public.set_personal_day'
    in pg_get_functiondef(
      'public.apply_split_template(text)'::regprocedure
    )
  ) > 0,
  'apply_split_template still executes Friday setup calls'
);

select ok(
  position(
    'window_start integer'
    in pg_get_functiondef(
      'public.assert_base_schedule_has_no_three_rest_days(uuid,uuid,uuid,public.workout_type)'::regprocedure
    )
  ) = 0,
  'base schedule validator has no shadowed window_start declaration'
);

select ok(
  position(
    'window_step integer'
    in pg_get_functiondef(
      'public.assert_base_schedule_has_no_three_rest_days(uuid,uuid,uuid,public.workout_type)'::regprocedure
    )
  ) = 0,
  'base schedule validator has no shadowed window_step declaration'
);

select ok(
  position(
    'scan_start := changed_date - 2 + scan_offset'
    in pg_get_functiondef(
      'public.assert_week_schedule_has_no_three_rest_days(uuid,date,public.workout_type)'::regprocedure
    )
  ) > 0,
  'week schedule validator scans the three candidate windows explicitly'
);

select ok(
  position(
    'window_step integer'
    in pg_get_functiondef(
      'public.assert_week_schedule_has_no_three_rest_days(uuid,date,public.workout_type)'::regprocedure
    )
  ) = 0,
  'week schedule validator has no shadowed step declaration'
);

select ok(
  position(
    'index_value integer'
    in pg_get_functiondef(
      'public.reorder_personal_split_days(uuid[])'::regprocedure
    )
  ) = 0,
  'personal split reorder has no shadowed index declaration'
);

select is(
  (
    select count(*)::integer
    from pg_proc procedure
    join pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'apply_split_template',
        'apply_imported_split',
        'assert_base_schedule_has_no_three_rest_days',
        'assert_week_schedule_has_no_three_rest_days',
        'reorder_personal_split_days'
      )
      and procedure.prosecdef
  ),
  5,
  'all repaired functions remain SECURITY DEFINER'
);

select is(
  (
    select count(*)::integer
    from pg_proc procedure
    join pg_namespace namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'apply_split_template',
        'apply_imported_split',
        'assert_base_schedule_has_no_three_rest_days',
        'assert_week_schedule_has_no_three_rest_days',
        'reorder_personal_split_days'
      )
      and procedure.proconfig @> array['search_path=public']
  ),
  5,
  'all repaired functions keep search_path fixed to public'
);

select * from finish();
rollback;
