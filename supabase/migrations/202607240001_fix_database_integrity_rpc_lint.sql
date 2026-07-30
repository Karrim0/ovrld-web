-- Gym Crew — Phase 2 database integrity and RPC lint repair
-- Body-only replacements: no tables, rows, policies, or function signatures change.
--
-- Repairs:
--   1. Explicit weekday[] initialization in apply_imported_split.
--   2. Removes the unused Friday UUID assignment from apply_split_template.
--   3. Removes PL/pgSQL loop-variable shadowing in schedule validators.
--   4. Removes loop-variable shadowing in reorder_personal_split_days.

CREATE OR REPLACE FUNCTION "public"."apply_split_template"("target_template_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
  sat uuid; sun uuid; mon uuid; tue uuid; wed uuid; thu uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select group_id into current_group_id from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;
  if target_template_key not in ('manual', 'full_body_3', 'upper_lower_4', 'ppl_ul_5', 'ppl_6') then
    raise exception 'Unknown starter plan';
  end if;

  perform public.ensure_personal_split();
  delete from public.split_exercises exercise
  using public.split_days day
  where exercise.split_day_id = day.id and day.owner_user_id = current_user_id;

  if target_template_key = 'manual' then
    sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'custom', 'Saturday training', 'Custom', 'dumbbell', 'indigo');
    sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'custom', 'Sunday training', 'Custom', 'dumbbell', 'blue');
    mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'custom', 'Monday training', 'Custom', 'dumbbell', 'emerald');
    tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'custom', 'Tuesday training', 'Custom', 'dumbbell', 'amber');
    wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'custom', 'Wednesday training', 'Custom', 'dumbbell', 'violet');
    thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'custom', 'Thursday training', 'Custom', 'dumbbell', 'rose');
    perform public.set_personal_day(current_user_id, current_group_id, 'friday', 'custom', 'Friday training', 'Custom', 'dumbbell', 'indigo');
  elsif target_template_key = 'full_body_3' then
    sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'custom', 'Full body A', 'Full body', 'activity', 'indigo');
    sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'custom', 'Full body B', 'Full body', 'activity', 'violet');
    tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'custom', 'Full body C', 'Full body', 'activity', 'emerald');
    thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    perform public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');

    perform public.add_template_exercise(sat, 'Back Squat', 0, 2, 6, 10);
    perform public.add_template_exercise(sat, 'Bench Press', 1, 2, 6, 10);
    perform public.add_template_exercise(sat, 'Lat Pulldown', 2, 2, 8, 12);
    perform public.add_template_exercise(sat, 'Romanian Deadlift', 3, 2, 8, 12);
    perform public.add_template_exercise(mon, 'Leg Press', 0, 2, 8, 12);
    perform public.add_template_exercise(mon, 'Overhead Press', 1, 2, 6, 10);
    perform public.add_template_exercise(mon, 'Seated Cable Row', 2, 2, 8, 12);
    perform public.add_template_exercise(mon, 'Leg Curl', 3, 2, 10, 15);
    perform public.add_template_exercise(wed, 'Back Squat', 0, 2, 8, 12);
    perform public.add_template_exercise(wed, 'Incline Dumbbell Press', 1, 2, 8, 12);
    perform public.add_template_exercise(wed, 'Barbell Row', 2, 2, 6, 10);
    perform public.add_template_exercise(wed, 'Standing Calf Raise', 3, 2, 10, 20);
  elsif target_template_key = 'upper_lower_4' then
    sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'custom', 'Upper A', 'Upper body', 'dumbbell', 'indigo');
    sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'custom', 'Lower A', 'Lower body', 'activity', 'emerald');
    mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'custom', 'Upper B', 'Upper body', 'dumbbell', 'violet');
    wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'custom', 'Lower B', 'Lower body', 'activity', 'amber');
    thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    perform public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');

    perform public.add_template_exercise(sat, 'Bench Press', 0, 2, 6, 10);
    perform public.add_template_exercise(sat, 'Barbell Row', 1, 2, 6, 10);
    perform public.add_template_exercise(sat, 'Overhead Press', 2, 2, 8, 12);
    perform public.add_template_exercise(sat, 'Lat Pulldown', 3, 2, 8, 12);
    perform public.add_template_exercise(sun, 'Back Squat', 0, 2, 6, 10);
    perform public.add_template_exercise(sun, 'Romanian Deadlift', 1, 2, 8, 12);
    perform public.add_template_exercise(sun, 'Leg Extension', 2, 2, 10, 15);
    perform public.add_template_exercise(tue, 'Incline Dumbbell Press', 0, 2, 8, 12);
    perform public.add_template_exercise(tue, 'Seated Cable Row', 1, 2, 8, 12);
    perform public.add_template_exercise(tue, 'Lateral Raise', 2, 2, 12, 20);
    perform public.add_template_exercise(tue, 'Hammer Curl', 3, 2, 10, 15);
    perform public.add_template_exercise(wed, 'Leg Press', 0, 2, 8, 12);
    perform public.add_template_exercise(wed, 'Leg Curl', 1, 2, 10, 15);
    perform public.add_template_exercise(wed, 'Standing Calf Raise', 2, 2, 10, 20);
  elsif target_template_key = 'ppl_ul_5' then
    sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'push', 'Push', 'Chest, shoulders & triceps', 'zap', 'indigo');
    sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'pull', 'Pull', 'Back & biceps', 'target', 'blue');
    mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'legs', 'Legs', 'Lower body', 'activity', 'emerald');
    tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'custom', 'Upper', 'Upper body', 'dumbbell', 'violet');
    thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'custom', 'Lower', 'Lower body', 'activity', 'amber');
    perform public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    perform public.seed_group_split(current_group_id);
    -- Copy the standard P/P/L movements from the shared split into matching personal days.
    insert into public.split_exercises (split_day_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, is_personal_addition)
    select personal.id, shared_ex.exercise_id, shared_ex.position, shared_ex.target_sets, shared_ex.target_reps_min, shared_ex.target_reps_max, false
    from public.split_days shared
    join public.split_exercises shared_ex on shared_ex.split_day_id = shared.id
    join public.split_days personal on personal.group_id = shared.group_id and personal.owner_user_id = current_user_id and personal.workout_type = shared.workout_type
    where shared.group_id = current_group_id and shared.owner_user_id is null and shared.workout_type in ('push','pull','legs')
    on conflict (split_day_id, exercise_id) do nothing;
    perform public.add_template_exercise(wed, 'Bench Press', 0, 2, 6, 10);
    perform public.add_template_exercise(wed, 'Seated Cable Row', 1, 2, 8, 12);
    perform public.add_template_exercise(wed, 'Overhead Press', 2, 2, 8, 12);
    perform public.add_template_exercise(thu, 'Back Squat', 0, 2, 6, 10);
    perform public.add_template_exercise(thu, 'Romanian Deadlift', 1, 2, 8, 12);
    perform public.add_template_exercise(thu, 'Leg Press', 2, 2, 10, 15);
  else
    sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'push', 'Push A', 'Chest, shoulders & triceps', 'zap', 'indigo');
    sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'pull', 'Pull A', 'Back & biceps', 'target', 'blue');
    mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'legs', 'Legs A', 'Lower body', 'activity', 'emerald');
    tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'push', 'Push B', 'Chest, shoulders & triceps', 'zap', 'violet');
    wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'pull', 'Pull B', 'Back & biceps', 'target', 'amber');
    thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'legs', 'Legs B', 'Lower body', 'activity', 'rose');
    perform public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    perform public.seed_group_split(current_group_id);
    insert into public.split_exercises (split_day_id, exercise_id, position, target_sets, target_reps_min, target_reps_max, is_personal_addition)
    select personal.id, shared_ex.exercise_id, shared_ex.position, shared_ex.target_sets, shared_ex.target_reps_min, shared_ex.target_reps_max, false
    from public.split_days shared
    join public.split_exercises shared_ex on shared_ex.split_day_id = shared.id
    join public.split_days personal on personal.group_id = shared.group_id and personal.owner_user_id = current_user_id and personal.workout_type = shared.workout_type
    where shared.group_id = current_group_id and shared.owner_user_id is null and shared.workout_type in ('push','pull','legs')
    on conflict (split_day_id, exercise_id) do nothing;
  end if;

  delete from public.weekly_schedule_days where user_id = current_user_id and schedule_date >= public.training_week_start(current_date);
  update public.profiles
  set split_setup_method = case when target_template_key = 'manual' then 'manual' else 'starter' end,
      split_setup_completed_at = timezone('utc', now())
  where id = current_user_id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."apply_imported_split"("target_plan" "jsonb") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
  day_json jsonb;
  exercise_json jsonb;
  target_day public.split_days;
  target_exercise_id uuid;
  target_weekday public.weekday;
  target_workout_type public.workout_type;
  position_index integer;
  imported_weekdays public.weekday[] := array[]::public.weekday[];
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select group_id into current_group_id from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;
  if jsonb_typeof(target_plan->'days') <> 'array' then raise exception 'Imported plan must contain days'; end if;

  perform public.ensure_personal_split();
  delete from public.split_exercises exercise
  using public.split_days day
  where exercise.split_day_id = day.id and day.owner_user_id = current_user_id;

  -- Start from recovery days; imported days then replace them.
  update public.split_days
  set workout_type = 'rest', display_name = 'Recovery', focus_label = 'Recovery', icon_key = 'moon', color_key = 'blue', day_notes = ''
  where group_id = current_group_id and owner_user_id = current_user_id;

  for day_json in select * from jsonb_array_elements(target_plan->'days') loop
    target_weekday := (day_json->>'weekday')::public.weekday;
    if target_weekday = any(imported_weekdays) then raise exception 'A weekday appears more than once'; end if;
    imported_weekdays := array_append(imported_weekdays, target_weekday);
    target_workout_type := coalesce((day_json->>'workoutType')::public.workout_type, 'custom');

    update public.split_days
    set workout_type = target_workout_type,
        display_name = left(coalesce(nullif(trim(day_json->>'title'), ''), initcap(target_workout_type::text) || ' day'), 40),
        focus_label = left(coalesce(nullif(trim(day_json->>'focus'), ''), initcap(target_workout_type::text)), 32),
        icon_key = case when day_json->>'iconKey' in ('dumbbell','zap','target','flame','shield','heart','moon','activity') then day_json->>'iconKey' else case when target_workout_type = 'rest' then 'moon' else 'dumbbell' end end,
        color_key = case when day_json->>'colorKey' in ('indigo','blue','emerald','amber','rose','violet') then day_json->>'colorKey' else 'indigo' end,
        day_notes = left(coalesce(day_json->>'notes', ''), 240)
    where group_id = current_group_id and owner_user_id = current_user_id and weekday = target_weekday
    returning * into target_day;

    if target_workout_type <> 'rest' and jsonb_typeof(day_json->'exercises') = 'array' then
      position_index := 0;
      for exercise_json in select * from jsonb_array_elements(day_json->'exercises') loop
        select id into target_exercise_id
        from public.exercises
        where (created_by is null or created_by = current_user_id)
          and lower(name) = lower(trim(exercise_json->>'name'))
        order by created_by nulls first
        limit 1;

        if target_exercise_id is null then
          insert into public.exercises (
            name, primary_muscle, secondary_muscles, workout_type, is_custom, created_by
          ) values (
            left(trim(exercise_json->>'name'), 100),
            coalesce((exercise_json->>'primaryMuscle')::public.muscle_group, 'core'),
            '{}', 'custom', true, current_user_id
          ) returning id into target_exercise_id;
        end if;

        insert into public.split_exercises (
          split_day_id, exercise_id, position, target_sets,
          target_reps_min, target_reps_max, is_personal_addition
        ) values (
          target_day.id,
          target_exercise_id,
          position_index,
          greatest(1, least(20, coalesce((exercise_json->>'sets')::integer, 2))),
          greatest(1, least(100, coalesce((exercise_json->>'repsMin')::integer, 8))),
          greatest(
            greatest(1, least(100, coalesce((exercise_json->>'repsMin')::integer, 8))),
            least(100, coalesce((exercise_json->>'repsMax')::integer, coalesce((exercise_json->>'repsMin')::integer, 12)))
          ),
          true
        ) on conflict (split_day_id, exercise_id) do nothing;
        position_index := position_index + 1;
      end loop;
    end if;
  end loop;

  -- Validate the complete repeating week after import.
  perform public.assert_base_schedule_has_no_three_rest_days(
    current_group_id,
    current_user_id,
    (select id from public.split_days where group_id = current_group_id and owner_user_id = current_user_id limit 1),
    (select workout_type from public.split_days where group_id = current_group_id and owner_user_id = current_user_id limit 1)
  );

  delete from public.weekly_schedule_days where user_id = current_user_id and schedule_date >= public.training_week_start(current_date);
  update public.profiles
  set split_setup_method = 'imported', split_setup_completed_at = timezone('utc', now())
  where id = current_user_id;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  checked_weekday public.weekday;
  checked_type public.workout_type;
  rest_count integer;
