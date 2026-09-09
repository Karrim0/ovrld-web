-- OVRLD v2 Phase 14: recommended Gain plan, humane week flexibility, and optional support note.

alter table public.gain_mode_profiles
  add column if not exists support_name text,
  add column if not exists support_note text;

comment on column public.gain_mode_profiles.support_name is
  'Optional display name for a private encouragement note shown inside Gain Mode.';
comment on column public.gain_mode_profiles.support_note is
  'Optional private encouragement note shown only to the profile owner.';

-- Two catalog movements used by the recommended lower-body plan.
insert into public.exercises (name, primary_muscle, secondary_muscles, workout_type, is_custom, created_by)
select 'Hip Abduction Machine', 'glutes'::public.muscle_group, array[]::public.muscle_group[], 'legs'::public.workout_type, false, null::uuid
where not exists (select 1 from public.exercises where created_by is null and lower(name) = lower('Hip Abduction Machine'));

insert into public.exercises (name, primary_muscle, secondary_muscles, workout_type, is_custom, created_by)
select 'Glute-Biased Hyperextension', 'glutes'::public.muscle_group, array['hamstrings'::public.muscle_group, 'back'::public.muscle_group], 'legs'::public.workout_type, false, null::uuid
where not exists (select 1 from public.exercises where created_by is null and lower(name) = lower('Glute-Biased Hyperextension'));

create or replace function public.apply_gain_glutes_plan() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_group_id uuid;
  sat uuid; sun uuid; mon uuid; tue uuid; wed uuid; thu uuid; fri uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select group_id into current_group_id from public.group_members where user_id = current_user_id;
  if current_group_id is null then raise exception 'User does not belong to a training workspace'; end if;

  perform public.ensure_personal_split();
  delete from public.split_exercises exercise
  using public.split_days day
  where exercise.split_day_id = day.id and day.owner_user_id = current_user_id;

  sat := public.set_personal_day(current_user_id, current_group_id, 'saturday', 'legs', 'Lower A', 'Glutes + Quads', 'activity', 'emerald');
  sun := public.set_personal_day(current_user_id, current_group_id, 'sunday', 'custom', 'Upper', 'Maintenance + Shape', 'dumbbell', 'indigo');
  mon := public.set_personal_day(current_user_id, current_group_id, 'monday', 'legs', 'Lower B', 'Glutes + Hamstrings', 'activity', 'violet');
  tue := public.set_personal_day(current_user_id, current_group_id, 'tuesday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
  wed := public.set_personal_day(current_user_id, current_group_id, 'wednesday', 'custom', 'Lower C', 'Shape + Volume', 'activity', 'amber');
  thu := public.set_personal_day(current_user_id, current_group_id, 'thursday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');
  fri := public.set_personal_day(current_user_id, current_group_id, 'friday', 'rest', 'Recovery', 'Recovery', 'moon', 'blue');

  update public.split_days set day_notes = '1–2 RIR. خدي 2–3 دقايق راحة في التمارين الأساسية. التكنيك قبل الوزن.' where id = sat;
  update public.split_days set day_notes = 'Upper maintenance: جودة الحركة أهم من زيادة volume الكتف.' where id = sun;
  update public.split_days set day_notes = 'RDL الأول. خدي راحتك بين السِتات وخلي آخر عدة نظيفة.' where id = mon;
  update public.split_days set day_notes = 'راحة فعلية: نوم وأكل وبروتين ثابتين.' where id = tue;
  update public.split_days set day_notes = 'يوم حجم متوسط؛ الهدف تكملة الأسبوع مش تدمير الاستشفاء.' where id = wed;
  update public.split_days set day_notes = 'راحة ثابتة.' where id in (thu, fri);

  -- Saturday · Lower A
  perform public.add_template_exercise(sat, 'Hip Thrust', 0, 3, 6, 8);
  perform public.add_template_exercise(sat, 'Hack Squat', 1, 3, 6, 10);
  perform public.add_template_exercise(sat, 'Contralateral Split Squat', 2, 2, 8, 10);
  perform public.add_template_exercise(sat, 'Leg Extension', 3, 2, 10, 15);
  perform public.add_template_exercise(sat, 'Hip Abduction Machine', 4, 2, 12, 20);

  -- Sunday · Upper maintenance
  perform public.add_template_exercise(sun, 'Chest Press Machine', 0, 2, 6, 10);
  perform public.add_template_exercise(sun, 'T-Bar Row', 1, 2, 6, 10);
  perform public.add_template_exercise(sun, 'Lat Pulldown', 2, 2, 8, 12);
  perform public.add_template_exercise(sun, 'Incline Chest Press Machine', 3, 2, 8, 12);
  perform public.add_template_exercise(sun, 'Rear Delt Fly', 4, 2, 12, 20);
  perform public.add_template_exercise(sun, 'Dumbbell Preacher Curl', 5, 2, 10, 15);
  perform public.add_template_exercise(sun, 'Triceps Pushdown', 6, 2, 10, 15);

  -- Monday · Lower B
  perform public.add_template_exercise(mon, 'Romanian Deadlift', 0, 3, 6, 8);
  perform public.add_template_exercise(mon, 'Lying Leg Curl', 1, 3, 8, 12);
  perform public.add_template_exercise(mon, 'Hip Thrust', 2, 2, 8, 10);
  perform public.add_template_exercise(mon, 'Contralateral Split Squat', 3, 2, 8, 12);
  perform public.add_template_exercise(mon, 'Kickback', 4, 2, 12, 20);

  -- Wednesday · Lower C + light torso
  perform public.add_template_exercise(wed, 'Leg Press', 0, 3, 8, 12);
  perform public.add_template_exercise(wed, 'Glute-Biased Hyperextension', 1, 2, 10, 15);
  perform public.add_template_exercise(wed, 'Lying Leg Curl', 2, 2, 10, 15);
  perform public.add_template_exercise(wed, 'Incline Chest Press Machine', 3, 2, 8, 12);
  perform public.add_template_exercise(wed, 'Seated Cable Row', 4, 2, 8, 12);
  perform public.add_template_exercise(wed, 'Cable Crunch', 5, 2, 10, 15);

  delete from public.weekly_schedule_days
  where user_id = current_user_id and schedule_date >= public.training_week_start(current_date);

  update public.profiles
  set split_setup_method = 'starter', split_setup_completed_at = timezone('utc', now())
  where id = current_user_id;

  update public.gain_mode_profiles
  set physique_focus = 'glutes_legs', updated_at = timezone('utc', now())
  where user_id = current_user_id;
end;
$$;

revoke all on function public.apply_gain_glutes_plan() from public;
grant execute on function public.apply_gain_glutes_plan() to authenticated;
grant execute on function public.apply_gain_glutes_plan() to service_role;

-- Real life can force extra rest. The app should warn and adapt, not hard-block the user.
create or replace function public.assert_base_schedule_has_no_three_rest_days(
  target_group_id uuid,
  target_owner_user_id uuid,
  changed_split_day_id uuid,
  changed_workout_type public.workout_type
) returns void
language plpgsql
security definer
set search_path = public
as $$ begin return; end; $$;

create or replace function public.assert_week_schedule_has_no_three_rest_days(
  target_user_id uuid,
  changed_date date,
  changed_workout_type public.workout_type
) returns void
language plpgsql
security definer
set search_path = public
as $$ begin return; end; $$;
