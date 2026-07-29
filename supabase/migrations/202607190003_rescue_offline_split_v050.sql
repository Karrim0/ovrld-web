-- Gym Crew Mobile v0.5.0 rescue migration
-- Makes the Girls 4-Day preset verifiable and rebuilds the active week using
-- Cairo's local date. This wrapper is idempotent and keeps RLS untouched.

create or replace function public.apply_girls_strength_4_template_v3()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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

grant execute on function public.apply_girls_strength_4_template_v3() to authenticated;

notify pgrst, 'reload schema';
