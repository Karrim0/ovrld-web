-- OVRLD v2 Phase 6: explicit Gain Mode foundation + onboarding completion.
-- Gain Mode is an optional goal experience. Training-only users keep the generic OVRLD flow.

alter table public.profiles
  add column if not exists onboarding_completed_at timestamptz;

-- Preserve existing users when this migration lands. New profiles created afterwards start null
-- and complete onboarding after choosing Training only or Gain Mode.
update public.profiles
set onboarding_completed_at = now()
where onboarding_completed_at is null;

create table if not exists public.gain_mode_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'paused', 'completed')),
  age_years smallint not null check (age_years between 18 and 80),
  activity_level text not null default 'moderate'
    check (activity_level in ('light', 'moderate', 'high')),
  appetite_level text not null default 'average'
    check (appetite_level in ('low', 'average', 'good')),
  meal_size_difficulty boolean not null default false,
  diet_pattern text not null default 'mixed'
    check (diet_pattern in ('mixed', 'vegetarian', 'vegan', 'other')),
  nutrition_mode text not null default 'simple'
    check (nutrition_mode in ('simple', 'precision')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.gain_mode_profiles enable row level security;

create policy "users manage own gain mode profile"
  on public.gain_mode_profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_gain_mode_profile_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gain_mode_profiles_touch_updated_at on public.gain_mode_profiles;
create trigger gain_mode_profiles_touch_updated_at
before update on public.gain_mode_profiles
for each row execute function public.touch_gain_mode_profile_updated_at();
