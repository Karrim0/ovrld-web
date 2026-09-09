-- OVRLD v2 Phase 12: make Gain Mode universal and connect it to training decisions.
-- Existing Gain Mode accounts were historically designed for women, so preserve the
-- previous calorie-estimate behavior by backfilling the equation reference as female.

alter table public.gain_mode_profiles
  add column if not exists equation_sex text;

update public.gain_mode_profiles
set equation_sex = 'female'
where equation_sex is null;

alter table public.gain_mode_profiles
  alter column equation_sex set default 'female';

alter table public.gain_mode_profiles
  alter column equation_sex set not null;

alter table public.gain_mode_profiles
  drop constraint if exists gain_mode_profiles_equation_sex_check;

alter table public.gain_mode_profiles
  add constraint gain_mode_profiles_equation_sex_check
  check (equation_sex in ('female', 'male'));

comment on column public.gain_mode_profiles.equation_sex is
  'Sex reference used only by the initial calorie estimation equation; it is not used to restrict Gain Mode eligibility.';
