export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      exercises: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_custom: boolean
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles: Database["public"]["Enums"]["muscle_group"][]
          updated_at: string
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          name: string
          primary_muscle: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][]
          updated_at?: string
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_custom?: boolean
          name?: string
          primary_muscle?: Database["public"]["Enums"]["muscle_group"]
          secondary_muscles?: Database["public"]["Enums"]["muscle_group"][]
          updated_at?: string
          workout_type?: Database["public"]["Enums"]["workout_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exercises_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_activity: {
        Row: {
          activity_type: Database["public"]["Enums"]["group_activity_type"]
          created_at: string
          group_id: string
          id: string
          message: string
          metadata: Json
          user_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["group_activity_type"]
          created_at?: string
          group_id: string
          id?: string
          message?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["group_activity_type"]
          created_at?: string
          group_id?: string
          id?: string
          message?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_activity_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["group_role"]
          seen_split_version: number
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          seen_split_version?: number
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["group_role"]
          seen_split_version?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          is_personal: boolean
          name: string
          split_updated_at: string
          split_version: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          invite_code: string
          is_personal?: boolean
          name: string
          split_updated_at?: string
          split_version?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          invite_code?: string
          is_personal?: boolean
          name?: string
          split_updated_at?: string
          split_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "groups_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_records: {
        Row: {
          achieved_at: string
          exercise_id: string
          id: string
          record_type: Database["public"]["Enums"]["personal_record_type"]
          reps: number | null
          user_id: string
          value: number
          weight_kg: number | null
          workout_set_id: string
        }
        Insert: {
          achieved_at?: string
          exercise_id: string
          id?: string
          record_type: Database["public"]["Enums"]["personal_record_type"]
          reps?: number | null
          user_id: string
          value: number
          weight_kg?: number | null
          workout_set_id: string
        }
        Update: {
          achieved_at?: string
          exercise_id?: string
          id?: string
          record_type?: Database["public"]["Enums"]["personal_record_type"]
          reps?: number | null
          user_id?: string
          value?: number
          weight_kg?: number | null
          workout_set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_records_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_records_workout_set_id_fkey"
            columns: ["workout_set_id"]
            isOneToOne: false
            referencedRelation: "workout_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          additional_rest_days: Database["public"]["Enums"]["weekday"][]
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          share_personal_records: boolean
          share_weights: boolean
          share_workout_summary: boolean
          split_setup_completed_at: string | null
          split_setup_method: string | null
          updated_at: string
        }
        Insert: {
          additional_rest_days?: Database["public"]["Enums"]["weekday"][]
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          share_personal_records?: boolean
          share_weights?: boolean
          share_workout_summary?: boolean
          split_setup_completed_at?: string | null
          split_setup_method?: string | null
          updated_at?: string
        }
        Update: {
          additional_rest_days?: Database["public"]["Enums"]["weekday"][]
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          share_personal_records?: boolean
          share_weights?: boolean
          share_workout_summary?: boolean
          split_setup_completed_at?: string | null
          split_setup_method?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      split_days: {
        Row: {
          color_key: string
          created_at: string
          day_notes: string
          display_name: string | null
          focus_label: string | null
          group_id: string
          icon_key: string
          id: string
          owner_user_id: string | null
          updated_at: string
          weekday: Database["public"]["Enums"]["weekday"]
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Insert: {
          color_key?: string
          created_at?: string
          day_notes?: string
          display_name?: string | null
          focus_label?: string | null
          group_id: string
          icon_key?: string
          id?: string
          owner_user_id?: string | null
          updated_at?: string
          weekday: Database["public"]["Enums"]["weekday"]
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Update: {
          color_key?: string
          created_at?: string
          day_notes?: string
          display_name?: string | null
          focus_label?: string | null
          group_id?: string
          icon_key?: string
          id?: string
          owner_user_id?: string | null
          updated_at?: string
          weekday?: Database["public"]["Enums"]["weekday"]
          workout_type?: Database["public"]["Enums"]["workout_type"]
        }
        Relationships: [
          {
            foreignKeyName: "split_days_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_days_owner_user_id_fkey"
            columns: ["owner_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      split_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_personal_addition: boolean
          position: number
          split_day_id: string
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id?: string
          is_personal_addition?: boolean
          position: number
          split_day_id: string
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_personal_addition?: boolean
          position?: number
          split_day_id?: string
          target_reps_max?: number
          target_reps_min?: number
          target_sets?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_exercises_split_day_id_fkey"
            columns: ["split_day_id"]
            isOneToOne: false
            referencedRelation: "split_days"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_schedule_days: {
        Row: {
          color_key: string
          created_at: string
          day_notes: string
          display_name: string
          focus_label: string
          group_id: string
          icon_key: string
          id: string
          is_customized: boolean
          schedule_date: string
          source_split_day_id: string | null
          updated_at: string
          user_id: string
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Insert: {
          color_key?: string
          created_at?: string
          day_notes?: string
          display_name: string
          focus_label: string
          group_id: string
          icon_key?: string
          id?: string
          is_customized?: boolean
          schedule_date: string
          source_split_day_id?: string | null
          updated_at?: string
          user_id: string
          workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Update: {
          color_key?: string
          created_at?: string
          day_notes?: string
          display_name?: string
          focus_label?: string
          group_id?: string
          icon_key?: string
          id?: string
          is_customized?: boolean
          schedule_date?: string
          source_split_day_id?: string | null
          updated_at?: string
          user_id?: string
          workout_type?: Database["public"]["Enums"]["workout_type"]
        }
        Relationships: [
          {
            foreignKeyName: "weekly_schedule_days_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_schedule_days_source_split_day_id_fkey"
            columns: ["source_split_day_id"]
            isOneToOne: false
            referencedRelation: "split_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_schedule_days_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_exercises: {
        Row: {
          created_at: string
          exercise_id: string
          id: string
          is_session_only_addition: boolean
          notes: string
          position: number
          target_reps_max: number
          target_reps_min: number
          updated_at: string
          workout_session_id: string
        }
        Insert: {
          created_at?: string
          exercise_id: string
          id: string
          is_session_only_addition?: boolean
          notes?: string
          position: number
          target_reps_max?: number
          target_reps_min?: number
          updated_at?: string
          workout_session_id: string
        }
        Update: {
          created_at?: string
          exercise_id?: string
          id?: string
          is_session_only_addition?: boolean
          notes?: string
          position?: number
          target_reps_max?: number
          target_reps_min?: number
          updated_at?: string
          workout_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_exercises_workout_session_id_fkey"
            columns: ["workout_session_id"]
            isOneToOne: false
            referencedRelation: "workout_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sessions: {
        Row: {
          client_id: string
          completed_at: string | null
          created_at: string
          duration_seconds: number
          group_id: string
          id: string
          notes: string
          scheduled_date: string
          split_day_id: string | null
          started_at: string
          status: Database["public"]["Enums"]["workout_session_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          client_id: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          group_id: string
          id: string
          notes?: string
          scheduled_date: string
          split_day_id?: string | null
          started_at: string
          status?: Database["public"]["Enums"]["workout_session_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          client_id?: string
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number
          group_id?: string
          id?: string
          notes?: string
          scheduled_date?: string
          split_day_id?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["workout_session_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sessions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_split_day_id_fkey"
            columns: ["split_day_id"]
            isOneToOne: false
            referencedRelation: "split_days"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_sets: {
        Row: {
          created_at: string
          id: string
          is_completed: boolean
          is_warmup: boolean
          notes: string
          reps: number | null
          set_number: number
          updated_at: string
          weight_kg: number | null
          workout_exercise_id: string
        }
        Insert: {
          created_at?: string
          id: string
          is_completed?: boolean
          is_warmup?: boolean
          notes?: string
          reps?: number | null
          set_number: number
          updated_at?: string
          weight_kg?: number | null
          workout_exercise_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_completed?: boolean
          is_warmup?: boolean
          notes?: string
          reps?: number | null
          set_number?: number
          updated_at?: string
          weight_kg?: number | null
          workout_exercise_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_sets_workout_exercise_id_fkey"
            columns: ["workout_exercise_id"]
            isOneToOne: false
            referencedRelation: "workout_exercises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      acknowledge_group_split_version: {
        Args: { target_group_id: string }
        Returns: number
      }
      add_template_exercise: {
        Args: {
          target_exercise_name: string
          target_position: number
          target_reps_max: number
          target_reps_min: number
          target_sets: number
          target_split_day_id: string
        }
        Returns: undefined
      }
      add_workout_exercise: {
        Args: {
          session_only?: boolean
          target_exercise_id: string
          target_session_id: string
          target_set_count?: number
        }
        Returns: string
      }
      add_workout_set: {
        Args: { target_workout_exercise_id: string }
        Returns: string
      }
      apply_girls_strength_4_template: { Args: never; Returns: undefined }
      apply_girls_strength_4_template_v2: { Args: never; Returns: Json }
      apply_girls_strength_4_template_v3: { Args: never; Returns: Json }
      apply_imported_split: { Args: { target_plan: Json }; Returns: undefined }
      apply_split_template: {
        Args: { target_template_key: string }
        Returns: undefined
      }
      array_is_unique: { Args: { values_array: unknown }; Returns: boolean }
      assert_base_schedule_has_no_three_rest_days: {
        Args: {
          changed_split_day_id: string
          changed_workout_type: Database["public"]["Enums"]["workout_type"]
          target_group_id: string
          target_owner_user_id: string
        }
        Returns: undefined
      }
      assert_week_schedule_has_no_three_rest_days: {
        Args: {
          changed_date: string
          changed_workout_type: Database["public"]["Enums"]["workout_type"]
          target_user_id: string
        }
        Returns: undefined
      }
      bump_group_split_version: {
        Args: { target_group_id: string }
        Returns: number
      }
      create_group_with_owner: {
        Args: { group_name: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          is_personal: boolean
          name: string
          split_updated_at: string
          split_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      create_solo_workspace: {
        Args: never
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          is_personal: boolean
          name: string
          split_updated_at: string
          split_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_user_group_id: { Args: never; Returns: string }
      delete_own_workout_session: {
        Args: { target_session_id: string }
        Returns: undefined
      }
      ensure_personal_split: { Args: never; Returns: undefined }
      ensure_week_schedule: {
        Args: { target_anchor_date?: string }
        Returns: string
      }
      generate_group_invite_code: { Args: never; Returns: string }
      get_daily_consistency_streak: {
        Args: never
        Returns: {
          current_streak_days: number
          longest_streak_days: number
        }[]
      }
      get_group_member_weekly_stats: {
        Args: { target_group_id: string }
        Returns: {
          adherence_percent: number
          avatar_url: string
          display_name: string
          last_workout_at: string
          personal_records_count: number
          role: Database["public"]["Enums"]["group_role"]
          scheduled_this_week: number
          sessions_this_week: number
          share_personal_records: boolean
          share_weights: boolean
          share_workout_summary: boolean
          user_id: string
        }[]
      }
      is_group_admin: { Args: { target_group_id: string }; Returns: boolean }
      is_group_member: { Args: { target_group_id: string }; Returns: boolean }
      is_group_owner: { Args: { target_group_id: string }; Returns: boolean }
      join_group_by_invite_code: {
        Args: { raw_invite_code: string }
        Returns: {
          created_at: string
          created_by: string
          id: string
          invite_code: string
          is_personal: boolean
          name: string
          split_updated_at: string
          split_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "groups"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      move_split_exercise: {
        Args: { direction: number; target_split_exercise_id: string }
        Returns: undefined
      }
      recalculate_personal_records_for_exercise: {
        Args: { target_exercise_id: string; target_user_id: string }
        Returns: undefined
      }
      refresh_personal_records_for_session: {
        Args: { target_session_id: string }
        Returns: undefined
      }
      reorder_personal_split_days: {
        Args: { target_ordered_day_ids: string[] }
        Returns: undefined
      }
      reset_personal_split_to_group: { Args: never; Returns: undefined }
      reset_week_schedule: {
        Args: { target_anchor_date?: string }
        Returns: undefined
      }
      seed_group_split: {
        Args: { target_group_id: string }
        Returns: undefined
      }
      set_personal_day: {
        Args: {
          target_color_key: string
          target_display_name: string
          target_focus_label: string
          target_group_id: string
          target_icon_key: string
          target_user_id: string
          target_weekday: Database["public"]["Enums"]["weekday"]
          target_workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Returns: string
      }
      shares_group_with: { Args: { other_user_id: string }; Returns: boolean }
      start_workout_from_split: {
        Args: { target_scheduled_date: string; target_split_day_id: string }
        Returns: string
      }
      training_week_start: { Args: { target_date: string }; Returns: string }
      update_split_day_settings: {
        Args: {
          target_color_key: string
          target_day_notes?: string
          target_display_name: string
          target_focus_label: string
          target_icon_key: string
          target_split_day_id: string
          target_workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Returns: undefined
      }
      update_week_schedule_day: {
        Args: {
          target_color_key: string
          target_day_notes?: string
          target_display_name: string
          target_focus_label: string
          target_icon_key: string
          target_schedule_date: string
          target_source_split_day_id: string
          target_workout_type: Database["public"]["Enums"]["workout_type"]
        }
        Returns: undefined
      }
      weekday_from_index: {
        Args: { target_index: number }
        Returns: Database["public"]["Enums"]["weekday"]
      }
      weekday_index: {
        Args: { target_weekday: Database["public"]["Enums"]["weekday"] }
        Returns: number
      }
    }
    Enums: {
      group_activity_type:
        | "workout_completed"
        | "personal_record"
        | "joined_group"
        | "streak_milestone"
      group_role: "owner" | "admin" | "member"
      muscle_group:
        | "chest"
        | "back"
        | "shoulders"
        | "biceps"
        | "triceps"
        | "quads"
        | "hamstrings"
        | "glutes"
        | "calves"
        | "core"
      personal_record_type: "max_weight" | "max_reps" | "max_volume"
      weekday:
        | "saturday"
        | "sunday"
        | "monday"
        | "tuesday"
        | "wednesday"
        | "thursday"
        | "friday"
      workout_session_status:
        | "in_progress"
        | "completed"
        | "missed"
        | "cancelled"
      workout_type: "push" | "pull" | "legs" | "rest" | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      group_activity_type: [
        "workout_completed",
        "personal_record",
        "joined_group",
        "streak_milestone",
      ],
      group_role: ["owner", "admin", "member"],
      muscle_group: [
        "chest",
        "back",
        "shoulders",
        "biceps",
        "triceps",
        "quads",
        "hamstrings",
        "glutes",
        "calves",
        "core",
      ],
      personal_record_type: ["max_weight", "max_reps", "max_volume"],
      weekday: [
        "saturday",
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
      ],
      workout_session_status: [
        "in_progress",
        "completed",
        "missed",
        "cancelled",
      ],
      workout_type: ["push", "pull", "legs", "rest", "custom"],
    },
  },
} as const
