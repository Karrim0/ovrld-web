-- OVRLD v2 Phase 10: Gain Mode weekly/monthly reviews + auditable calorie adjustments.
-- Adaptive changes are suggestions only; calories change only after an explicit user action.

create table if not exists public.gain_calorie_adjustments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous_target_kcal integer
    check (previous_target_kcal is null or previous_target_kcal between 800 and 6000),
  new_target_kcal integer not null
    check (new_target_kcal between 800 and 6000),
  reason text not null default '' check (char_length(reason) <= 240),
  source text not null default 'adaptive_review'
    check (source in ('adaptive_review', 'manual')),
  review_period_start date,
  review_period_end date,
  created_at timestamptz not null default now()
);

create index if not exists gain_calorie_adjustments_user_created_idx
  on public.gain_calorie_adjustments(user_id, created_at desc);

alter table public.gain_calorie_adjustments enable row level security;

create policy "users read own gain calorie adjustments"
  on public.gain_calorie_adjustments
  for select
  using (auth.uid() = user_id);

create or replace function public.apply_gain_calorie_adjustment(
  target_calorie_kcal integer,
  adjustment_reason text default '',
  adjustment_source text default 'adaptive_review',
  period_start date default null,
  period_end date default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  previous_target integer;
begin
  if current_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if target_calorie_kcal < 800 or target_calorie_kcal > 6000 then
    raise exception 'Calorie target out of range';
  end if;

  if adjustment_source not in ('adaptive_review', 'manual') then
    raise exception 'Invalid adjustment source';
  end if;

  select calorie_target_kcal
  into previous_target
  from public.gain_mode_profiles
  where user_id = current_uid
  for update;

  if not found then
    raise exception 'Gain Mode profile not found';
  end if;

  update public.gain_mode_profiles
  set calorie_target_kcal = target_calorie_kcal
  where user_id = current_uid;

  if previous_target is distinct from target_calorie_kcal then
    insert into public.gain_calorie_adjustments (
      user_id,
      previous_target_kcal,
      new_target_kcal,
      reason,
      source,
      review_period_start,
      review_period_end
    ) values (
      current_uid,
      previous_target,
      target_calorie_kcal,
      left(coalesce(adjustment_reason, ''), 240),
      adjustment_source,
      period_start,
      period_end
    );
  end if;

  return target_calorie_kcal;
end;
$$;

revoke all on function public.apply_gain_calorie_adjustment(integer, text, text, date, date) from public;
grant execute on function public.apply_gain_calorie_adjustment(integer, text, text, date, date) to authenticated;
