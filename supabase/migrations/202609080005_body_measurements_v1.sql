-- OVRLD v2 Phase 9: body circumference tracking for Gain Mode.
-- Extends the existing private body_measurements table; no photos in this phase.

alter table public.user_body_goals
  add column if not exists body_measurement_interval_days integer not null default 28
    check (body_measurement_interval_days between 7 and 90);

alter table public.body_measurements
  add column if not exists chest_cm numeric(6,2) check (chest_cm is null or (chest_cm > 0 and chest_cm < 400)),
  add column if not exists hips_cm numeric(6,2) check (hips_cm is null or (hips_cm > 0 and hips_cm < 400)),
  add column if not exists thigh_cm numeric(6,2) check (thigh_cm is null or (thigh_cm > 0 and thigh_cm < 250)),
  add column if not exists upper_arm_cm numeric(6,2) check (upper_arm_cm is null or (upper_arm_cm > 0 and upper_arm_cm < 150)),
  add column if not exists calf_cm numeric(6,2) check (calf_cm is null or (calf_cm > 0 and calf_cm < 150)),
  add column if not exists neck_cm numeric(6,2) check (neck_cm is null or (neck_cm > 0 and neck_cm < 150));

comment on column public.user_body_goals.body_measurement_interval_days is
  'Cadence for circumference check-ins; separate from frequent weigh-ins.';
