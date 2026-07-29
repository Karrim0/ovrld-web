


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE TYPE "public"."group_activity_type" AS ENUM (
    'workout_completed',
    'personal_record',
    'joined_group',
    'streak_milestone'
);


ALTER TYPE "public"."group_activity_type" OWNER TO "postgres";


CREATE TYPE "public"."group_role" AS ENUM (
    'owner',
    'admin',
    'member'
);


ALTER TYPE "public"."group_role" OWNER TO "postgres";


CREATE TYPE "public"."muscle_group" AS ENUM (
    'chest',
    'back',
    'shoulders',
    'biceps',
    'triceps',
    'quads',
    'hamstrings',
    'glutes',
    'calves',
    'core'
);


ALTER TYPE "public"."muscle_group" OWNER TO "postgres";


CREATE TYPE "public"."personal_record_type" AS ENUM (
    'max_weight',
    'max_reps',
    'max_volume'
);


ALTER TYPE "public"."personal_record_type" OWNER TO "postgres";


CREATE TYPE "public"."weekday" AS ENUM (
    'saturday',
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday'
);


ALTER TYPE "public"."weekday" OWNER TO "postgres";


CREATE TYPE "public"."workout_session_status" AS ENUM (
    'in_progress',
    'completed',
    'missed',
    'cancelled'
);


ALTER TYPE "public"."workout_session_status" OWNER TO "postgres";


CREATE TYPE "public"."workout_type" AS ENUM (
    'push',
    'pull',
    'legs',
    'rest',
    'custom'
);


