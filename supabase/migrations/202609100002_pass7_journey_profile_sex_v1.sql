-- OVRLD Finalization Pass 7: canonical sex profile field + journey foundations.
-- Raw history stays in its existing workout/body sources of truth.

alter table public.profiles
  add column if not exists sex text;

update public.profiles p
set sex = g.equation_sex
from public.gain_mode_profiles g
where g.user_id = p.id
  and p.sex is null
  and g.equation_sex in ('female', 'male');

alter table public.profiles
  drop constraint if exists profiles_sex_check,
  add constraint profiles_sex_check
    check (sex is null or sex in ('female', 'male'));

comment on column public.profiles.sex is
  'Canonical profile sex used for relevant physiology calculations and default body visualizations.';

create or replace function public.sync_profile_sex_to_gain_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.sex is not null and new.sex is distinct from old.sex then
    update public.gain_mode_profiles
    set equation_sex = new.sex
    where user_id = new.id
      and equation_sex is distinct from new.sex;
  end if;
  return new;
end;
$$;

create or replace function public.sync_gain_profile_sex_to_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.equation_sex in ('female', 'male') then
    update public.profiles
    set sex = new.equation_sex
    where id = new.user_id
      and sex is distinct from new.equation_sex;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_sync_sex_to_gain_profile on public.profiles;
create trigger profiles_sync_sex_to_gain_profile
after update of sex on public.profiles
for each row execute function public.sync_profile_sex_to_gain_profile();

drop trigger if exists gain_profile_sync_sex_to_profile on public.gain_mode_profiles;
create trigger gain_profile_sync_sex_to_profile
after insert or update of equation_sex on public.gain_mode_profiles
for each row execute function public.sync_gain_profile_sex_to_profile();
