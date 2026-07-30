# Phase 7 — Analytics and Group Polish

This phase adds useful personal analytics and a privacy-aware social layer without turning Gym Crew into a social network.

## Personal analytics

- Front and back body map based on completed working sets.
- 7, 30, and 90 day ranges.
- Toggle between weighted working sets and training volume.
- Secondary muscles receive partial credit instead of being counted like primary muscles.
- Eight-week charts for volume, working sets, and completed sessions.
- Exercise charts for estimated 1RM, maximum load, and session volume.
- All calculations continue to use the user's personal history, including locally saved sessions that have not synced yet.

## Group experience

- Privacy-aware activity feed for completed workouts, new records, and new members.
- Weekly consistency board ranked by schedule adherence rather than lifted weight.
- Member cards with shared weekly adherence, sessions, and PR count.
- Native share support for invite codes, with clipboard fallback.
- User-controlled sharing preferences:
  - Workout summaries.
  - Personal-record announcements.
  - Actual PR values/weights.
- Group split version tracking. A shared split update never overwrites a personal plan silently.
- Members can keep their personal plan or explicitly copy the newest group split.

## Database changes

Migration `202607140006_analytics_group_polish.sql` adds:

- Sharing preferences to `profiles`.
- Split version fields to `groups` and `group_members`.
- Version bump triggers for shared split edits.
- Privacy-aware group activity triggers.
- `acknowledge_group_split_version` RPC.
- `get_group_member_weekly_stats` privacy-safe RPC.

## Privacy model

Raw workout sessions, sets, and weights remain owner-only under RLS. The group leaderboard is produced by a security-definer RPC that returns only the small summary each member allowed. The feed also filters activities against the member's current privacy settings.
