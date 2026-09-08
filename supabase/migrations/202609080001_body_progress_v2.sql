-- OVRLD v2: optional body-goal and weigh-in tracking.
-- Keeps training as the core product while letting users follow weight/body progress.

create table if not exists public.user_body_goals (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  goal_type text not null default 'track_only'
    check (goal_type in ('track_only', 'gain_weight', 'lose_weight', 'maintain_weight', 'muscle_gain', 'recomposition')),
  target_weight_kg numeric(6,2),
  height_cm numeric(5,1),
  target_date date,
  weigh_in_interval_days integer not null default 7 check (weigh_in_interval_days between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  measured_at timestamptz not null default now(),
  weight_kg numeric(6,2) not null check (weight_kg > 0 and weight_kg < 1000),
  body_fat_percentage numeric(5,2) check (body_fat_percentage is null or (body_fat_percentage >= 0 and body_fat_percentage <= 100)),
  waist_cm numeric(6,2) check (waist_cm is null or waist_cm > 0),
  note text not null default '' check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists body_measurements_user_measured_idx
  on public.body_measurements (user_id, measured_at desc);

alter table public.user_body_goals enable row level security;
alter table public.body_measurements enable row level security;

create policy "users manage own body goal"
  on public.user_body_goals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users read own body measurements"
  on public.body_measurements
  for select
  using (auth.uid() = user_id);

create policy "users insert own body measurements"
  on public.body_measurements
  for insert
  with check (auth.uid() = user_id);

create policy "users update own body measurements"
  on public.body_measurements
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users delete own body measurements"
  on public.body_measurements
  for delete
  using (auth.uid() = user_id);

create or replace function public.touch_user_body_goal_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists user_body_goals_touch_updated_at on public.user_body_goals;
create trigger user_body_goals_touch_updated_at
before update on public.user_body_goals
for each row execute function public.touch_user_body_goal_updated_at();
