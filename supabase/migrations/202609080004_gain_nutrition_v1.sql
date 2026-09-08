-- OVRLD v2 Phase 8: Gain Mode daily nutrition tracking.
-- Keeps nutrition logging optional and private per user.

alter table public.gain_mode_profiles
  add column if not exists calorie_target_kcal integer
    check (calorie_target_kcal is null or calorie_target_kcal between 800 and 6000),
  add column if not exists protein_target_grams numeric(6,1)
    check (protein_target_grams is null or protein_target_grams between 20 and 400);

create table if not exists public.gain_nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  logged_on date not null default current_date,
  label text not null default '' check (char_length(label) <= 80),
  calories_kcal integer not null check (calories_kcal between 0 and 5000),
  protein_grams numeric(6,1) not null default 0 check (protein_grams between 0 and 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gain_nutrition_entries_user_date_idx
  on public.gain_nutrition_entries(user_id, logged_on desc, created_at desc);

alter table public.gain_nutrition_entries enable row level security;

create policy "users manage own gain nutrition entries"
  on public.gain_nutrition_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_gain_nutrition_entry_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gain_nutrition_entries_touch_updated_at on public.gain_nutrition_entries;
create trigger gain_nutrition_entries_touch_updated_at
before update on public.gain_nutrition_entries
for each row execute function public.touch_gain_nutrition_entry_updated_at();
