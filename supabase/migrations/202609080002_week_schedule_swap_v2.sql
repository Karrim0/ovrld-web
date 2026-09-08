-- OVRLD v2: atomic week-day swap for the flexible mobile plan.
-- Swaps the contents of two dates without touching the repeating/base split.

create or replace function public.swap_week_schedule_days(
  first_schedule_date date,
  second_schedule_date date
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  first_day public.weekly_schedule_days%rowtype;
  second_day public.weekly_schedule_days%rowtype;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if first_schedule_date = second_schedule_date then
    return;
  end if;

  perform public.ensure_week_schedule(first_schedule_date);
  perform public.ensure_week_schedule(second_schedule_date);

  select * into first_day
  from public.weekly_schedule_days
  where user_id = current_user_id and schedule_date = first_schedule_date
  for update;

  select * into second_day
  from public.weekly_schedule_days
  where user_id = current_user_id and schedule_date = second_schedule_date
  for update;

  if first_day.id is null or second_day.id is null then
    raise exception 'Both schedule days must exist';
  end if;
  if first_day.group_id <> second_day.group_id then
    raise exception 'Schedule days must belong to the same training workspace';
  end if;

  update public.weekly_schedule_days
  set source_split_day_id = second_day.source_split_day_id,
      workout_type = second_day.workout_type,
      display_name = second_day.display_name,
      focus_label = second_day.focus_label,
      icon_key = second_day.icon_key,
      color_key = second_day.color_key,
      day_notes = second_day.day_notes,
      is_customized = true
  where id = first_day.id;

  update public.weekly_schedule_days
  set source_split_day_id = first_day.source_split_day_id,
      workout_type = first_day.workout_type,
      display_name = first_day.display_name,
      focus_label = first_day.focus_label,
      icon_key = first_day.icon_key,
      color_key = first_day.color_key,
      day_notes = first_day.day_notes,
      is_customized = true
  where id = second_day.id;

  -- Validate after both writes. Any violation raises and rolls the whole swap back.
  perform public.assert_week_schedule_has_no_three_rest_days(
    current_user_id,
    first_schedule_date,
    second_day.workout_type
  );
  perform public.assert_week_schedule_has_no_three_rest_days(
    current_user_id,
    second_schedule_date,
    first_day.workout_type
  );
end;
$$;

revoke all on function public.swap_week_schedule_days(date, date) from public;
grant execute on function public.swap_week_schedule_days(date, date) to authenticated;
