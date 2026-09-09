import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import type {
  GroupActivity,
  GroupMember,
  UserProfile,
  UUID,
  WorkoutGroup,
} from "@/types";
import type { GroupMemberWithProfile } from "../types";

type GroupRow = Tables<"groups">;
type GroupMemberRow = Tables<"group_members">;
type ProfileRow = Tables<"profiles">;
type GroupActivityRow = Tables<"group_activity">;

export interface CurrentGroupMembership {
  member: GroupMember;
  group: WorkoutGroup;
}

function mapGroup(row: GroupRow): WorkoutGroup {
  return {
    id: row.id,
    name: row.name,
    inviteCode: row.invite_code,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    isPersonal: row.is_personal,
    splitVersion: row.split_version,
    splitUpdatedAt: row.split_updated_at,
  };
}

function mapMember(row: GroupMemberRow): GroupMember {
  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    role: row.role,
    joinedAt: row.joined_at,
    seenSplitVersion: row.seen_split_version,
  };
}

function mapProfile(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    ageYears: row.age_years,
    trainingLevel: row.training_level as UserProfile["trainingLevel"],
    weeklyTrainingDays: row.weekly_training_days,
    additionalRestDays: row.additional_rest_days,
    shareWorkoutSummary: row.share_workout_summary,
    sharePersonalRecords: row.share_personal_records,
    shareWeights: row.share_weights,
    splitSetupMethod: row.split_setup_method as UserProfile["splitSetupMethod"],
    splitSetupCompletedAt: row.split_setup_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapActivity(row: GroupActivityRow): GroupActivity {
  const metadata =
    row.metadata &&
    typeof row.metadata === "object" &&
    !Array.isArray(row.metadata)
      ? (row.metadata as Record<string, unknown>)
      : {};

  return {
    id: row.id,
    groupId: row.group_id,
    userId: row.user_id,
    type: row.activity_type,
    message: row.message,
    metadata,
    createdAt: row.created_at,
  };
}

export async function fetchGroupById(
  groupId: UUID,
): Promise<WorkoutGroup | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error) throw error;
  return data ? mapGroup(data) : null;
}

export async function fetchCurrentGroupMembership(
  userId: UUID,
): Promise<CurrentGroupMembership | null> {
  const supabase = createClient();
  const { data: memberRow, error: memberError } = await supabase
    .from("group_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (memberError) throw memberError;
  if (!memberRow) return null;

  const { data: groupRow, error: groupError } = await supabase
    .from("groups")
    .select("*")
    .eq("id", memberRow.group_id)
    .single();

  if (groupError) throw groupError;

  return {
    member: mapMember(memberRow),
    group: mapGroup(groupRow),
  };
}

export async function fetchGroupMembers(
  groupId: UUID,
): Promise<GroupMemberWithProfile[]> {
  const supabase = createClient();
  const { data: members, error: membersError } = await supabase
    .from("group_members")
    .select("*")
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (membersError) throw membersError;
  if (members.length === 0) return [];

  const userIds = members.map((member) => member.user_id);
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .in("id", userIds);

  if (profilesError) throw profilesError;

  const profilesById = new Map(
    profiles.map((profile) => [profile.id, mapProfile(profile)]),
  );

  return members.flatMap((member) => {
    const profile = profilesById.get(member.user_id);
    return profile ? [{ ...mapMember(member), profile }] : [];
  });
}

export async function fetchGroupActivity(
  groupId: UUID,
): Promise<GroupActivity[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_activity")
    .select("*")
    .eq("group_id", groupId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) throw error;
  return data.map(mapActivity);
}

export async function createGroup(name: string): Promise<WorkoutGroup> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("create_group_with_owner", {
    group_name: name.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("الجروب اتعمل بس بياناته مرجعتش. جرّب تاني.");
  }

  return mapGroup(data);
}

export async function joinGroupByInviteCode(
  inviteCode: string,
): Promise<WorkoutGroup> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("join_group_by_invite_code", {
    raw_invite_code: inviteCode.trim().toUpperCase(),
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("دخلت الجروب بس بياناته مرجعتش. جرّب تاني.");
  }

  return mapGroup(data);
}

export async function updateGroupMemberRole(
  memberId: UUID,
  role: "admin" | "member",
): Promise<GroupMember> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_members")
    .update({ role })
    .eq("id", memberId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapMember(data);
}

export async function removeGroupMember(memberId: UUID): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("group_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);
}

export async function updateGroupName(groupId: UUID, name: string): Promise<WorkoutGroup> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .update({ name: name.trim() })
    .eq("id", groupId)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapGroup(data);
}

