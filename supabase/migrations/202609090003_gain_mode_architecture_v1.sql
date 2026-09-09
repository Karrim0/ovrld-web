-- OVRLD v2 Phase 13: Gain Mode architecture cleanup.
-- Store the user's physique emphasis so training-plan analysis can be goal-aware.

alter table public.gain_mode_profiles
  add column if not exists physique_focus text not null default 'balanced';

alter table public.gain_mode_profiles
  drop constraint if exists gain_mode_profiles_physique_focus_check;

alter table public.gain_mode_profiles
  add constraint gain_mode_profiles_physique_focus_check
  check (physique_focus in ('balanced', 'lower_body', 'glutes_legs'));

comment on column public.gain_mode_profiles.physique_focus is
  'Optional physique emphasis used to interpret split volume distribution inside Gain Mode. It does not change nutrition targets automatically.';
