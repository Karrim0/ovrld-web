-- Fixes PostgreSQL's "column reference user_id is ambiguous" error by
-- qualifying every user_id reference and by isolating each aggregate in a
-- named CTE. RLS remains enabled; this SECURITY DEFINER function performs an
-- explicit membership check before returning any group data.

DROP FUNCTION IF EXISTS public.get_group_member_weekly_stats(uuid);

CREATE FUNCTION public.get_group_member_weekly_stats(target_group_id uuid)
RETURNS TABLE (
  user_id uuid,
  display_name text,
  avatar_url text,
  role public.group_role,
  sessions_this_week bigint,
  scheduled_this_week bigint,
  adherence_percent integer,
  personal_records_count bigint,
  last_workout_at timestamptz,
  share_workout_summary boolean,
  share_personal_records boolean,
  share_weights boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  cairo_today date := (timezone('Africa/Cairo', now()))::date;
  week_start date;
  week_end date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.group_members AS requesting_member
    WHERE requesting_member.group_id = target_group_id
      AND requesting_member.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'You are not a member of this group'
      USING ERRCODE = '42501';
  END IF;

  -- PostgreSQL DOW: Sunday=0 ... Saturday=6.
  week_start := cairo_today - ((extract(dow FROM cairo_today)::integer + 1) % 7);
  week_end := week_start + 6;

  RETURN QUERY
  WITH member_base AS (
    SELECT
      member.user_id AS member_user_id,
      member.role AS member_role,
      profile.display_name AS member_display_name,
      profile.avatar_url AS member_avatar_url,
      profile.share_workout_summary AS member_share_workout_summary,
      profile.share_personal_records AS member_share_personal_records,
      profile.share_weights AS member_share_weights
    FROM public.group_members AS member
    INNER JOIN public.profiles AS profile
      ON profile.id = member.user_id
    WHERE member.group_id = target_group_id
  ),
  scheduled AS (
    SELECT
      schedule.user_id AS scheduled_user_id,
      count(*)::bigint AS scheduled_count
    FROM public.weekly_schedule_days AS schedule
    WHERE schedule.group_id = target_group_id
      AND schedule.schedule_date BETWEEN week_start AND week_end
      AND schedule.workout_type <> 'rest'::public.workout_type
    GROUP BY schedule.user_id
  ),
  completed AS (
    SELECT
      session.user_id AS completed_user_id,
      count(*)::bigint AS completed_count
    FROM public.workout_sessions AS session
    WHERE session.group_id = target_group_id
      AND session.status = 'completed'::public.workout_session_status
      AND session.scheduled_date BETWEEN week_start AND week_end
    GROUP BY session.user_id
  ),
  records AS (
    SELECT
      record.user_id AS record_user_id,
      count(*)::bigint AS record_count
    FROM public.personal_records AS record
    WHERE (timezone('Africa/Cairo', record.achieved_at))::date
      BETWEEN week_start AND week_end
    GROUP BY record.user_id
  ),
  last_workouts AS (
    SELECT
      session.user_id AS last_workout_user_id,
      max(session.completed_at) AS latest_completed_at
    FROM public.workout_sessions AS session
    WHERE session.group_id = target_group_id
      AND session.status = 'completed'::public.workout_session_status
    GROUP BY session.user_id
  )
  SELECT
    base.member_user_id AS user_id,
    base.member_display_name AS display_name,
    base.member_avatar_url AS avatar_url,
    base.member_role AS role,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN coalesce(done.completed_count, 0)::bigint
      ELSE 0::bigint
    END AS sessions_this_week,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN coalesce(plan.scheduled_count, 0)::bigint
      ELSE 0::bigint
    END AS scheduled_this_week,
    CASE
      WHEN NOT (base.member_user_id = auth.uid() OR base.member_share_workout_summary) THEN 0
      WHEN coalesce(plan.scheduled_count, 0) = 0 THEN 0
      ELSE least(
        100,
        round(
          (coalesce(done.completed_count, 0)::numeric / plan.scheduled_count::numeric) * 100
        )::integer
      )
    END AS adherence_percent,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_personal_records
        THEN coalesce(pr.record_count, 0)::bigint
      ELSE 0::bigint
    END AS personal_records_count,
    CASE
      WHEN base.member_user_id = auth.uid() OR base.member_share_workout_summary
        THEN latest.latest_completed_at
      ELSE NULL::timestamptz
    END AS last_workout_at,
    base.member_share_workout_summary AS share_workout_summary,
    base.member_share_personal_records AS share_personal_records,
    base.member_share_weights AS share_weights
  FROM member_base AS base
  LEFT JOIN scheduled AS plan
    ON plan.scheduled_user_id = base.member_user_id
  LEFT JOIN completed AS done
    ON done.completed_user_id = base.member_user_id
  LEFT JOIN records AS pr
    ON pr.record_user_id = base.member_user_id
  LEFT JOIN last_workouts AS latest
    ON latest.last_workout_user_id = base.member_user_id
  ORDER BY
    adherence_percent DESC,
    sessions_this_week DESC,
    display_name ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_group_member_weekly_stats(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_group_member_weekly_stats(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_group_member_weekly_stats(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_member_weekly_stats(uuid) TO service_role;
