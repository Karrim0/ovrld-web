-- OVRLD v2 Phase 11: AI-assisted food logging + reusable saved meals.
-- AI estimates are always reviewed by the user before they are stored.

alter table public.gain_nutrition_entries
  add column if not exists source text not null default 'manual';

alter table public.gain_nutrition_entries
  drop constraint if exists gain_nutrition_entries_source_check;

alter table public.gain_nutrition_entries
  add constraint gain_nutrition_entries_source_check
  check (source in ('manual', 'ai', 'saved'));

create table if not exists public.gain_saved_meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  calories_kcal integer not null check (calories_kcal between 0 and 5000),
  protein_grams numeric(6,1) not null default 0 check (protein_grams between 0 and 300),
  use_count integer not null default 0 check (use_count >= 0),
  last_used_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (calories_kcal > 0 or protein_grams > 0)
);

create index if not exists gain_saved_meals_user_usage_idx
  on public.gain_saved_meals(user_id, use_count desc, last_used_at desc nulls last, created_at desc);

alter table public.gain_saved_meals enable row level security;

drop policy if exists "users manage own gain saved meals" on public.gain_saved_meals;
create policy "users manage own gain saved meals"
  on public.gain_saved_meals
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.touch_gain_saved_meal_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists gain_saved_meals_touch_updated_at on public.gain_saved_meals;
create trigger gain_saved_meals_touch_updated_at
before update on public.gain_saved_meals
for each row execute function public.touch_gain_saved_meal_updated_at();

create or replace function public.log_gain_saved_meal(
  target_saved_meal_id uuid,
  target_logged_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_uid uuid := auth.uid();
  meal_row public.gain_saved_meals%rowtype;
  created_entry_id uuid;
begin
  if current_uid is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into meal_row
  from public.gain_saved_meals
  where id = target_saved_meal_id
    and user_id = current_uid
  for update;

  if not found then
    raise exception 'Saved meal not found' using errcode = 'P0002';
  end if;

  insert into public.gain_nutrition_entries (
    user_id,
    logged_on,
    label,
    calories_kcal,
    protein_grams,
    source
  ) values (
    current_uid,
    coalesce(target_logged_on, current_date),
    meal_row.label,
    meal_row.calories_kcal,
    meal_row.protein_grams,
    'saved'
  ) returning id into created_entry_id;

  update public.gain_saved_meals
  set use_count = use_count + 1,
      last_used_at = now()
  where id = meal_row.id;

  return created_entry_id;
end;
$$;

revoke all on function public.log_gain_saved_meal(uuid, date) from public;
grant execute on function public.log_gain_saved_meal(uuid, date) to authenticated;