ALTER TYPE "public"."workout_type" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."acknowledge_group_split_version"("target_group_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_version integer;
begin
  if not public.is_group_member(target_group_id) then
    raise exception 'Not a member of this group';
  end if;

  select split_version into current_version
  from public.groups
  where id = target_group_id;

  update public.group_members
  set seen_split_version = current_version
  where group_id = target_group_id
    and user_id = auth.uid();

  return current_version;
end;
$$;


ALTER FUNCTION "public"."acknowledge_group_split_version"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_template_exercise"("target_split_day_id" "uuid", "target_exercise_name" "text", "target_position" integer, "target_sets" integer, "target_reps_min" integer, "target_reps_max" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_exercise_id uuid;
begin
  select id into target_exercise_id
  from public.exercises
  where created_by is null and lower(name) = lower(target_exercise_name)
  limit 1;

  if target_exercise_id is not null then
    insert into public.split_exercises (
      split_day_id, exercise_id, position, target_sets,
      target_reps_min, target_reps_max, is_personal_addition
    ) values (
      target_split_day_id, target_exercise_id, target_position, target_sets,
      target_reps_min, target_reps_max, false
    ) on conflict (split_day_id, exercise_id) do nothing;
  end if;
end;
$$;


ALTER FUNCTION "public"."add_template_exercise"("target_split_day_id" "uuid", "target_exercise_name" "text", "target_position" integer, "target_sets" integer, "target_reps_min" integer, "target_reps_max" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_workout_exercise"("target_session_id" "uuid", "target_exercise_id" "uuid", "target_set_count" integer DEFAULT 3, "session_only" boolean DEFAULT true) RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  workout_exercise_id uuid := gen_random_uuid();
  next_position integer;
begin
  if target_set_count < 1 or target_set_count > 20 then
    raise exception 'Set count must be between 1 and 20';
  end if;

  if not exists (
    select 1 from public.workout_sessions
    where id = target_session_id and user_id = current_user_id and status = 'in_progress'
  ) then
    raise exception 'Active workout not found';
  end if;

  select coalesce(max(position), -1) + 1 into next_position
  from public.workout_exercises where workout_session_id = target_session_id;

  insert into public.workout_exercises (
    id, workout_session_id, exercise_id, position,
    is_session_only_addition, notes
  ) values (
    workout_exercise_id, target_session_id, target_exercise_id,
    next_position, session_only, ''
  );

  insert into public.workout_sets (id, workout_exercise_id, set_number, is_completed)
  select gen_random_uuid(), workout_exercise_id, number, false
  from generate_series(1, target_set_count) as number;

  return workout_exercise_id;
end;
$$;


ALTER FUNCTION "public"."add_workout_exercise"("target_session_id" "uuid", "target_exercise_id" "uuid", "target_set_count" integer, "session_only" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_workout_set"("target_workout_exercise_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  set_id uuid := gen_random_uuid();
  next_number integer;
begin
  if not exists (
    select 1
    from public.workout_exercises exercise
    join public.workout_sessions session on session.id = exercise.workout_session_id
    where exercise.id = target_workout_exercise_id
      and session.user_id = auth.uid()
      and session.status = 'in_progress'
  ) then
    raise exception 'Active workout exercise not found';
  end if;

  select coalesce(max(set_number), 0) + 1 into next_number
  from public.workout_sets where workout_exercise_id = target_workout_exercise_id;

  insert into public.workout_sets (id, workout_exercise_id, set_number, is_completed)
  values (set_id, target_workout_exercise_id, next_number, false);

  return set_id;
end;
$$;


ALTER FUNCTION "public"."add_workout_set"("target_workout_exercise_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_girls_strength_4_template"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  week_start date;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.ensure_personal_split();

  insert into public.exercises (
    name,
    primary_muscle,
    secondary_muscles,
    workout_type,
    is_custom,
    created_by
  )
  select catalog.name,
         catalog.primary_muscle,
         catalog.secondary_muscles,
         catalog.workout_type,
         false,
         null
  from (
    values
      ('Kickback', 'glutes'::public.muscle_group, array['hamstrings'::public.muscle_group], 'legs'::public.workout_type),
      ('Leg Extension', 'quads'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type),
      ('Chest Press Machine', 'chest'::public.muscle_group, array['triceps'::public.muscle_group, 'shoulders'::public.muscle_group], 'push'::public.workout_type),
      ('Machine Lateral Raise', 'shoulders'::public.muscle_group, array[]::public.muscle_group[], 'push'::public.workout_type),
      ('Single-Arm Triceps Pushdown', 'triceps'::public.muscle_group, array[]::public.muscle_group[], 'push'::public.workout_type),
      ('Hip Abduction', 'glutes'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type),
      ('Lat Pulldown Crunch', 'core'::public.muscle_group, array[]::public.muscle_group[], 'custom'::public.workout_type),
      ('Hip Thrust', 'glutes'::public.muscle_group, array['hamstrings'::public.muscle_group], 'legs'::public.workout_type),
      ('Lying Leg Curl', 'hamstrings'::public.muscle_group, array['calves'::public.muscle_group], 'legs'::public.workout_type),
      ('T-Bar Row', 'back'::public.muscle_group, array['biceps'::public.muscle_group], 'pull'::public.workout_type),
      ('Wide-Grip Lat Pulldown Machine', 'back'::public.muscle_group, array['biceps'::public.muscle_group], 'pull'::public.workout_type),
      ('Face-Away Curl', 'biceps'::public.muscle_group, array[]::public.muscle_group[], 'pull'::public.workout_type),
      ('Leg Press Calf Raise', 'calves'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type),
      ('Hack Squat', 'quads'::public.muscle_group, array['glutes'::public.muscle_group], 'legs'::public.workout_type),
      ('Incline Chest Press Machine', 'chest'::public.muscle_group, array['triceps'::public.muscle_group, 'shoulders'::public.muscle_group], 'push'::public.workout_type),
      ('Overhead Triceps Extension', 'triceps'::public.muscle_group, array[]::public.muscle_group[], 'push'::public.workout_type),
      ('Romanian Deadlift', 'hamstrings'::public.muscle_group, array['glutes'::public.muscle_group, 'back'::public.muscle_group], 'legs'::public.workout_type),
      ('Contralateral Split Squat', 'quads'::public.muscle_group, array['glutes'::public.muscle_group], 'legs'::public.workout_type),
      ('Single-Arm Lat Row', 'back'::public.muscle_group, array['biceps'::public.muscle_group], 'pull'::public.workout_type),
      ('Dumbbell Preacher Curl', 'biceps'::public.muscle_group, array[]::public.muscle_group[], 'pull'::public.workout_type)
  ) as catalog(name, primary_muscle, secondary_muscles, workout_type)
  where not exists (
    select 1
    from public.exercises existing
    where lower(existing.name) = lower(catalog.name)
  );

  update public.split_days as day
  set workout_type = config.workout_type,
      display_name = config.display_name,
      focus_label = config.focus_label,
      icon_key = config.icon_key,
      color_key = config.color_key,
      day_notes = config.day_notes,
      updated_at = now()
  from (
    values
      ('saturday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 1', 'Glutes ┬╖ Push ┬╖ Core', 'heart', 'rose', 'Balanced full-body day with glute priority.'),
      ('sunday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 2', 'Glutes ┬╖ Back ┬╖ Calves', 'flame', 'violet', 'Posterior chain and back focus.'),
      ('monday'::public.weekday, 'rest'::public.workout_type, 'Rest', 'Recovery', 'moon', 'blue', ''),
      ('tuesday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 3', 'Glutes ┬╖ Quads ┬╖ Push', 'heart', 'rose', 'Lower-body strength with push accessories.'),
      ('wednesday'::public.weekday, 'rest'::public.workout_type, 'Rest', 'Recovery', 'moon', 'blue', ''),
      ('thursday'::public.weekday, 'custom'::public.workout_type, 'Girls Day 4', 'Lower ┬╖ Pull ┬╖ Core', 'target', 'emerald', 'Lower and pull day with unilateral work.'),
      ('friday'::public.weekday, 'rest'::public.workout_type, 'Rest', 'Recovery', 'moon', 'blue', '')
  ) as config(weekday, workout_type, display_name, focus_label, icon_key, color_key, day_notes)
  where day.owner_user_id = current_user_id
    and day.weekday = config.weekday;

  delete from public.split_exercises exercise
  using public.split_days day
  where exercise.split_day_id = day.id
    and day.owner_user_id = current_user_id;

  with plan(day_weekday, position, exercise_name, target_sets, target_reps_min, target_reps_max) as (
    values
      ('saturday'::public.weekday, 0, 'Kickback', 2, 10, 15),
      ('saturday'::public.weekday, 1, 'Leg Extension', 2, 8, 12),
      ('saturday'::public.weekday, 2, 'Chest Press Machine', 2, 8, 12),
      ('saturday'::public.weekday, 3, 'Machine Lateral Raise', 2, 10, 15),
      ('saturday'::public.weekday, 4, 'Single-Arm Triceps Pushdown', 2, 8, 12),
      ('saturday'::public.weekday, 5, 'Hip Abduction', 2, 12, 20),
      ('saturday'::public.weekday, 6, 'Lat Pulldown Crunch', 2, 10, 15),

      ('sunday'::public.weekday, 0, 'Hip Thrust', 2, 8, 12),
      ('sunday'::public.weekday, 1, 'Lying Leg Curl', 2, 8, 12),
      ('sunday'::public.weekday, 2, 'T-Bar Row', 2, 8, 12),
      ('sunday'::public.weekday, 3, 'Wide-Grip Lat Pulldown Machine', 2, 8, 12),
      ('sunday'::public.weekday, 4, 'Face-Away Curl', 2, 8, 12),
      ('sunday'::public.weekday, 5, 'Leg Press Calf Raise', 2, 10, 15),

      ('tuesday'::public.weekday, 0, 'Hip Thrust', 2, 8, 12),
      ('tuesday'::public.weekday, 1, 'Hack Squat', 2, 8, 12),
      ('tuesday'::public.weekday, 2, 'Incline Chest Press Machine', 2, 8, 12),
      ('tuesday'::public.weekday, 3, 'Overhead Triceps Extension', 2, 8, 12),
      ('tuesday'::public.weekday, 4, 'Lat Pulldown Crunch', 2, 10, 15),

      ('thursday'::public.weekday, 0, 'Romanian Deadlift', 2, 8, 12),
      ('thursday'::public.weekday, 1, 'Contralateral Split Squat', 2, 8, 12),
      ('thursday'::public.weekday, 2, 'Single-Arm Lat Row', 2, 8, 12),
      ('thursday'::public.weekday, 3, 'T-Bar Row', 2, 8, 12),
      ('thursday'::public.weekday, 4, 'Dumbbell Preacher Curl', 2, 8, 12),
      ('thursday'::public.weekday, 5, 'Leg Extension', 2, 8, 12),
      ('thursday'::public.weekday, 6, 'Lat Pulldown Crunch', 2, 10, 15)
  )
  insert into public.split_exercises (
    split_day_id,
    exercise_id,
    position,
    target_sets,
    target_reps_min,
    target_reps_max,
    is_personal_addition
  )
  select day.id,
         exercise.id,
         plan.position,
         plan.target_sets,
         plan.target_reps_min,
         plan.target_reps_max,
         false
  from plan
  join public.split_days day
    on day.owner_user_id = current_user_id
   and day.weekday = plan.day_weekday
  join lateral (
    select catalog.id
    from public.exercises catalog
    where lower(catalog.name) = lower(plan.exercise_name)
    order by (catalog.created_by is null) desc, catalog.created_at asc
    limit 1
  ) exercise on true;

  update public.profiles
  set split_setup_method = 'starter',
      split_setup_completed_at = coalesce(split_setup_completed_at, now()),
      updated_at = now()
  where id = current_user_id;

  week_start := current_date - ((extract(dow from current_date)::integer + 1) % 7);
  delete from public.weekly_schedule_days
  where user_id = current_user_id
    and schedule_date >= week_start;

  perform public.ensure_week_schedule(current_date);
end;
$$;


ALTER FUNCTION "public"."apply_girls_strength_4_template"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_girls_strength_4_template_v2"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  applied_days integer;
  applied_exercises integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.apply_girls_strength_4_template();

  select count(*)
  into applied_days
  from public.split_days as day
  where day.owner_user_id = current_user_id
    and day.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4')
    and day.workout_type <> 'rest'::public.workout_type;

  select count(*)
  into applied_exercises
  from public.split_exercises as item
  inner join public.split_days as day on day.id = item.split_day_id
  where day.owner_user_id = current_user_id
    and day.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4');

  if applied_days <> 4 or applied_exercises < 25 then
    raise exception 'Girls 4-Day template was not fully applied (days %, exercises %)', applied_days, applied_exercises;
  end if;

  week_start := cairo_today - ((extract(dow from cairo_today)::integer + 1) % 7);

  delete from public.weekly_schedule_days as schedule
  where schedule.user_id = current_user_id
    and schedule.schedule_date >= week_start;

  perform public.ensure_week_schedule(cairo_today);

  return jsonb_build_object(
    'ok', true,
    'training_days', applied_days,
    'exercise_count', applied_exercises,
    'week_start', week_start
  );
end;
$$;


ALTER FUNCTION "public"."apply_girls_strength_4_template_v2"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_girls_strength_4_template_v3"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  applied_days integer;
  applied_exercises integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  perform public.apply_girls_strength_4_template_v2();

  select count(*)
    into applied_days
  from public.split_days as d
  where d.owner_user_id = current_user_id
    and d.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4')
    and d.workout_type <> 'rest'::public.workout_type;

  select count(*)
    into applied_exercises
  from public.split_exercises as se
  inner join public.split_days as d on d.id = se.split_day_id
  where d.owner_user_id = current_user_id
    and d.display_name in ('Girls Day 1', 'Girls Day 2', 'Girls Day 3', 'Girls Day 4');

  if applied_days <> 4 or applied_exercises <> 25 then
    raise exception 'Girls 4-Day template verification failed (days %, exercises %)', applied_days, applied_exercises;
  end if;

  week_start := cairo_today - ((extract(dow from cairo_today)::integer + 1) % 7);

  delete from public.weekly_schedule_days as w
  where w.user_id = current_user_id
    and w.schedule_date >= week_start;

  perform public.ensure_week_schedule(cairo_today);

  return jsonb_build_object(
    'ok', true,
    'training_days', applied_days,
    'exercise_count', applied_exercises,
    'week_start', week_start,
    'timezone', 'Africa/Cairo'
  );
end;
$$;


ALTER FUNCTION "public"."apply_girls_strength_4_template_v3"() OWNER TO "postgres";


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
  imported_weekdays public.weekday[] := '{}';
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


ALTER FUNCTION "public"."apply_imported_split"("target_plan" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."apply_split_template"("target_template_key" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
  sat uuid; sun uuid; mon uuid; tue uuid; wed uuid; thu uuid; fri uuid;
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
    fri := public.set_personal_day(current_user_id, current_group_id, 'friday', 'custom', 'Friday training', 'Custom', 'dumbbell', 'indigo');
  elsif target_template_key = 'full_body_3' then
    sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'custom', 'Full body A', 'Full body', 'activity', 'indigo');
    sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'custom', 'Full body B', 'Full body', 'activity', 'violet');
    tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'custom', 'Full body C', 'Full body', 'activity', 'emerald');
    thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
    fri := public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');

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
    fri := public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');

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
    fri := public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
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
    fri := public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
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


ALTER FUNCTION "public"."apply_split_template"("target_template_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."array_is_unique"("values_array" "anyarray") RETURNS boolean
    LANGUAGE "sql" IMMUTABLE
    AS $$
  select coalesce(cardinality(values_array), 0) =
         coalesce((select count(distinct value) from unnest(values_array) as item(value)), 0);
$$;


ALTER FUNCTION "public"."array_is_unique"("values_array" "anyarray") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  window_start integer;
  window_step integer;
  checked_weekday public.weekday;
  checked_type public.workout_type;
  rest_count integer;
begin
  for window_start in 0..6 loop
    rest_count := 0;
    for window_step in 0..2 loop
      checked_weekday := public.weekday_from_index(window_start + window_step);
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


ALTER FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  window_start date;
  window_step integer;
  checked_type public.workout_type;
  rest_count integer;
begin
  for window_start in select generate_series(changed_date - 2, changed_date, interval '1 day')::date loop
    rest_count := 0;
    for window_step in 0..2 loop
      select case
        when weekly.schedule_date = changed_date then changed_workout_type
        else weekly.workout_type
      end
      into checked_type
      from public.weekly_schedule_days weekly
      where weekly.user_id = target_user_id
        and weekly.schedule_date = window_start + window_step;

      if checked_type = 'rest' then rest_count := rest_count + 1; end if;
    end loop;

    if rest_count = 3 then
      raise exception 'Your plan cannot contain more than two consecutive rest days';
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."bump_group_split_version"("target_group_id" "uuid") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  next_version integer;
begin
  update public.groups
  set split_version = split_version + 1,
      split_updated_at = now()
  where id = target_group_id
  returning split_version into next_version;

  if auth.uid() is not null then
    update public.group_members
    set seen_split_version = next_version
    where group_id = target_group_id
      and user_id = auth.uid();
  end if;

  return next_version;
end;
$$;


ALTER FUNCTION "public"."bump_group_split_version"("target_group_id" "uuid") OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."groups" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "invite_code" "text" NOT NULL,
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "is_personal" boolean DEFAULT false NOT NULL,
    "split_version" integer DEFAULT 1 NOT NULL,
    "split_updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "groups_invite_code_check" CHECK (("invite_code" ~ '^[A-Z0-9]{8}$'::"text")),
    CONSTRAINT "groups_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "name")) <= 80)))
);


ALTER TABLE "public"."groups" OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_group_with_owner"("group_name" "text") RETURNS "public"."groups"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  new_group public.groups;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if exists (select 1 from public.group_members where user_id = current_user_id) then
    raise exception 'User already belongs to a training workspace';
  end if;

  insert into public.groups (name, invite_code, created_by, is_personal)
  values (trim(group_name), public.generate_group_invite_code(), current_user_id, false)
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, current_user_id, 'owner');

  insert into public.split_days (group_id, owner_user_id, weekday, workout_type)
  values
    (new_group.id, null, 'saturday', 'push'),
    (new_group.id, null, 'sunday', 'pull'),
    (new_group.id, null, 'monday', 'legs'),
    (new_group.id, null, 'tuesday', 'push'),
    (new_group.id, null, 'wednesday', 'pull'),
    (new_group.id, null, 'thursday', 'legs'),
    (new_group.id, null, 'friday', 'rest');

  perform public.seed_group_split(new_group.id);
  perform public.ensure_personal_split();
  return new_group;
end;
$$;


ALTER FUNCTION "public"."create_group_with_owner"("group_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_solo_workspace"() RETURNS "public"."groups"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  new_group public.groups;
  current_user_id uuid := auth.uid();
  athlete_name text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select groups.* into new_group
  from public.group_members
  join public.groups on groups.id = group_members.group_id
  where group_members.user_id = current_user_id
  limit 1;

  if new_group.id is not null then
    return new_group;
  end if;

  select coalesce(nullif(trim(display_name), ''), 'My') into athlete_name
  from public.profiles where id = current_user_id;

  insert into public.groups (name, invite_code, created_by, is_personal)
  values (left(athlete_name || '''s Training', 80), public.generate_group_invite_code(), current_user_id, true)
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, current_user_id, 'owner');

  insert into public.split_days (group_id, owner_user_id, weekday, workout_type)
  values
    (new_group.id, null, 'saturday', 'push'),
    (new_group.id, null, 'sunday', 'pull'),
    (new_group.id, null, 'monday', 'legs'),
    (new_group.id, null, 'tuesday', 'push'),
    (new_group.id, null, 'wednesday', 'pull'),
    (new_group.id, null, 'thursday', 'legs'),
    (new_group.id, null, 'friday', 'rest');

  perform public.seed_group_split(new_group.id);
  perform public.ensure_personal_split();
  return new_group;
end;
$$;


ALTER FUNCTION "public"."create_solo_workspace"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_user_group_id"() RETURNS "uuid"
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select group_id from public.group_members where user_id = auth.uid() limit 1;
$$;


ALTER FUNCTION "public"."current_user_group_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_own_workout_session"("target_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  session_owner_id uuid;
  affected_exercise_ids uuid[];
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select user_id into session_owner_id
  from public.workout_sessions
  where id = target_session_id;

  if session_owner_id is null then
    return;
  end if;

  if session_owner_id <> current_user_id then
    raise exception 'You can only delete your own workout sessions';
  end if;

  select array_agg(distinct exercise_id)
  into affected_exercise_ids
  from public.workout_exercises
  where workout_session_id = target_session_id;

  -- Remove feed entries that directly reference the deleted workout or one of
  -- its sets before the cascading delete removes those set ids.
  delete from public.group_activity
  where user_id = current_user_id
    and (
      metadata ->> 'workout_session_id' = target_session_id::text
      or metadata ->> 'workout_set_id' in (
        select workout_sets.id::text
        from public.workout_sets
        join public.workout_exercises
          on workout_exercises.id = workout_sets.workout_exercise_id
        where workout_exercises.workout_session_id = target_session_id
      )
    );

  perform set_config('gym_crew.suppress_group_activity', 'on', true);
  delete from public.workout_sessions where id = target_session_id;

  if affected_exercise_ids is not null then
    for i in 1..array_length(affected_exercise_ids, 1) loop
      perform public.recalculate_personal_records_for_exercise(
        current_user_id,
        affected_exercise_ids[i]
      );
    end loop;
  end if;

  perform set_config('gym_crew.suppress_group_activity', 'off', true);
end;
$$;


ALTER FUNCTION "public"."delete_own_workout_session"("target_session_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_personal_split"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select group_id into current_group_id
  from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;

  if exists (
    select 1 from public.split_days
    where group_id = current_group_id and owner_user_id = current_user_id
  ) then
    return;
  end if;

  insert into public.split_days (
    group_id, owner_user_id, weekday, workout_type, display_name,
    focus_label, icon_key, color_key, day_notes
  )
  select
    group_id, current_user_id, weekday, workout_type, display_name,
    focus_label, icon_key, color_key, day_notes
  from public.split_days
  where group_id = current_group_id and owner_user_id is null
  order by public.weekday_index(weekday);

  insert into public.split_exercises (
    split_day_id, exercise_id, position,
    target_sets, target_reps_min, target_reps_max, is_personal_addition
  )
  select
    personal_day.id,
    group_exercise.exercise_id,
    group_exercise.position,
    group_exercise.target_sets,
    group_exercise.target_reps_min,
    group_exercise.target_reps_max,
    false
  from public.split_days group_day
  join public.split_days personal_day
    on personal_day.group_id = group_day.group_id
    and personal_day.owner_user_id = current_user_id
    and personal_day.weekday = group_day.weekday
  join public.split_exercises group_exercise
    on group_exercise.split_day_id = group_day.id
  where group_day.group_id = current_group_id
    and group_day.owner_user_id is null;
end;
$$;


ALTER FUNCTION "public"."ensure_personal_split"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."ensure_week_schedule"("target_anchor_date" "date" DEFAULT CURRENT_DATE) RETURNS "date"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
  week_start date := public.training_week_start(target_anchor_date);
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select group_id into current_group_id from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;

  perform public.ensure_personal_split();

  insert into public.weekly_schedule_days (
    user_id, group_id, schedule_date, source_split_day_id, workout_type,
    display_name, focus_label, icon_key, color_key, day_notes, is_customized
  )
  select
    current_user_id,
    current_group_id,
    week_start + public.weekday_index(day.weekday),
    day.id,
    day.workout_type,
    coalesce(nullif(trim(day.display_name), ''), initcap(day.workout_type::text) || ' day'),
    coalesce(nullif(trim(day.focus_label), ''), initcap(day.workout_type::text)),
    day.icon_key,
    day.color_key,
    day.day_notes,
    false
  from public.split_days day
  where day.group_id = current_group_id
    and day.owner_user_id = current_user_id
  on conflict (user_id, schedule_date) do nothing;

  return week_start;
end;
$$;


ALTER FUNCTION "public"."ensure_week_schedule"("target_anchor_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_group_invite_code"() RETURNS "text"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
declare
  candidate text;
begin
  loop
    candidate := upper(
      substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        8
      )
    );

    exit when not exists (
      select 1
      from public.groups
      where invite_code = candidate
    );
  end loop;

  return candidate;
end;
$$;


ALTER FUNCTION "public"."generate_group_invite_code"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_daily_consistency_streak"() RETURNS TABLE("current_streak_days" integer, "longest_streak_days" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  first_date date;
  cursor_date date;
  effective_type public.workout_type;
  completed boolean;
  successful boolean;
  running integer := 0;
  longest integer := 0;
  current_value integer := 0;
  current_broken boolean := false;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select min(scheduled_date) into first_date
  from public.workout_sessions
  where user_id = current_user_id and status = 'completed';

  if first_date is null then
    return query select 0, 0;
    return;
  end if;

  for cursor_date in select generate_series(first_date, current_date, interval '1 day')::date loop
    select coalesce(weekly.workout_type, base.workout_type)
    into effective_type
    from public.split_days base
    left join public.weekly_schedule_days weekly
      on weekly.user_id = current_user_id and weekly.schedule_date = cursor_date
    where base.owner_user_id = current_user_id
      and base.weekday = case extract(dow from cursor_date)::integer
        when 0 then 'sunday'::public.weekday when 1 then 'monday'::public.weekday
        when 2 then 'tuesday'::public.weekday when 3 then 'wednesday'::public.weekday
        when 4 then 'thursday'::public.weekday when 5 then 'friday'::public.weekday
        when 6 then 'saturday'::public.weekday end
    limit 1;

    select exists (
      select 1 from public.workout_sessions session
      where session.user_id = current_user_id
        and session.status = 'completed'
        and session.scheduled_date = cursor_date
    ) into completed;

    successful := effective_type = 'rest' or completed;
    -- Today's planned workout is still open and should not break the streak.
    if cursor_date = current_date and effective_type <> 'rest' and not completed then
      continue;
    end if;

    if successful then
      running := running + 1;
      longest := greatest(longest, running);
    else
      running := 0;
    end if;
  end loop;

  -- Walk backwards to calculate the currently active daily streak.
  cursor_date := current_date;
  while cursor_date >= first_date and not current_broken loop
    select coalesce(weekly.workout_type, base.workout_type)
    into effective_type
    from public.split_days base
    left join public.weekly_schedule_days weekly
      on weekly.user_id = current_user_id and weekly.schedule_date = cursor_date
    where base.owner_user_id = current_user_id
      and base.weekday = case extract(dow from cursor_date)::integer
        when 0 then 'sunday'::public.weekday when 1 then 'monday'::public.weekday
        when 2 then 'tuesday'::public.weekday when 3 then 'wednesday'::public.weekday
        when 4 then 'thursday'::public.weekday when 5 then 'friday'::public.weekday
        when 6 then 'saturday'::public.weekday end
    limit 1;

    select exists (
      select 1 from public.workout_sessions session
      where session.user_id = current_user_id
        and session.status = 'completed'
        and session.scheduled_date = cursor_date
    ) into completed;

    if cursor_date = current_date and effective_type <> 'rest' and not completed then
      cursor_date := cursor_date - 1;
      continue;
    end if;

    if effective_type = 'rest' or completed then
      current_value := current_value + 1;
      cursor_date := cursor_date - 1;
    else
      current_broken := true;
    end if;
  end loop;

  return query select current_value, longest;
end;
$$;


ALTER FUNCTION "public"."get_daily_consistency_streak"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_group_member_weekly_stats"("target_group_id" "uuid") RETURNS TABLE("user_id" "uuid", "display_name" "text", "avatar_url" "text", "role" "public"."group_role", "sessions_this_week" bigint, "scheduled_this_week" bigint, "adherence_percent" integer, "personal_records_count" bigint, "last_workout_at" timestamp with time zone, "share_workout_summary" boolean, "share_personal_records" boolean, "share_weights" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  week_end date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_members AS requesting_member
    WHERE requesting_member.group_id = target_group_id
      AND requesting_member.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this group'
      USING ERRCODE = '42501';
  END IF;

  -- PostgreSQL DOW: Sunday=0 ... Saturday=6.
  week_start := cairo_today - ((extract(dow FROM cairo_today)::integer + 1) % 7);
  week_end := week_start + 6;

  RETURN QUERY
  WITH member_base AS (
    SELECT
      member.user_id AS member_user_id,
      member.role AS member_role,
      profile.display_name AS member_display_name,
      profile.avatar_url AS member_avatar_url,
      profile.share_workout_summary AS member_share_workout_summary,
      profile.share_personal_records AS member_share_personal_records,
      profile.share_weights AS member_share_weights
    FROM public.group_members AS member
    INNER JOIN public.profiles AS profile
      ON profile.id = member.user_id
    WHERE member.group_id = target_group_id
  ),
  scheduled AS (
    SELECT
      schedule.user_id AS scheduled_user_id,
      count(*)::bigint AS scheduled_count
    FROM public.weekly_schedule_days AS schedule
    WHERE schedule.group_id = target_group_id
      AND schedule.schedule_date BETWEEN week_start AND week_end
      AND schedule.workout_type <> 'rest'::public.workout_type
    GROUP BY schedule.user_id
  ),
  completed AS (
    SELECT
      session.user_id AS completed_user_id,
      count(*)::bigint AS completed_count
    FROM public.workout_sessions AS session
    WHERE session.group_id = target_group_id
      AND session.status = 'completed'::public.workout_session_status
      AND session.scheduled_date BETWEEN week_start AND week_end
    GROUP BY session.user_id
  ),
  records AS (
    SELECT
      record.user_id AS record_user_id,
      count(*)::bigint AS record_count
    FROM public.personal_records AS record
    WHERE (timezone('Africa/Cairo', record.achieved_at))::date
      BETWEEN week_start AND week_end
    GROUP BY record.user_id
  ),
  last_workouts AS (
    SELECT
      session.user_id AS last_workout_user_id,
      max(session.completed_at) AS latest_completed_at
    FROM public.workout_sessions AS session
    WHERE session.group_id = target_group_id
      AND session.status = 'completed'::public.workout_session_status
    GROUP BY session.user_id
  )
  SELECT
    base.member_user_id AS user_id,
    base.member_display_name AS display_name,
    base.member_avatar_url AS avatar_url,
    base.member_role AS role,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN coalesce(done.completed_count, 0)::bigint
      ELSE 0::bigint
    END AS sessions_this_week,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN coalesce(plan.scheduled_count, 0)::bigint
      ELSE 0::bigint
    END AS scheduled_this_week,
    CASE
      WHEN NOT (base.member_user_id = auth.uid() OR base.member_share_workout_summary) THEN 0
      WHEN coalesce(plan.scheduled_count, 0) = 0 THEN 0
      ELSE least(
        100,
        round(
          (coalesce(done.completed_count, 0)::numeric / plan.scheduled_count::numeric) * 100
        )::integer
      )
    END AS adherence_percent,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_personal_records
        THEN coalesce(pr.record_count, 0)::bigint
      ELSE 0::bigint
    END AS personal_records_count,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN latest.latest_completed_at
      ELSE NULL::timestamptz
    END AS last_workout_at,
    base.member_share_workout_summary AS share_workout_summary,
    base.member_share_personal_records AS share_personal_records,
    base.member_share_weights AS share_weights
  FROM member_base AS base
  LEFT JOIN scheduled AS plan
    ON plan.scheduled_user_id = base.member_user_id
  LEFT JOIN completed AS done
    ON done.completed_user_id = base.member_user_id
  LEFT JOIN records AS pr
    ON pr.record_user_id = base.member_user_id
  LEFT JOIN last_workouts AS latest
    ON latest.last_workout_user_id = base.member_user_id
  ORDER BY
    adherence_percent DESC,
    sessions_this_week DESC,
    display_name ASC;
END;
$$;


ALTER FUNCTION "public"."get_group_member_weekly_stats"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_completed_session_personal_records"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  if new.status = 'completed' and (
    tg_op = 'INSERT' or old.status is distinct from 'completed'
  ) then
    perform public.refresh_personal_records_for_session(new.id);
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_completed_session_personal_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_completed_set_personal_records"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  parent_session_id uuid;
  parent_status public.workout_session_status;
  target_workout_exercise_id uuid;
begin
  if tg_op = 'DELETE' then
    target_workout_exercise_id := old.workout_exercise_id;
  else
    target_workout_exercise_id := new.workout_exercise_id;
  end if;

  select session.id, session.status
  into parent_session_id, parent_status
  from public.workout_exercises exercise
  join public.workout_sessions session on session.id = exercise.workout_session_id
  where exercise.id = target_workout_exercise_id;

  if parent_status = 'completed' then
    perform public.refresh_personal_records_for_session(parent_session_id);
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;


ALTER FUNCTION "public"."handle_completed_set_personal_records"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_group_split_day_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  source_day public.split_days;
begin
  if tg_op = 'DELETE' then
    source_day := old;
  else
    source_day := new;
  end if;
  if source_day.owner_user_id is null then
    perform public.bump_group_split_version(source_day.group_id);
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_group_split_day_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_group_split_exercise_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  source_exercise public.split_exercises;
  source_day public.split_days;
begin
  if tg_op = 'DELETE' then
    source_exercise := old;
  else
    source_exercise := new;
  end if;
  select * into source_day
  from public.split_days
  where id = source_exercise.split_day_id;

  if source_day.id is not null and source_day.owner_user_id is null then
    perform public.bump_group_split_version(source_day.group_id);
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."handle_group_split_exercise_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_auth_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  resolved_display_name text;
begin
  resolved_display_name := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'Athlete'
  );

  if char_length(resolved_display_name) < 2 then
    resolved_display_name := 'Athlete';
  end if;

  insert into public.profiles (
    id,
    display_name
  )
  values (
    new.id,
    resolved_display_name
  )
  on conflict (id) do nothing;

  return new;
end;
$$;


ALTER FUNCTION "public"."handle_new_auth_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_admin"("target_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
      and role in ('owner', 'admin')
  );
$$;


ALTER FUNCTION "public"."is_group_admin"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_member"("target_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id and user_id = auth.uid()
  );
$$;


ALTER FUNCTION "public"."is_group_member"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_group_owner"("target_group_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1 from public.group_members
    where group_id = target_group_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;


ALTER FUNCTION "public"."is_group_owner"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."join_group_by_invite_code"("raw_invite_code" "text") RETURNS "public"."groups"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  selected_group public.groups;
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if exists (select 1 from public.group_members where user_id = current_user_id) then
    raise exception 'User already belongs to a training workspace';
  end if;

  select * into selected_group
  from public.groups
  where invite_code = upper(trim(raw_invite_code))
    and not is_personal;

  if selected_group.id is null then
    raise exception 'Invalid invite code';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (selected_group.id, current_user_id, 'member');

  insert into public.group_activity (group_id, user_id, activity_type, message)
  values (selected_group.id, current_user_id, 'joined_group', 'Joined the group');

  perform public.ensure_personal_split();
  return selected_group;
end;
$$;


ALTER FUNCTION "public"."join_group_by_invite_code"("raw_invite_code" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_completed_workout_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  should_share boolean;
begin
  if new.status = 'completed' and (
    tg_op = 'INSERT' or old.status is distinct from 'completed'
  ) then
    select share_workout_summary into should_share
    from public.profiles
    where id = new.user_id;

    if coalesce(should_share, true) then
      insert into public.group_activity (group_id, user_id, activity_type, message, metadata)
      values (
        new.group_id,
        new.user_id,
        'workout_completed',
        'Completed a workout',
        jsonb_build_object(
          'workout_session_id', new.id,
          'scheduled_date', new.scheduled_date,
          'duration_seconds', new.duration_seconds
        )
      );
    end if;
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."log_completed_workout_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_personal_record_activity"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_group_id uuid;
  should_share boolean;
begin
  if current_setting('gym_crew.suppress_group_activity', true) = 'on' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.value is not distinct from new.value
      and old.workout_set_id is not distinct from new.workout_set_id then
      return new;
    end if;
  end if;

  select group_id into target_group_id
  from public.group_members
  where user_id = new.user_id;

  select share_personal_records into should_share
  from public.profiles
  where id = new.user_id;

  if target_group_id is not null and coalesce(should_share, true) then
    insert into public.group_activity (
      group_id, user_id, activity_type, message, metadata
    ) values (
      target_group_id,
      new.user_id,
      'personal_record',
      'Set a new personal record',
      jsonb_build_object(
        'exercise_id', new.exercise_id,
        'record_type', new.record_type,
        'value', new.value,
        'weight_kg', new.weight_kg,
        'reps', new.reps,
        'workout_set_id', new.workout_set_id
      )
    );
  end if;

  return new;
end;
$$;


ALTER FUNCTION "public"."log_personal_record_activity"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."move_split_exercise"("target_split_exercise_id" "uuid", "direction" integer) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_row public.split_exercises;
  adjacent_row public.split_exercises;
  split_owner uuid;
  split_group uuid;
  temporary_position integer := 1000000;
begin
  if direction not in (-1, 1) then
    raise exception 'Direction must be -1 or 1';
  end if;

  select * into current_row from public.split_exercises where id = target_split_exercise_id;
  if current_row.id is null then raise exception 'Split exercise not found'; end if;

  select owner_user_id, group_id into split_owner, split_group
  from public.split_days where id = current_row.split_day_id;

  if not (
    (split_owner = auth.uid() and public.is_group_member(split_group)) or
    (split_owner is null and public.is_group_admin(split_group))
  ) then
    raise exception 'Not allowed to edit this split';
  end if;

  select * into adjacent_row
  from public.split_exercises
  where split_day_id = current_row.split_day_id
    and position = current_row.position + direction;

  if adjacent_row.id is null then return; end if;

  update public.split_exercises set position = temporary_position where id = current_row.id;
  update public.split_exercises set position = current_row.position where id = adjacent_row.id;
  update public.split_exercises set position = adjacent_row.position where id = current_row.id;
end;
$$;


ALTER FUNCTION "public"."move_split_exercise"("target_split_exercise_id" "uuid", "direction" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalculate_personal_records_for_exercise"("target_user_id" "uuid", "target_exercise_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  best_set_id uuid;
  best_weight numeric(8, 2);
  best_reps integer;
  best_value numeric;
  best_achieved_at timestamptz;
begin
  -- Maximum weight
  select
    workout_sets.id,
    workout_sets.weight_kg,
    workout_sets.reps,
    workout_sets.weight_kg,
    coalesce(workout_sessions.completed_at, workout_sets.updated_at)
  into best_set_id, best_weight, best_reps, best_value, best_achieved_at
  from public.workout_sets
  join public.workout_exercises
    on workout_exercises.id = workout_sets.workout_exercise_id
  join public.workout_sessions
    on workout_sessions.id = workout_exercises.workout_session_id
  where workout_sessions.user_id = target_user_id
    and workout_sessions.status = 'completed'
    and workout_exercises.exercise_id = target_exercise_id
    and workout_sets.is_completed
    and not workout_sets.is_warmup
    and workout_sets.weight_kg is not null
  order by workout_sets.weight_kg desc,
           workout_sets.reps desc nulls last,
           workout_sets.updated_at desc
  limit 1;

  if best_set_id is null then
    delete from public.personal_records
    where user_id = target_user_id
      and exercise_id = target_exercise_id
      and record_type = 'max_weight';
  else
    insert into public.personal_records (
      user_id, exercise_id, record_type, value, workout_set_id,
      achieved_at, weight_kg, reps
    ) values (
      target_user_id, target_exercise_id, 'max_weight', best_value,
      best_set_id, best_achieved_at, best_weight, best_reps
    )
    on conflict (user_id, exercise_id, record_type) do update
    set value = excluded.value,
        workout_set_id = excluded.workout_set_id,
        achieved_at = excluded.achieved_at,
        weight_kg = excluded.weight_kg,
        reps = excluded.reps;
  end if;

  -- Maximum reps
  best_set_id := null;
  best_weight := null;
  best_reps := null;
  best_value := null;
  best_achieved_at := null;

  select
    workout_sets.id,
    workout_sets.weight_kg,
    workout_sets.reps,
    workout_sets.reps,
    coalesce(workout_sessions.completed_at, workout_sets.updated_at)
  into best_set_id, best_weight, best_reps, best_value, best_achieved_at
  from public.workout_sets
  join public.workout_exercises
    on workout_exercises.id = workout_sets.workout_exercise_id
  join public.workout_sessions
    on workout_sessions.id = workout_exercises.workout_session_id
  where workout_sessions.user_id = target_user_id
    and workout_sessions.status = 'completed'
    and workout_exercises.exercise_id = target_exercise_id
    and workout_sets.is_completed
    and not workout_sets.is_warmup
    and workout_sets.reps is not null
  order by workout_sets.reps desc,
           workout_sets.weight_kg desc nulls last,
           workout_sets.updated_at desc
  limit 1;

  if best_set_id is null then
    delete from public.personal_records
    where user_id = target_user_id
      and exercise_id = target_exercise_id
      and record_type = 'max_reps';
  else
    insert into public.personal_records (
      user_id, exercise_id, record_type, value, workout_set_id,
      achieved_at, weight_kg, reps
    ) values (
      target_user_id, target_exercise_id, 'max_reps', best_value,
      best_set_id, best_achieved_at, best_weight, best_reps
    )
    on conflict (user_id, exercise_id, record_type) do update
    set value = excluded.value,
        workout_set_id = excluded.workout_set_id,
        achieved_at = excluded.achieved_at,
        weight_kg = excluded.weight_kg,
        reps = excluded.reps;
  end if;

  -- Best single-set volume
  best_set_id := null;
  best_weight := null;
  best_reps := null;
  best_value := null;
  best_achieved_at := null;

  select
    workout_sets.id,
    workout_sets.weight_kg,
    workout_sets.reps,
    workout_sets.weight_kg * workout_sets.reps,
    coalesce(workout_sessions.completed_at, workout_sets.updated_at)
  into best_set_id, best_weight, best_reps, best_value, best_achieved_at
  from public.workout_sets
  join public.workout_exercises
    on workout_exercises.id = workout_sets.workout_exercise_id
  join public.workout_sessions
    on workout_sessions.id = workout_exercises.workout_session_id
  where workout_sessions.user_id = target_user_id
    and workout_sessions.status = 'completed'
    and workout_exercises.exercise_id = target_exercise_id
    and workout_sets.is_completed
    and not workout_sets.is_warmup
    and workout_sets.weight_kg is not null
    and workout_sets.reps is not null
  order by (workout_sets.weight_kg * workout_sets.reps) desc,
           workout_sets.weight_kg desc,
           workout_sets.updated_at desc
  limit 1;

  if best_set_id is null then
    delete from public.personal_records
    where user_id = target_user_id
      and exercise_id = target_exercise_id
      and record_type = 'max_volume';
  else
    insert into public.personal_records (
      user_id, exercise_id, record_type, value, workout_set_id,
      achieved_at, weight_kg, reps
    ) values (
      target_user_id, target_exercise_id, 'max_volume', best_value,
      best_set_id, best_achieved_at, best_weight, best_reps
    )
    on conflict (user_id, exercise_id, record_type) do update
    set value = excluded.value,
        workout_set_id = excluded.workout_set_id,
        achieved_at = excluded.achieved_at,
        weight_kg = excluded.weight_kg,
        reps = excluded.reps;
  end if;
end;
$$;


ALTER FUNCTION "public"."recalculate_personal_records_for_exercise"("target_user_id" "uuid", "target_exercise_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."refresh_personal_records_for_session"("target_session_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_session public.workout_sessions;
  target_exercise_id uuid;
  best_set_id uuid;
  best_weight numeric(8, 2);
  best_reps integer;
  best_value numeric;
  best_achieved_at timestamptz;
begin
  select * into target_session
  from public.workout_sessions
  where id = target_session_id and status = 'completed';

  if target_session.id is null then
    return;
  end if;

  -- Recalculate each exercise in the completed session across the athlete's
  -- entire completed history. This keeps records correct even when an older
  -- completed set is edited or deleted later.
  for target_exercise_id in
    select distinct workout_exercises.exercise_id
    from public.workout_exercises
    where workout_exercises.workout_session_id = target_session.id
  loop
    best_set_id := null;
    best_weight := null;
    best_reps := null;
    best_value := null;
    best_achieved_at := null;

    select
      workout_sets.id,
      workout_sets.weight_kg,
      workout_sets.reps,
      workout_sets.weight_kg,
      coalesce(workout_sessions.completed_at, workout_sets.updated_at)
    into best_set_id, best_weight, best_reps, best_value, best_achieved_at
    from public.workout_sets
    join public.workout_exercises
      on workout_exercises.id = workout_sets.workout_exercise_id
    join public.workout_sessions
      on workout_sessions.id = workout_exercises.workout_session_id
    where workout_sessions.user_id = target_session.user_id
      and workout_sessions.status = 'completed'
      and workout_exercises.exercise_id = target_exercise_id
      and workout_sets.is_completed
      and not workout_sets.is_warmup
      and workout_sets.weight_kg is not null
    order by workout_sets.weight_kg desc,
             workout_sets.reps desc nulls last,
             workout_sets.updated_at desc
    limit 1;

    if best_set_id is null then
      delete from public.personal_records
      where user_id = target_session.user_id
        and exercise_id = target_exercise_id
        and record_type = 'max_weight';
    else
      insert into public.personal_records (
        user_id, exercise_id, record_type, value, workout_set_id,
        achieved_at, weight_kg, reps
      ) values (
        target_session.user_id, target_exercise_id, 'max_weight', best_value,
        best_set_id, best_achieved_at, best_weight, best_reps
      )
      on conflict (user_id, exercise_id, record_type) do update
      set value = excluded.value,
          workout_set_id = excluded.workout_set_id,
          achieved_at = excluded.achieved_at,
          weight_kg = excluded.weight_kg,
          reps = excluded.reps;
    end if;

    best_set_id := null;
    best_weight := null;
    best_reps := null;
    best_value := null;
    best_achieved_at := null;

    select
      workout_sets.id,
      workout_sets.weight_kg,
      workout_sets.reps,
      workout_sets.reps,
      coalesce(workout_sessions.completed_at, workout_sets.updated_at)
    into best_set_id, best_weight, best_reps, best_value, best_achieved_at
    from public.workout_sets
    join public.workout_exercises
      on workout_exercises.id = workout_sets.workout_exercise_id
    join public.workout_sessions
      on workout_sessions.id = workout_exercises.workout_session_id
    where workout_sessions.user_id = target_session.user_id
      and workout_sessions.status = 'completed'
      and workout_exercises.exercise_id = target_exercise_id
      and workout_sets.is_completed
      and not workout_sets.is_warmup
      and workout_sets.reps is not null
    order by workout_sets.reps desc,
             workout_sets.weight_kg desc nulls last,
             workout_sets.updated_at desc
    limit 1;

    if best_set_id is null then
      delete from public.personal_records
      where user_id = target_session.user_id
        and exercise_id = target_exercise_id
        and record_type = 'max_reps';
    else
      insert into public.personal_records (
        user_id, exercise_id, record_type, value, workout_set_id,
        achieved_at, weight_kg, reps
      ) values (
        target_session.user_id, target_exercise_id, 'max_reps', best_value,
        best_set_id, best_achieved_at, best_weight, best_reps
      )
      on conflict (user_id, exercise_id, record_type) do update
      set value = excluded.value,
          workout_set_id = excluded.workout_set_id,
          achieved_at = excluded.achieved_at,
          weight_kg = excluded.weight_kg,
          reps = excluded.reps;
    end if;

    best_set_id := null;
    best_weight := null;
    best_reps := null;
    best_value := null;
    best_achieved_at := null;

    select
      workout_sets.id,
      workout_sets.weight_kg,
      workout_sets.reps,
      workout_sets.weight_kg * workout_sets.reps,
      coalesce(workout_sessions.completed_at, workout_sets.updated_at)
    into best_set_id, best_weight, best_reps, best_value, best_achieved_at
    from public.workout_sets
    join public.workout_exercises
      on workout_exercises.id = workout_sets.workout_exercise_id
    join public.workout_sessions
      on workout_sessions.id = workout_exercises.workout_session_id
    where workout_sessions.user_id = target_session.user_id
      and workout_sessions.status = 'completed'
      and workout_exercises.exercise_id = target_exercise_id
      and workout_sets.is_completed
      and not workout_sets.is_warmup
      and workout_sets.weight_kg is not null
      and workout_sets.reps is not null
    order by (workout_sets.weight_kg * workout_sets.reps) desc,
             workout_sets.weight_kg desc,
             workout_sets.updated_at desc
    limit 1;

    if best_set_id is null then
      delete from public.personal_records
      where user_id = target_session.user_id
        and exercise_id = target_exercise_id
        and record_type = 'max_volume';
    else
      insert into public.personal_records (
        user_id, exercise_id, record_type, value, workout_set_id,
        achieved_at, weight_kg, reps
      ) values (
        target_session.user_id, target_exercise_id, 'max_volume', best_value,
        best_set_id, best_achieved_at, best_weight, best_reps
      )
      on conflict (user_id, exercise_id, record_type) do update
      set value = excluded.value,
          workout_set_id = excluded.workout_set_id,
          achieved_at = excluded.achieved_at,
          weight_kg = excluded.weight_kg,
          reps = excluded.reps;
    end if;
  end loop;
end;
$$;


ALTER FUNCTION "public"."refresh_personal_records_for_session"("target_session_id" "uuid") OWNER TO "postgres";


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
  index_value integer;
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

  for index_value in 1..7 loop
    source_snapshot := snapshots -> target_ordered_day_ids[index_value]::text;

    select id
    into target_day_id
    from public.split_days
    where owner_user_id = current_user_id
      and weekday = ordered_weekdays[index_value]
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


ALTER FUNCTION "public"."reorder_personal_split_days"("target_ordered_day_ids" "uuid"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_personal_split_to_group"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select group_id into current_group_id
  from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;

  delete from public.weekly_schedule_days
  where user_id = current_user_id
    and schedule_date >= public.training_week_start(current_date);

  delete from public.split_days
  where group_id = current_group_id and owner_user_id = current_user_id;

  perform public.ensure_personal_split();
end;
$$;


ALTER FUNCTION "public"."reset_personal_split_to_group"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."reset_week_schedule"("target_anchor_date" "date" DEFAULT CURRENT_DATE) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  week_start date := public.training_week_start(target_anchor_date);
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  delete from public.weekly_schedule_days
  where user_id = current_user_id and schedule_date between week_start and week_start + 6;
  perform public.ensure_week_schedule(target_anchor_date);
end;
$$;


ALTER FUNCTION "public"."reset_week_schedule"("target_anchor_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."seed_group_split"("target_group_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  insert into public.split_exercises (
    split_day_id, exercise_id, position,
    target_sets, target_reps_min, target_reps_max, is_personal_addition
  )
  select
    day.id,
    exercise.id,
    template.position,
    2,
    template.target_reps_min,
    template.target_reps_max,
    false
  from public.split_days day
  join (values
    ('push'::public.workout_type, 'Bench Press', 0, 6, 10),
    ('push'::public.workout_type, 'Incline Dumbbell Press', 1, 8, 12),
    ('push'::public.workout_type, 'Chest Fly', 2, 10, 15),
    ('push'::public.workout_type, 'Overhead Press', 3, 6, 10),
    ('push'::public.workout_type, 'Lateral Raise', 4, 12, 20),
    ('push'::public.workout_type, 'Triceps Pushdown', 5, 10, 15),
    ('pull'::public.workout_type, 'Lat Pulldown', 0, 8, 12),
    ('pull'::public.workout_type, 'Barbell Row', 1, 6, 10),
    ('pull'::public.workout_type, 'Seated Cable Row', 2, 8, 12),
    ('pull'::public.workout_type, 'Face Pull', 3, 12, 20),
    ('pull'::public.workout_type, 'Barbell Curl', 4, 8, 12),
    ('pull'::public.workout_type, 'Hammer Curl', 5, 10, 15),
    ('legs'::public.workout_type, 'Back Squat', 0, 6, 10),
    ('legs'::public.workout_type, 'Romanian Deadlift', 1, 6, 10),
    ('legs'::public.workout_type, 'Leg Press', 2, 8, 12),
    ('legs'::public.workout_type, 'Leg Extension', 3, 10, 15),
    ('legs'::public.workout_type, 'Leg Curl', 4, 10, 15),
    ('legs'::public.workout_type, 'Standing Calf Raise', 5, 10, 20)
  ) as template(workout_type, exercise_name, position, target_reps_min, target_reps_max)
    on template.workout_type = day.workout_type
  join public.exercises exercise
    on exercise.created_by is null and lower(exercise.name) = lower(template.exercise_name)
  where day.group_id = target_group_id
    and day.owner_user_id is null
    and not exists (
      select 1 from public.split_exercises existing
      where existing.split_day_id = day.id
    );
end;
$$;


ALTER FUNCTION "public"."seed_group_split"("target_group_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_new_member_split_version"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
begin
  select split_version into new.seen_split_version
  from public.groups
  where id = new.group_id;
  return new;
end;
$$;


ALTER FUNCTION "public"."set_new_member_split_version"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_personal_day"("target_user_id" "uuid", "target_group_id" "uuid", "target_weekday" "public"."weekday", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_day_id uuid;
begin
  update public.split_days
  set workout_type = target_workout_type,
      display_name = target_display_name,
      focus_label = target_focus_label,
      icon_key = target_icon_key,
      color_key = target_color_key,
      day_notes = ''
  where group_id = target_group_id and owner_user_id = target_user_id and weekday = target_weekday
  returning id into target_day_id;
  return target_day_id;
end;
$$;


ALTER FUNCTION "public"."set_personal_day"("target_user_id" "uuid", "target_group_id" "uuid", "target_weekday" "public"."weekday", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;


ALTER FUNCTION "public"."set_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."shares_group_with"("other_user_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
  select exists (
    select 1
    from public.group_members mine
    join public.group_members theirs on theirs.group_id = mine.group_id
    where mine.user_id = auth.uid() and theirs.user_id = other_user_id
  );
$$;


ALTER FUNCTION "public"."shares_group_with"("other_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."start_workout_from_split"("target_split_day_id" "uuid", "target_scheduled_date" "date") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  split_row public.split_days;
  session_id uuid;
  exercise_row record;
  workout_exercise_id uuid;
  existing_session_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;

  select * into split_row from public.split_days where id = target_split_day_id;
  if split_row.id is null then raise exception 'Split day not found'; end if;
  if split_row.workout_type = 'rest' then raise exception 'Cannot start a rest day'; end if;
  if not public.is_group_member(split_row.group_id) then raise exception 'Not a group member'; end if;
  if split_row.owner_user_id is not null and split_row.owner_user_id <> current_user_id then
    raise exception 'Cannot start another member''s split';
  end if;

  select id into existing_session_id
  from public.workout_sessions
  where user_id = current_user_id and status = 'in_progress'
  order by started_at desc limit 1;

  if existing_session_id is not null then return existing_session_id; end if;

  session_id := gen_random_uuid();
  insert into public.workout_sessions (
    id, client_id, user_id, group_id, split_day_id,
    scheduled_date, status, started_at
  ) values (
    session_id, gen_random_uuid(), current_user_id, split_row.group_id,
    split_row.id, target_scheduled_date, 'in_progress', timezone('utc', now())
  );

  for exercise_row in
    select * from public.split_exercises
    where split_day_id = split_row.id order by position
  loop
    workout_exercise_id := gen_random_uuid();
    insert into public.workout_exercises (
      id, workout_session_id, exercise_id, position,
      is_session_only_addition, notes
    ) values (
      workout_exercise_id, session_id, exercise_row.exercise_id,
      exercise_row.position, false, ''
    );

    insert into public.workout_sets (
      id, workout_exercise_id, set_number, is_completed
    )
    select gen_random_uuid(), workout_exercise_id, number, false
    from generate_series(1, exercise_row.target_sets) as number;
  end loop;

  return session_id;
end;
$$;


ALTER FUNCTION "public"."start_workout_from_split"("target_split_day_id" "uuid", "target_scheduled_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."training_week_start"("target_date" "date") RETURNS "date"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select target_date - (((extract(dow from target_date)::integer + 1) % 7));
$$;


ALTER FUNCTION "public"."training_week_start"("target_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_split_day_settings"("target_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text" DEFAULT ''::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  target_day public.split_days;
  normalized_name text := nullif(trim(target_display_name), '');
  normalized_focus text := nullif(trim(target_focus_label), '');
  normalized_icon text := coalesce(nullif(trim(target_icon_key), ''), 'dumbbell');
  normalized_color text := coalesce(nullif(trim(target_color_key), ''), 'indigo');
  normalized_notes text := trim(coalesce(target_day_notes, ''));
  current_week_start date := public.training_week_start(current_date);
begin
  select * into target_day from public.split_days where id = target_split_day_id;
  if target_day.id is null then raise exception 'Split day not found'; end if;

  if not (
    (target_day.owner_user_id = auth.uid() and public.is_group_member(target_day.group_id))
    or
    (target_day.owner_user_id is null and public.is_group_admin(target_day.group_id))
  ) then
    raise exception 'Not allowed to edit this split day';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 40 then
    raise exception 'Day name must be between 2 and 40 characters';
  end if;
  if normalized_focus is null or char_length(normalized_focus) not between 2 and 32 then
    raise exception 'Focus label must be between 2 and 32 characters';
  end if;
  if normalized_icon not in ('dumbbell', 'zap', 'target', 'flame', 'shield', 'heart', 'moon', 'activity') then
    raise exception 'Unsupported day icon';
  end if;
  if normalized_color not in ('indigo', 'blue', 'emerald', 'amber', 'rose', 'violet') then
    raise exception 'Unsupported day color';
  end if;
  if char_length(normalized_notes) > 240 then raise exception 'Day notes are too long'; end if;

  perform public.assert_base_schedule_has_no_three_rest_days(
    target_day.group_id,
    target_day.owner_user_id,
    target_day.id,
    target_workout_type
  );

  update public.split_days
  set workout_type = target_workout_type,
      display_name = normalized_name,
      focus_label = normalized_focus,
      icon_key = normalized_icon,
      color_key = normalized_color,
      day_notes = normalized_notes
  where id = target_split_day_id;

  -- Keep already materialized future weeks in sync unless the athlete customized
  -- that particular date.
  update public.weekly_schedule_days weekly
  set workout_type = target_workout_type,
      display_name = normalized_name,
      focus_label = normalized_focus,
      icon_key = normalized_icon,
      color_key = normalized_color,
      day_notes = normalized_notes
  where weekly.source_split_day_id = target_split_day_id
    and weekly.schedule_date >= current_week_start
    and not weekly.is_customized;
end;
$$;


ALTER FUNCTION "public"."update_split_day_settings"("target_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_week_schedule_day"("target_schedule_date" "date", "target_source_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text" DEFAULT ''::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
  source_day public.split_days;
  normalized_name text := nullif(trim(target_display_name), '');
  normalized_focus text := nullif(trim(target_focus_label), '');
  normalized_notes text := trim(coalesce(target_day_notes, ''));
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select group_id into current_group_id from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;

  -- Materialize adjacent weeks too so the two-consecutive-rest rule is checked
  -- correctly across Saturday/Friday boundaries.
  perform public.ensure_week_schedule(target_schedule_date - 7);
  perform public.ensure_week_schedule(target_schedule_date);
  perform public.ensure_week_schedule(target_schedule_date + 7);

  select * into source_day from public.split_days where id = target_source_split_day_id;
  if source_day.id is null or source_day.owner_user_id <> current_user_id or source_day.group_id <> current_group_id then
    raise exception 'Choose a workout from your own split';
  end if;

  if normalized_name is null or char_length(normalized_name) not between 2 and 40 then
    raise exception 'Day name must be between 2 and 40 characters';
  end if;
  if normalized_focus is null or char_length(normalized_focus) not between 2 and 32 then
    raise exception 'Focus label must be between 2 and 32 characters';
  end if;
  if target_icon_key not in ('dumbbell', 'zap', 'target', 'flame', 'shield', 'heart', 'moon', 'activity') then
    raise exception 'Unsupported day icon';
  end if;
  if target_color_key not in ('indigo', 'blue', 'emerald', 'amber', 'rose', 'violet') then
    raise exception 'Unsupported day color';
  end if;
  if char_length(normalized_notes) > 240 then raise exception 'Day notes are too long'; end if;

  perform public.assert_week_schedule_has_no_three_rest_days(
    current_user_id,
    target_schedule_date,
    target_workout_type
  );

  update public.weekly_schedule_days
  set source_split_day_id = target_source_split_day_id,
      workout_type = target_workout_type,
      display_name = normalized_name,
      focus_label = normalized_focus,
      icon_key = target_icon_key,
      color_key = target_color_key,
      day_notes = normalized_notes,
      is_customized = true
  where user_id = current_user_id and schedule_date = target_schedule_date;
end;
$$;


ALTER FUNCTION "public"."update_week_schedule_day"("target_schedule_date" "date", "target_source_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."validate_personal_split_owner"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO 'public'
    AS $$
begin
  if new.owner_user_id is not null and not exists (
    select 1 from public.group_members
    where group_id = new.group_id and user_id = new.owner_user_id
  ) then
    raise exception 'Personal split owner must be a member of the group';
  end if;
  return new;
end;
$$;


ALTER FUNCTION "public"."validate_personal_split_owner"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."weekday_from_index"("target_index" integer) RETURNS "public"."weekday"
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select case ((target_index % 7) + 7) % 7
    when 0 then 'saturday'::public.weekday
    when 1 then 'sunday'::public.weekday
    when 2 then 'monday'::public.weekday
    when 3 then 'tuesday'::public.weekday
    when 4 then 'wednesday'::public.weekday
    when 5 then 'thursday'::public.weekday
    when 6 then 'friday'::public.weekday
  end;
$$;


ALTER FUNCTION "public"."weekday_from_index"("target_index" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."weekday_index"("target_weekday" "public"."weekday") RETURNS integer
    LANGUAGE "sql" IMMUTABLE
    SET "search_path" TO 'public'
    AS $$
  select case target_weekday
    when 'saturday' then 0
    when 'sunday' then 1
    when 'monday' then 2
    when 'tuesday' then 3
    when 'wednesday' then 4
    when 'thursday' then 5
    when 'friday' then 6
  end;
$$;


ALTER FUNCTION "public"."weekday_index"("target_weekday" "public"."weekday") OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "primary_muscle" "public"."muscle_group" NOT NULL,
    "secondary_muscles" "public"."muscle_group"[] DEFAULT '{}'::"public"."muscle_group"[] NOT NULL,
    "workout_type" "public"."workout_type" NOT NULL,
    "is_custom" boolean DEFAULT false NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "exercises_custom_owner_consistency" CHECK ((("is_custom" AND ("created_by" IS NOT NULL)) OR ((NOT "is_custom") AND ("created_by" IS NULL)))),
    CONSTRAINT "exercises_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "name")) <= 100))),
    CONSTRAINT "exercises_workout_type_check" CHECK (("workout_type" <> 'rest'::"public"."workout_type"))
);


ALTER TABLE "public"."exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_activity" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "activity_type" "public"."group_activity_type" NOT NULL,
    "message" "text" DEFAULT ''::"text" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL
);


ALTER TABLE "public"."group_activity" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."group_members" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "role" "public"."group_role" DEFAULT 'member'::"public"."group_role" NOT NULL,
    "joined_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "seen_split_version" integer DEFAULT 1 NOT NULL
);


ALTER TABLE "public"."group_members" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."personal_records" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "record_type" "public"."personal_record_type" NOT NULL,
    "value" numeric(12,2) NOT NULL,
    "workout_set_id" "uuid" NOT NULL,
    "achieved_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "weight_kg" numeric(8,2),
    "reps" integer,
    CONSTRAINT "personal_records_value_check" CHECK (("value" >= (0)::numeric))
);


ALTER TABLE "public"."personal_records" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "id" "uuid" NOT NULL,
    "display_name" "text" NOT NULL,
    "avatar_url" "text",
    "additional_rest_days" "public"."weekday"[] DEFAULT '{}'::"public"."weekday"[] NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "share_workout_summary" boolean DEFAULT true NOT NULL,
    "share_personal_records" boolean DEFAULT true NOT NULL,
    "share_weights" boolean DEFAULT false NOT NULL,
    "split_setup_method" "text",
    "split_setup_completed_at" timestamp with time zone,
    CONSTRAINT "profiles_display_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "display_name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "display_name")) <= 60))),
    CONSTRAINT "profiles_split_setup_method_check" CHECK ((("split_setup_method" IS NULL) OR ("split_setup_method" = ANY (ARRAY['manual'::"text", 'starter'::"text", 'imported'::"text"]))))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


COMMENT ON COLUMN "public"."profiles"."additional_rest_days" IS 'Deprecated compatibility field. Rest days are stored as split_days.workout_type = rest.';



CREATE TABLE IF NOT EXISTS "public"."split_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "group_id" "uuid" NOT NULL,
    "owner_user_id" "uuid",
    "weekday" "public"."weekday" NOT NULL,
    "workout_type" "public"."workout_type" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "display_name" "text",
    "focus_label" "text",
    "icon_key" "text" DEFAULT 'dumbbell'::"text" NOT NULL,
    "color_key" "text" DEFAULT 'indigo'::"text" NOT NULL,
    "day_notes" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "split_days_color_key_check" CHECK (("color_key" = ANY (ARRAY['indigo'::"text", 'blue'::"text", 'emerald'::"text", 'amber'::"text", 'rose'::"text", 'violet'::"text"]))),
    CONSTRAINT "split_days_display_name_length" CHECK ((("display_name" IS NULL) OR (("char_length"(TRIM(BOTH FROM "display_name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "display_name")) <= 40)))),
    CONSTRAINT "split_days_focus_label_length" CHECK ((("focus_label" IS NULL) OR (("char_length"(TRIM(BOTH FROM "focus_label")) >= 2) AND ("char_length"(TRIM(BOTH FROM "focus_label")) <= 32)))),
    CONSTRAINT "split_days_icon_key_check" CHECK (("icon_key" = ANY (ARRAY['dumbbell'::"text", 'zap'::"text", 'target'::"text", 'flame'::"text", 'shield'::"text", 'heart'::"text", 'moon'::"text", 'activity'::"text"]))),
    CONSTRAINT "split_days_notes_length" CHECK (("char_length"("day_notes") <= 240))
);


ALTER TABLE "public"."split_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."split_exercises" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "split_day_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "target_sets" integer NOT NULL,
    "target_reps_min" integer NOT NULL,
    "target_reps_max" integer NOT NULL,
    "is_personal_addition" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "split_exercises_check" CHECK ((("target_reps_max" >= "target_reps_min") AND ("target_reps_max" <= 100))),
    CONSTRAINT "split_exercises_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "split_exercises_target_reps_min_check" CHECK ((("target_reps_min" >= 1) AND ("target_reps_min" <= 100))),
    CONSTRAINT "split_exercises_target_sets_check" CHECK ((("target_sets" >= 1) AND ("target_sets" <= 20)))
);


ALTER TABLE "public"."split_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."weekly_schedule_days" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "schedule_date" "date" NOT NULL,
    "source_split_day_id" "uuid",
    "workout_type" "public"."workout_type" NOT NULL,
    "display_name" "text" NOT NULL,
    "focus_label" "text" NOT NULL,
    "icon_key" "text" DEFAULT 'dumbbell'::"text" NOT NULL,
    "color_key" "text" DEFAULT 'indigo'::"text" NOT NULL,
    "day_notes" "text" DEFAULT ''::"text" NOT NULL,
    "is_customized" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "weekly_schedule_days_color_key_check" CHECK (("color_key" = ANY (ARRAY['indigo'::"text", 'blue'::"text", 'emerald'::"text", 'amber'::"text", 'rose'::"text", 'violet'::"text"]))),
    CONSTRAINT "weekly_schedule_days_day_notes_check" CHECK (("char_length"("day_notes") <= 240)),
    CONSTRAINT "weekly_schedule_days_display_name_check" CHECK ((("char_length"(TRIM(BOTH FROM "display_name")) >= 2) AND ("char_length"(TRIM(BOTH FROM "display_name")) <= 40))),
    CONSTRAINT "weekly_schedule_days_focus_label_check" CHECK ((("char_length"(TRIM(BOTH FROM "focus_label")) >= 2) AND ("char_length"(TRIM(BOTH FROM "focus_label")) <= 32))),
    CONSTRAINT "weekly_schedule_days_icon_key_check" CHECK (("icon_key" = ANY (ARRAY['dumbbell'::"text", 'zap'::"text", 'target'::"text", 'flame'::"text", 'shield'::"text", 'heart'::"text", 'moon'::"text", 'activity'::"text"])))
);


ALTER TABLE "public"."weekly_schedule_days" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_exercises" (
    "id" "uuid" NOT NULL,
    "workout_session_id" "uuid" NOT NULL,
    "exercise_id" "uuid" NOT NULL,
    "position" integer NOT NULL,
    "is_session_only_addition" boolean DEFAULT false NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "target_reps_min" integer DEFAULT 8 NOT NULL,
    "target_reps_max" integer DEFAULT 12 NOT NULL,
    CONSTRAINT "workout_exercises_position_check" CHECK (("position" >= 0)),
    CONSTRAINT "workout_exercises_target_reps_range_check" CHECK (((("target_reps_min" >= 1) AND ("target_reps_min" <= 1000)) AND (("target_reps_max" >= "target_reps_min") AND ("target_reps_max" <= 1000))))
);


ALTER TABLE "public"."workout_exercises" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sessions" (
    "id" "uuid" NOT NULL,
    "client_id" "uuid" NOT NULL,
    "user_id" "uuid" NOT NULL,
    "group_id" "uuid" NOT NULL,
    "split_day_id" "uuid",
    "scheduled_date" "date" NOT NULL,
    "status" "public"."workout_session_status" DEFAULT 'in_progress'::"public"."workout_session_status" NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    "duration_seconds" integer DEFAULT 0 NOT NULL,
    "started_at" timestamp with time zone NOT NULL,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    CONSTRAINT "workout_sessions_completed_at_consistency" CHECK (((("status" = 'completed'::"public"."workout_session_status") AND ("completed_at" IS NOT NULL)) OR ("status" <> 'completed'::"public"."workout_session_status"))),
    CONSTRAINT "workout_sessions_duration_seconds_check" CHECK (("duration_seconds" >= 0))
);


ALTER TABLE "public"."workout_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."workout_sets" (
    "id" "uuid" NOT NULL,
    "workout_exercise_id" "uuid" NOT NULL,
    "set_number" integer NOT NULL,
    "weight_kg" numeric(8,2),
    "reps" integer,
    "is_warmup" boolean DEFAULT false NOT NULL,
    "is_completed" boolean DEFAULT false NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "notes" "text" DEFAULT ''::"text" NOT NULL,
    CONSTRAINT "workout_sets_reps_check" CHECK ((("reps" IS NULL) OR (("reps" >= 0) AND ("reps" <= 1000)))),
    CONSTRAINT "workout_sets_set_number_check" CHECK ((("set_number" >= 1) AND ("set_number" <= 100))),
    CONSTRAINT "workout_sets_weight_kg_check" CHECK ((("weight_kg" IS NULL) OR ("weight_kg" >= (0)::numeric)))
);


ALTER TABLE "public"."workout_sets" OWNER TO "postgres";


ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_activity"
    ADD CONSTRAINT "group_activity_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_user_id_key" UNIQUE ("group_id", "user_id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_invite_code_key" UNIQUE ("invite_code");



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_user_id_exercise_id_record_type_key" UNIQUE ("user_id", "exercise_id", "record_type");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."split_days"
    ADD CONSTRAINT "split_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."split_exercises"
    ADD CONSTRAINT "split_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."split_exercises"
    ADD CONSTRAINT "split_exercises_split_day_id_exercise_id_key" UNIQUE ("split_day_id", "exercise_id");



ALTER TABLE ONLY "public"."split_exercises"
    ADD CONSTRAINT "split_exercises_split_day_id_position_key" UNIQUE ("split_day_id", "position");



ALTER TABLE ONLY "public"."weekly_schedule_days"
    ADD CONSTRAINT "weekly_schedule_days_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."weekly_schedule_days"
    ADD CONSTRAINT "weekly_schedule_days_user_id_schedule_date_key" UNIQUE ("user_id", "schedule_date");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_session_id_position_key" UNIQUE ("workout_session_id", "position");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_client_id_key" UNIQUE ("client_id");



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_workout_exercise_id_set_number_key" UNIQUE ("workout_exercise_id", "set_number");



CREATE UNIQUE INDEX "exercises_public_name_unique" ON "public"."exercises" USING "btree" ("lower"("name")) WHERE ("created_by" IS NULL);



CREATE INDEX "group_activity_group_created_idx" ON "public"."group_activity" USING "btree" ("group_id", "created_at" DESC);



CREATE UNIQUE INDEX "groups_one_personal_workspace_per_owner" ON "public"."groups" USING "btree" ("created_by") WHERE "is_personal";



CREATE UNIQUE INDEX "split_days_group_weekday_unique" ON "public"."split_days" USING "btree" ("group_id", "weekday") WHERE ("owner_user_id" IS NULL);



CREATE UNIQUE INDEX "split_days_personal_weekday_unique" ON "public"."split_days" USING "btree" ("group_id", "owner_user_id", "weekday") WHERE ("owner_user_id" IS NOT NULL);



CREATE INDEX "weekly_schedule_days_user_date_idx" ON "public"."weekly_schedule_days" USING "btree" ("user_id", "schedule_date");



CREATE UNIQUE INDEX "workout_sessions_one_active_per_user" ON "public"."workout_sessions" USING "btree" ("user_id") WHERE ("status" = 'in_progress'::"public"."workout_session_status");



CREATE INDEX "workout_sessions_user_date_idx" ON "public"."workout_sessions" USING "btree" ("user_id", "scheduled_date" DESC);



CREATE OR REPLACE TRIGGER "exercises_set_updated_at" BEFORE UPDATE ON "public"."exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "group_member_set_split_version" BEFORE INSERT ON "public"."group_members" FOR EACH ROW EXECUTE FUNCTION "public"."set_new_member_split_version"();



CREATE OR REPLACE TRIGGER "group_split_day_version_on_delete" AFTER DELETE ON "public"."split_days" FOR EACH ROW EXECUTE FUNCTION "public"."handle_group_split_day_change"();



CREATE OR REPLACE TRIGGER "group_split_day_version_on_insert" AFTER INSERT ON "public"."split_days" FOR EACH ROW EXECUTE FUNCTION "public"."handle_group_split_day_change"();



CREATE OR REPLACE TRIGGER "group_split_day_version_on_update" AFTER UPDATE OF "workout_type", "display_name" ON "public"."split_days" FOR EACH ROW WHEN ((("old"."workout_type" IS DISTINCT FROM "new"."workout_type") OR ("old"."display_name" IS DISTINCT FROM "new"."display_name"))) EXECUTE FUNCTION "public"."handle_group_split_day_change"();



CREATE OR REPLACE TRIGGER "group_split_exercise_version_on_delete" AFTER DELETE ON "public"."split_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."handle_group_split_exercise_change"();



CREATE OR REPLACE TRIGGER "group_split_exercise_version_on_insert" AFTER INSERT ON "public"."split_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."handle_group_split_exercise_change"();



CREATE OR REPLACE TRIGGER "group_split_exercise_version_on_update" AFTER UPDATE OF "exercise_id", "position", "target_sets", "target_reps_min", "target_reps_max" ON "public"."split_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."handle_group_split_exercise_change"();



CREATE OR REPLACE TRIGGER "groups_set_updated_at" BEFORE UPDATE ON "public"."groups" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "personal_record_group_activity_on_insert" AFTER INSERT ON "public"."personal_records" FOR EACH ROW EXECUTE FUNCTION "public"."log_personal_record_activity"();



CREATE OR REPLACE TRIGGER "personal_record_group_activity_on_update" AFTER UPDATE OF "value", "workout_set_id" ON "public"."personal_records" FOR EACH ROW EXECUTE FUNCTION "public"."log_personal_record_activity"();



CREATE OR REPLACE TRIGGER "profiles_set_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "split_days_set_updated_at" BEFORE UPDATE ON "public"."split_days" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "split_days_validate_owner" BEFORE INSERT OR UPDATE ON "public"."split_days" FOR EACH ROW EXECUTE FUNCTION "public"."validate_personal_split_owner"();



CREATE OR REPLACE TRIGGER "split_exercises_set_updated_at" BEFORE UPDATE ON "public"."split_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "weekly_schedule_days_set_updated_at" BEFORE UPDATE ON "public"."weekly_schedule_days" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_exercises_set_updated_at" BEFORE UPDATE ON "public"."workout_exercises" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_session_completed_on_insert" AFTER INSERT ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."log_completed_workout_activity"();



CREATE OR REPLACE TRIGGER "workout_session_completed_on_update" AFTER UPDATE OF "status" ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."log_completed_workout_activity"();



CREATE OR REPLACE TRIGGER "workout_session_personal_records_on_insert" AFTER INSERT ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_completed_session_personal_records"();



CREATE OR REPLACE TRIGGER "workout_session_personal_records_on_update" AFTER UPDATE OF "status" ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."handle_completed_session_personal_records"();



CREATE OR REPLACE TRIGGER "workout_sessions_set_updated_at" BEFORE UPDATE ON "public"."workout_sessions" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



CREATE OR REPLACE TRIGGER "workout_set_personal_records_on_delete" AFTER DELETE ON "public"."workout_sets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_completed_set_personal_records"();



CREATE OR REPLACE TRIGGER "workout_set_personal_records_on_insert" AFTER INSERT ON "public"."workout_sets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_completed_set_personal_records"();



CREATE OR REPLACE TRIGGER "workout_set_personal_records_on_update" AFTER UPDATE OF "weight_kg", "reps", "is_completed", "is_warmup" ON "public"."workout_sets" FOR EACH ROW EXECUTE FUNCTION "public"."handle_completed_set_personal_records"();



CREATE OR REPLACE TRIGGER "workout_sets_set_updated_at" BEFORE UPDATE ON "public"."workout_sets" FOR EACH ROW EXECUTE FUNCTION "public"."set_updated_at"();



ALTER TABLE ONLY "public"."exercises"
    ADD CONSTRAINT "exercises_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_activity"
    ADD CONSTRAINT "group_activity_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_activity"
    ADD CONSTRAINT "group_activity_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."group_members"
    ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."groups"
    ADD CONSTRAINT "groups_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."personal_records"
    ADD CONSTRAINT "personal_records_workout_set_id_fkey" FOREIGN KEY ("workout_set_id") REFERENCES "public"."workout_sets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_days"
    ADD CONSTRAINT "split_days_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_days"
    ADD CONSTRAINT "split_days_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."split_exercises"
    ADD CONSTRAINT "split_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."split_exercises"
    ADD CONSTRAINT "split_exercises_split_day_id_fkey" FOREIGN KEY ("split_day_id") REFERENCES "public"."split_days"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_schedule_days"
    ADD CONSTRAINT "weekly_schedule_days_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."weekly_schedule_days"
    ADD CONSTRAINT "weekly_schedule_days_source_split_day_id_fkey" FOREIGN KEY ("source_split_day_id") REFERENCES "public"."split_days"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."weekly_schedule_days"
    ADD CONSTRAINT "weekly_schedule_days_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_exercise_id_fkey" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercises"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."workout_exercises"
    ADD CONSTRAINT "workout_exercises_workout_session_id_fkey" FOREIGN KEY ("workout_session_id") REFERENCES "public"."workout_sessions"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "public"."groups"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_split_day_id_fkey" FOREIGN KEY ("split_day_id") REFERENCES "public"."split_days"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."workout_sessions"
    ADD CONSTRAINT "workout_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."workout_sets"
    ADD CONSTRAINT "workout_sets_workout_exercise_id_fkey" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercises"("id") ON DELETE CASCADE;



ALTER TABLE "public"."exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "exercises_delete_own_custom" ON "public"."exercises" FOR DELETE TO "authenticated" USING (("is_custom" AND ("created_by" = "auth"."uid"())));



CREATE POLICY "exercises_insert_own_custom" ON "public"."exercises" FOR INSERT TO "authenticated" WITH CHECK (("is_custom" AND ("created_by" = "auth"."uid"())));



CREATE POLICY "exercises_select_visible" ON "public"."exercises" FOR SELECT TO "authenticated" USING ((("created_by" IS NULL) OR ("created_by" = "auth"."uid"()) OR "public"."shares_group_with"("created_by")));



CREATE POLICY "exercises_update_own_custom" ON "public"."exercises" FOR UPDATE TO "authenticated" USING (("is_custom" AND ("created_by" = "auth"."uid"()))) WITH CHECK (("is_custom" AND ("created_by" = "auth"."uid"())));



ALTER TABLE "public"."group_activity" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_activity_select_members" ON "public"."group_activity" FOR SELECT TO "authenticated" USING ("public"."is_group_member"("group_id"));



ALTER TABLE "public"."group_members" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "group_members_delete_self_or_owner" ON "public"."group_members" FOR DELETE TO "authenticated" USING (((("user_id" = "auth"."uid"()) AND ("role" <> 'owner'::"public"."group_role")) OR ("public"."is_group_owner"("group_id") AND ("user_id" <> "auth"."uid"()) AND ("role" <> 'owner'::"public"."group_role"))));



CREATE POLICY "group_members_select_members" ON "public"."group_members" FOR SELECT TO "authenticated" USING ("public"."is_group_member"("group_id"));



CREATE POLICY "group_members_update_owner" ON "public"."group_members" FOR UPDATE TO "authenticated" USING (("public"."is_group_owner"("group_id") AND ("user_id" <> "auth"."uid"()) AND ("role" <> 'owner'::"public"."group_role"))) WITH CHECK (("public"."is_group_owner"("group_id") AND ("user_id" <> "auth"."uid"()) AND ("role" = ANY (ARRAY['admin'::"public"."group_role", 'member'::"public"."group_role"]))));



ALTER TABLE "public"."groups" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "groups_delete_owner" ON "public"."groups" FOR DELETE TO "authenticated" USING ("public"."is_group_owner"("id"));



CREATE POLICY "groups_select_members" ON "public"."groups" FOR SELECT TO "authenticated" USING ("public"."is_group_member"("id"));



CREATE POLICY "groups_update_owner" ON "public"."groups" FOR UPDATE TO "authenticated" USING ("public"."is_group_owner"("id")) WITH CHECK ("public"."is_group_owner"("id"));



ALTER TABLE "public"."personal_records" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "personal_records_owner_all" ON "public"."personal_records" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select_group_members" ON "public"."profiles" FOR SELECT TO "authenticated" USING ((("id" = "auth"."uid"()) OR "public"."shares_group_with"("id")));



CREATE POLICY "profiles_update_self" ON "public"."profiles" FOR UPDATE TO "authenticated" USING (("id" = "auth"."uid"())) WITH CHECK (("id" = "auth"."uid"()));



ALTER TABLE "public"."split_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "split_days_delete_authorized" ON "public"."split_days" FOR DELETE TO "authenticated" USING (((("owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("group_id")) OR (("owner_user_id" IS NULL) AND "public"."is_group_admin"("group_id"))));



CREATE POLICY "split_days_insert_authorized" ON "public"."split_days" FOR INSERT TO "authenticated" WITH CHECK (((("owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("group_id")) OR (("owner_user_id" IS NULL) AND "public"."is_group_admin"("group_id"))));



CREATE POLICY "split_days_select_effective" ON "public"."split_days" FOR SELECT TO "authenticated" USING (("public"."is_group_member"("group_id") AND (("owner_user_id" IS NULL) OR ("owner_user_id" = "auth"."uid"()))));



CREATE POLICY "split_days_update_authorized" ON "public"."split_days" FOR UPDATE TO "authenticated" USING (((("owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("group_id")) OR (("owner_user_id" IS NULL) AND "public"."is_group_admin"("group_id")))) WITH CHECK (((("owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("group_id")) OR (("owner_user_id" IS NULL) AND "public"."is_group_admin"("group_id"))));



ALTER TABLE "public"."split_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "split_exercises_delete_authorized" ON "public"."split_exercises" FOR DELETE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."split_days" "sd"
  WHERE (("sd"."id" = "split_exercises"."split_day_id") AND ((("sd"."owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("sd"."group_id")) OR (("sd"."owner_user_id" IS NULL) AND "public"."is_group_admin"("sd"."group_id")))))));



CREATE POLICY "split_exercises_insert_authorized" ON "public"."split_exercises" FOR INSERT TO "authenticated" WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."split_days" "sd"
  WHERE (("sd"."id" = "split_exercises"."split_day_id") AND ((("sd"."owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("sd"."group_id")) OR (("sd"."owner_user_id" IS NULL) AND "public"."is_group_admin"("sd"."group_id")))))));



CREATE POLICY "split_exercises_select_visible" ON "public"."split_exercises" FOR SELECT TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."split_days" "sd"
  WHERE (("sd"."id" = "split_exercises"."split_day_id") AND "public"."is_group_member"("sd"."group_id") AND (("sd"."owner_user_id" IS NULL) OR ("sd"."owner_user_id" = "auth"."uid"()))))));



CREATE POLICY "split_exercises_update_authorized" ON "public"."split_exercises" FOR UPDATE TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."split_days" "sd"
  WHERE (("sd"."id" = "split_exercises"."split_day_id") AND ((("sd"."owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("sd"."group_id")) OR (("sd"."owner_user_id" IS NULL) AND "public"."is_group_admin"("sd"."group_id"))))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."split_days" "sd"
  WHERE (("sd"."id" = "split_exercises"."split_day_id") AND ((("sd"."owner_user_id" = "auth"."uid"()) AND "public"."is_group_member"("sd"."group_id")) OR (("sd"."owner_user_id" IS NULL) AND "public"."is_group_admin"("sd"."group_id")))))));



ALTER TABLE "public"."weekly_schedule_days" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "weekly_schedule_days_owner_all" ON "public"."weekly_schedule_days" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_group_member"("group_id")));



ALTER TABLE "public"."workout_exercises" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_exercises_owner_all" ON "public"."workout_exercises" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions" "ws"
  WHERE (("ws"."id" = "workout_exercises"."workout_session_id") AND ("ws"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."workout_sessions" "ws"
  WHERE (("ws"."id" = "workout_exercises"."workout_session_id") AND ("ws"."user_id" = "auth"."uid"())))));



ALTER TABLE "public"."workout_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_sessions_owner_all" ON "public"."workout_sessions" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK ((("user_id" = "auth"."uid"()) AND "public"."is_group_member"("group_id")));



ALTER TABLE "public"."workout_sets" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "workout_sets_owner_all" ON "public"."workout_sets" TO "authenticated" USING ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workout_sessions" "ws" ON (("ws"."id" = "we"."workout_session_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("ws"."user_id" = "auth"."uid"()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."workout_exercises" "we"
     JOIN "public"."workout_sessions" "ws" ON (("ws"."id" = "we"."workout_session_id")))
  WHERE (("we"."id" = "workout_sets"."workout_exercise_id") AND ("ws"."user_id" = "auth"."uid"())))));



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



REVOKE ALL ON FUNCTION "public"."acknowledge_group_split_version"("target_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."acknowledge_group_split_version"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."acknowledge_group_split_version"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."acknowledge_group_split_version"("target_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."add_template_exercise"("target_split_day_id" "uuid", "target_exercise_name" "text", "target_position" integer, "target_sets" integer, "target_reps_min" integer, "target_reps_max" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."add_template_exercise"("target_split_day_id" "uuid", "target_exercise_name" "text", "target_position" integer, "target_sets" integer, "target_reps_min" integer, "target_reps_max" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."add_template_exercise"("target_split_day_id" "uuid", "target_exercise_name" "text", "target_position" integer, "target_sets" integer, "target_reps_min" integer, "target_reps_max" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_template_exercise"("target_split_day_id" "uuid", "target_exercise_name" "text", "target_position" integer, "target_sets" integer, "target_reps_min" integer, "target_reps_max" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_workout_exercise"("target_session_id" "uuid", "target_exercise_id" "uuid", "target_set_count" integer, "session_only" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."add_workout_exercise"("target_session_id" "uuid", "target_exercise_id" "uuid", "target_set_count" integer, "session_only" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_workout_exercise"("target_session_id" "uuid", "target_exercise_id" "uuid", "target_set_count" integer, "session_only" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."add_workout_set"("target_workout_exercise_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_workout_set"("target_workout_exercise_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_workout_set"("target_workout_exercise_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template_v2"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template_v2"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template_v2"() TO "service_role";



GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template_v3"() TO "anon";
GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template_v3"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_girls_strength_4_template_v3"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_imported_split"("target_plan" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_imported_split"("target_plan" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_imported_split"("target_plan" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_imported_split"("target_plan" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."apply_split_template"("target_template_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."apply_split_template"("target_template_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."apply_split_template"("target_template_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."apply_split_template"("target_template_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."array_is_unique"("values_array" "anyarray") TO "anon";
GRANT ALL ON FUNCTION "public"."array_is_unique"("values_array" "anyarray") TO "authenticated";
GRANT ALL ON FUNCTION "public"."array_is_unique"("values_array" "anyarray") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_base_schedule_has_no_three_rest_days"("target_group_id" "uuid", "target_owner_user_id" "uuid", "changed_split_day_id" "uuid", "changed_workout_type" "public"."workout_type") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") TO "anon";
GRANT ALL ON FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assert_week_schedule_has_no_three_rest_days"("target_user_id" "uuid", "changed_date" "date", "changed_workout_type" "public"."workout_type") TO "service_role";



REVOKE ALL ON FUNCTION "public"."bump_group_split_version"("target_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."bump_group_split_version"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."bump_group_split_version"("target_group_id" "uuid") TO "service_role";



GRANT ALL ON TABLE "public"."groups" TO "anon";
GRANT ALL ON TABLE "public"."groups" TO "authenticated";
GRANT ALL ON TABLE "public"."groups" TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_group_with_owner"("group_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_group_with_owner"("group_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."create_group_with_owner"("group_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_group_with_owner"("group_name" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_solo_workspace"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_solo_workspace"() TO "anon";
GRANT ALL ON FUNCTION "public"."create_solo_workspace"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_solo_workspace"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_user_group_id"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_user_group_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."current_user_group_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_user_group_id"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."delete_own_workout_session"("target_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."delete_own_workout_session"("target_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."delete_own_workout_session"("target_session_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_own_workout_session"("target_session_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_personal_split"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_personal_split"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_personal_split"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_personal_split"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."ensure_week_schedule"("target_anchor_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."ensure_week_schedule"("target_anchor_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_week_schedule"("target_anchor_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_week_schedule"("target_anchor_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_group_invite_code"() TO "anon";
GRANT ALL ON FUNCTION "public"."generate_group_invite_code"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_group_invite_code"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_daily_consistency_streak"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_daily_consistency_streak"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_daily_consistency_streak"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_daily_consistency_streak"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_group_member_weekly_stats"("target_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_group_member_weekly_stats"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_group_member_weekly_stats"("target_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_completed_session_personal_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_completed_session_personal_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_completed_session_personal_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_completed_set_personal_records"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_completed_set_personal_records"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_completed_set_personal_records"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_group_split_day_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_group_split_day_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_group_split_day_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_group_split_exercise_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_group_split_exercise_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_group_split_exercise_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_auth_user"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_group_admin"("target_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_group_admin"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_admin"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_admin"("target_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_group_member"("target_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_group_member"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_member"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_member"("target_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_group_owner"("target_group_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_group_owner"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_group_owner"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_group_owner"("target_group_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."join_group_by_invite_code"("raw_invite_code" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."join_group_by_invite_code"("raw_invite_code" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."join_group_by_invite_code"("raw_invite_code" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."join_group_by_invite_code"("raw_invite_code" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."log_completed_workout_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_completed_workout_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_completed_workout_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_personal_record_activity"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_personal_record_activity"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_personal_record_activity"() TO "service_role";



GRANT ALL ON FUNCTION "public"."move_split_exercise"("target_split_exercise_id" "uuid", "direction" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."move_split_exercise"("target_split_exercise_id" "uuid", "direction" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."move_split_exercise"("target_split_exercise_id" "uuid", "direction" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."recalculate_personal_records_for_exercise"("target_user_id" "uuid", "target_exercise_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalculate_personal_records_for_exercise"("target_user_id" "uuid", "target_exercise_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."recalculate_personal_records_for_exercise"("target_user_id" "uuid", "target_exercise_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."refresh_personal_records_for_session"("target_session_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."refresh_personal_records_for_session"("target_session_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_personal_records_for_session"("target_session_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."reorder_personal_split_days"("target_ordered_day_ids" "uuid"[]) TO "anon";
GRANT ALL ON FUNCTION "public"."reorder_personal_split_days"("target_ordered_day_ids" "uuid"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."reorder_personal_split_days"("target_ordered_day_ids" "uuid"[]) TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_personal_split_to_group"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_personal_split_to_group"() TO "anon";
GRANT ALL ON FUNCTION "public"."reset_personal_split_to_group"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_personal_split_to_group"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."reset_week_schedule"("target_anchor_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."reset_week_schedule"("target_anchor_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."reset_week_schedule"("target_anchor_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."reset_week_schedule"("target_anchor_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."seed_group_split"("target_group_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."seed_group_split"("target_group_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."seed_group_split"("target_group_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_new_member_split_version"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_new_member_split_version"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_new_member_split_version"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_personal_day"("target_user_id" "uuid", "target_group_id" "uuid", "target_weekday" "public"."weekday", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_personal_day"("target_user_id" "uuid", "target_group_id" "uuid", "target_weekday" "public"."weekday", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."set_personal_day"("target_user_id" "uuid", "target_group_id" "uuid", "target_weekday" "public"."weekday", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_personal_day"("target_user_id" "uuid", "target_group_id" "uuid", "target_weekday" "public"."weekday", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_updated_at"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."shares_group_with"("other_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."shares_group_with"("other_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."shares_group_with"("other_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."shares_group_with"("other_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."start_workout_from_split"("target_split_day_id" "uuid", "target_scheduled_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."start_workout_from_split"("target_split_day_id" "uuid", "target_scheduled_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."start_workout_from_split"("target_split_day_id" "uuid", "target_scheduled_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."training_week_start"("target_date" "date") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."training_week_start"("target_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."training_week_start"("target_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."training_week_start"("target_date" "date") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_split_day_settings"("target_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_split_day_settings"("target_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_split_day_settings"("target_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_split_day_settings"("target_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."update_week_schedule_day"("target_schedule_date" "date", "target_source_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."update_week_schedule_day"("target_schedule_date" "date", "target_source_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_week_schedule_day"("target_schedule_date" "date", "target_source_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_week_schedule_day"("target_schedule_date" "date", "target_source_split_day_id" "uuid", "target_workout_type" "public"."workout_type", "target_display_name" "text", "target_focus_label" "text", "target_icon_key" "text", "target_color_key" "text", "target_day_notes" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."validate_personal_split_owner"() TO "anon";
GRANT ALL ON FUNCTION "public"."validate_personal_split_owner"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."validate_personal_split_owner"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."weekday_from_index"("target_index" integer) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."weekday_from_index"("target_index" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."weekday_from_index"("target_index" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."weekday_from_index"("target_index" integer) TO "service_role";



REVOKE ALL ON FUNCTION "public"."weekday_index"("target_weekday" "public"."weekday") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."weekday_index"("target_weekday" "public"."weekday") TO "anon";
GRANT ALL ON FUNCTION "public"."weekday_index"("target_weekday" "public"."weekday") TO "authenticated";
GRANT ALL ON FUNCTION "public"."weekday_index"("target_weekday" "public"."weekday") TO "service_role";



GRANT ALL ON TABLE "public"."exercises" TO "anon";
GRANT ALL ON TABLE "public"."exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."exercises" TO "service_role";



GRANT ALL ON TABLE "public"."group_activity" TO "anon";
GRANT ALL ON TABLE "public"."group_activity" TO "authenticated";
GRANT ALL ON TABLE "public"."group_activity" TO "service_role";



GRANT ALL ON TABLE "public"."group_members" TO "anon";
GRANT ALL ON TABLE "public"."group_members" TO "authenticated";
GRANT ALL ON TABLE "public"."group_members" TO "service_role";



GRANT ALL ON TABLE "public"."personal_records" TO "anon";
GRANT ALL ON TABLE "public"."personal_records" TO "authenticated";
GRANT ALL ON TABLE "public"."personal_records" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."split_days" TO "anon";
GRANT ALL ON TABLE "public"."split_days" TO "authenticated";
GRANT ALL ON TABLE "public"."split_days" TO "service_role";



GRANT ALL ON TABLE "public"."split_exercises" TO "anon";
GRANT ALL ON TABLE "public"."split_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."split_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."weekly_schedule_days" TO "anon";
GRANT ALL ON TABLE "public"."weekly_schedule_days" TO "authenticated";
GRANT ALL ON TABLE "public"."weekly_schedule_days" TO "service_role";



GRANT ALL ON TABLE "public"."workout_exercises" TO "anon";
GRANT ALL ON TABLE "public"."workout_exercises" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_exercises" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sessions" TO "anon";
GRANT ALL ON TABLE "public"."workout_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."workout_sets" TO "anon";
GRANT ALL ON TABLE "public"."workout_sets" TO "authenticated";
GRANT ALL ON TABLE "public"."workout_sets" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







