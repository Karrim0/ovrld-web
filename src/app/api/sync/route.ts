import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { OfflineMutation, WorkoutExercise, WorkoutSession, WorkoutSet } from "@/types";

function sessionRow(session: WorkoutSession) {
  return {
    id: session.id,
    client_id: session.clientId,
    user_id: session.userId,
    group_id: session.groupId,
    split_day_id: session.splitDayId,
    scheduled_date: session.scheduledDate,
    status: session.status,
    notes: session.notes,
    duration_seconds: session.durationSeconds,
    started_at: session.startedAt,
    completed_at: session.completedAt,
    updated_at: session.updatedAt,
  };
}

function exerciseRow(exercise: WorkoutExercise) {
  return {
    id: exercise.id,
    workout_session_id: exercise.workoutSessionId,
    exercise_id: exercise.exerciseId,
    position: exercise.order,
    is_session_only_addition: exercise.isSessionOnlyAddition,
    target_reps_min: exercise.targetRepsMin,
    target_reps_max: exercise.targetRepsMax,
    notes: exercise.notes,
  };
}

function setRow(set: WorkoutSet) {
  return {
    id: set.id,
    workout_exercise_id: set.workoutExerciseId,
    set_number: set.setNumber,
    weight_kg: set.weightKg,
    reps: set.reps,
    is_warmup: set.isWarmup,
    is_completed: set.isCompleted,
    notes: set.notes,
    created_at: set.createdAt,
    updated_at: set.updatedAt,
  };
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return NextResponse.json({ error: "لازم تسجّل دخول الأول." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { mutations?: OfflineMutation[] } | null;
  if (!body?.mutations || !Array.isArray(body.mutations) || body.mutations.length > 500) {
    return NextResponse.json({ error: "A mutations array with at most 500 items is required." }, { status: 400 });
  }

  let syncedCount = 0;
  for (const mutation of body.mutations) {
    let error: { message: string } | null = null;

    if (mutation.entity === "workoutSession") {
      if (mutation.payload.userId !== userData.user.id) {
        return NextResponse.json({ error: "Cannot sync another user's workout." }, { status: 403 });
      }
      ({ error } = await supabase.from("workout_sessions").upsert(sessionRow(mutation.payload), { onConflict: "id" }));
    } else if (mutation.entity === "workoutExercise") {
      if (mutation.operation === "delete") {
        ({ error } = await supabase.from("workout_exercises").delete().eq("id", mutation.payload.id));
      } else {
        ({ error } = await supabase.from("workout_exercises").upsert(exerciseRow(mutation.payload), { onConflict: "id" }));
      }
    } else if (mutation.operation === "delete") {
      ({ error } = await supabase.from("workout_sets").delete().eq("id", mutation.payload.id));
    } else {
      ({ error } = await supabase.from("workout_sets").upsert(setRow(mutation.payload), { onConflict: "id" }));
    }

    if (error) {
      return NextResponse.json({ error: error.message, syncedCount }, { status: 409 });
    }
    syncedCount += 1;
  }

  return NextResponse.json({ syncedCount });
}