export async function createSoloWorkspace(): Promise<WorkoutGroup> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("create_solo_workspace");

  if (error) throw new Error(error.message);
  if (!data) throw new Error("المساحة الشخصية اتعملت بس بياناتها مرجعتش. جرّب تاني.");
  return mapGroup(data);
}

export async function fetchGroupActivityFeed(
  groupId: UUID,
): Promise<import("../types").GroupActivityFeedItem[]> {
  const supabase = createClient();
  const [activities, members] = await Promise.all([
    fetchGroupActivity(groupId),
    fetchGroupMembers(groupId),
  ]);

  const memberByUserId = new Map(members.map((member) => [member.userId, member]));
  const exerciseIds = activities.flatMap((activity) => {
    const exerciseId = activity.metadata.exercise_id;
    return typeof exerciseId === "string" ? [exerciseId] : [];
  });

  const exerciseNames = new Map<string, string>();
  if (exerciseIds.length > 0) {
    const { data, error } = await supabase
      .from("exercises")
      .select("id, name")
      .in("id", [...new Set(exerciseIds)]);
    if (error) throw new Error(error.message);
    for (const exercise of data) exerciseNames.set(exercise.id, exercise.name);
  }

  return activities.flatMap((activity) => {
    const member = memberByUserId.get(activity.userId);
    if (!member) return [];
    if (activity.type === "workout_completed" && !member.profile.shareWorkoutSummary) return [];
    if (activity.type === "personal_record" && !member.profile.sharePersonalRecords) return [];

    const exerciseId = activity.metadata.exercise_id;
    return [{
      ...activity,
      actorName: member.profile.displayName,
      actorAvatarUrl: member.profile.avatarUrl,
      exerciseName: typeof exerciseId === "string" ? exerciseNames.get(exerciseId) ?? null : null,
      showWeights: member.profile.shareWeights,
    }];
  });
}

export async function fetchGroupMemberWeeklyStats(
  groupId: UUID,
): Promise<import("../types").GroupMemberWeeklyStats[]> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("get_group_member_weekly_stats", {
    target_group_id: groupId,
  });
  if (error) throw new Error(error.message);

  return data.map((row) => ({
    userId: row.user_id,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    role: row.role,
    sessionsThisWeek: row.sessions_this_week,
    scheduledThisWeek: row.scheduled_this_week,
    adherencePercent: row.adherence_percent,
    personalRecordsCount: row.personal_records_count,
    lastWorkoutAt: row.last_workout_at,
    shareWorkoutSummary: row.share_workout_summary,
    sharePersonalRecords: row.share_personal_records,
    shareWeights: row.share_weights,
  }));
}

export async function fetchGroupSplitSyncStatus(
  userId: UUID,
): Promise<import("../types").GroupSplitSyncStatus | null> {
  const membership = await fetchCurrentGroupMembership(userId);
  if (!membership || membership.group.isPersonal) return null;
  return {
    groupId: membership.group.id,
    groupVersion: membership.group.splitVersion,
    seenVersion: membership.member.seenSplitVersion,
    updatedAt: membership.group.splitUpdatedAt,
    hasUpdate: membership.group.splitVersion > membership.member.seenSplitVersion,
  };
}

export async function acknowledgeGroupSplitUpdate(groupId: UUID): Promise<number> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc("acknowledge_group_split_version", {
    target_group_id: groupId,
  });
  if (error) throw new Error(error.message);
  return data;
}
