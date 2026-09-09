-- OVRLD Finalization Pass 6: onboarding + progressive profile.
-- Keep body/weight/goal/split data in their existing sources of truth.
-- Only cross-product fitness basics that previously had no general home live on profiles.

alter table public.profiles
  add column if not exists age_years smallint,
  add column if not exists training_level text,
  add column if not exists weekly_training_days smallint;

update public.profiles p
set age_years = g.age_years
from public.gain_mode_profiles g
where g.user_id = p.id
  and p.age_years is null;

alter table public.profiles
  drop constraint if exists profiles_age_years_check,
  add constraint profiles_age_years_check
    check (age_years is null or age_years between 13 and 100);

alter table public.profiles
  drop constraint if exists profiles_training_level_check,
  add constraint profiles_training_level_check
    check (training_level is null or training_level in ('beginner', 'intermediate', 'advanced'));

alter table public.profiles
  drop constraint if exists profiles_weekly_training_days_check,
  add constraint profiles_weekly_training_days_check
    check (weekly_training_days is null or weekly_training_days between 1 and 7);

comment on column public.profiles.age_years is
  'Canonical general-profile age. gain_mode_profiles.age_years remains a compatibility mirror for the existing Gain schema.';
comment on column public.profiles.training_level is
  'Self-reported training experience used by onboarding and progressive profile.';
comment on column public.profiles.weekly_training_days is
  'User weekly training availability count; actual scheduled weekdays remain defined by the active split.';

-- The existing Gain schema still owns a required age_years column. Keep the
-- general profile age and that legacy compatibility column consistent at the
-- database boundary so Web/Mobile/direct RPC writes cannot drift apart.
create or replace function public.sync_profile_age_to_gain_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.age_years is not null and new.age_years is distinct from old.age_years then
    update public.gain_mode_profiles
    set age_years = new.age_years
    where user_id = new.id
      and age_years is distinct from new.age_years;
  end if;
  return new;
end;
$$;

create or replace function public.sync_gain_profile_age_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set age_years = new.age_years
  where id = new.user_id
    and age_years is distinct from new.age_years;
  return new;
end;
$$;

drop trigger if exists profiles_sync_age_to_gain_profile on public.profiles;
create trigger profiles_sync_age_to_gain_profile
after update of age_years on public.profiles
for each row execute function public.sync_profile_age_to_gain_profile();

drop trigger if exists gain_profile_sync_age_to_profile on public.gain_mode_profiles;
create trigger gain_profile_sync_age_to_profile
after insert or update of age_years on public.gain_mode_profiles
for each row execute function public.sync_gain_profile_age_to_profile();