begin
  for scan_start in 0..6 loop
    rest_count := 0;
    for scan_step in 0..2 loop
      checked_weekday := public.weekday_from_index(scan_start + scan_step);
      select case when day.id = changed_split_day_id then changed_workout_type else day.workout_type end
      into checked_type
      from public.split_days day
      where day.group_id = target_group_id
        and day.owner_user_id is not distinct from target_owner_user_id
        and day.weekday = checked_weekday;

      if checked_type = 'rest' then
        rest_count := rest_count + 1;
      end if;
    end loop;

    if rest_count = 3 then
      raise exception 'Your plan cannot contain more than two consecutive rest days';
    end if;
  end loop;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  scan_start date;
  checked_type public.workout_type;
  rest_count integer;
begin
  for scan_offset in 0..2 loop
    scan_start := changed_date - 2 + scan_offset;
    rest_count := 0;
    for scan_step in 0..2 loop
      select case
        when weekly.schedule_date = changed_date then changed_workout_type
        else weekly.workout_type
      end
      into checked_type
      from public.weekly_schedule_days weekly
      where weekly.user_id = target_user_id
        and weekly.schedule_date = scan_start + scan_step;

      if checked_type = 'rest' then rest_count := rest_count + 1; end if;
    end loop;

    if rest_count = 3 then
      raise exception 'Your plan cannot contain more than two consecutive rest days';
    end if;
  end loop;
end;
$$;

CREATE OR REPLACE FUNCTION "public"."reorder_personal_split_days"("target_ordered_day_ids" "uuid"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  ordered_weekdays public.weekday[] := array[
    'saturday'::public.weekday,
    'sunday'::public.weekday,
    'monday'::public.weekday,
    'tuesday'::public.weekday,
    'wednesday'::public.weekday,
    'thursday'::public.weekday,
    'friday'::public.weekday
  ];
  snapshots jsonb;
  source_snapshot jsonb;
  target_day_id uuid;
  unique_count integer;
  owned_count integer;
  week_start date;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  if coalesce(array_length(target_ordered_day_ids, 1), 0) <> 7 then
    raise exception 'Exactly seven personal split days are required';
  end if;

  select count(distinct value)
  into unique_count
  from unnest(target_ordered_day_ids) as value;

  select count(*)
  into owned_count
  from public.split_days
  where owner_user_id = current_user_id
    and id = any(target_ordered_day_ids);

  if unique_count <> 7 or owned_count <> 7 then
    raise exception 'The requested split order is invalid';
  end if;

  if not exists (
    select 1
    from public.split_days
    where owner_user_id = current_user_id
      and id = target_ordered_day_ids[7]
      and workout_type = 'rest'::public.workout_type
  ) then
    raise exception 'Friday must remain a rest day';
  end if;

  select jsonb_object_agg(
    day.id::text,
    jsonb_build_object(
      'workout_type', day.workout_type,
      'display_name', day.display_name,
      'focus_label', day.focus_label,
      'icon_key', day.icon_key,
      'color_key', day.color_key,
      'day_notes', day.day_notes,
      'exercises', coalesce((
        select jsonb_agg(
          jsonb_build_object(
            'exercise_id', split_exercise.exercise_id,
            'position', split_exercise.position,
            'target_sets', split_exercise.target_sets,
            'target_reps_min', split_exercise.target_reps_min,
            'target_reps_max', split_exercise.target_reps_max,
            'is_personal_addition', split_exercise.is_personal_addition
          )
          order by split_exercise.position
        )
        from public.split_exercises split_exercise
        where split_exercise.split_day_id = day.id
      ), '[]'::jsonb)
    )
  )
  into snapshots
  from public.split_days day
  where day.owner_user_id = current_user_id;

  for position_index in 1..7 loop
    source_snapshot := snapshots -> target_ordered_day_ids[position_index]::text;

    select id
    into target_day_id
    from public.split_days
    where owner_user_id = current_user_id
      and weekday = ordered_weekdays[position_index]
    limit 1;

    update public.split_days
    set workout_type = (source_snapshot ->> 'workout_type')::public.workout_type,
        display_name = source_snapshot ->> 'display_name',
        focus_label = source_snapshot ->> 'focus_label',
        icon_key = coalesce(source_snapshot ->> 'icon_key', 'dumbbell'),
        color_key = coalesce(source_snapshot ->> 'color_key', 'indigo'),
        day_notes = coalesce(source_snapshot ->> 'day_notes', ''),
        updated_at = now()
    where id = target_day_id;

    delete from public.split_exercises
    where split_day_id = target_day_id;

    insert into public.split_exercises (
      split_day_id,
      exercise_id,
      position,
      target_sets,
      target_reps_min,
      target_reps_max,
      is_personal_addition
    )
    select target_day_id,
           (exercise_item ->> 'exercise_id')::uuid,
           (exercise_item ->> 'position')::integer,
           (exercise_item ->> 'target_sets')::integer,
           (exercise_item ->> 'target_reps_min')::integer,
           (exercise_item ->> 'target_reps_max')::integer,
           (exercise_item ->> 'is_personal_addition')::boolean
    from jsonb_array_elements(source_snapshot -> 'exercises') as exercise_item;
  end loop;

  week_start := current_date - ((extract(dow from current_date)::integer + 1) % 7);
  delete from public.weekly_schedule_days
  where user_id = current_user_id
    and schedule_date >= week_start;

  perform public.ensure_week_schedule(current_date);
end;
$$;

notify pgrst, 'reload schema';
