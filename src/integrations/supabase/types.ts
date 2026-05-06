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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ai_usage_log: {
        Row: {
          cost: number
          created_at: string
          credit_id: string | null
          id: string
          model: string | null
          session_id: string | null
          tokens_in: number | null
          tokens_out: number | null
          user_id: string
        }
        Insert: {
          cost?: number
          created_at?: string
          credit_id?: string | null
          id?: string
          model?: string | null
          session_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id: string
        }
        Update: {
          cost?: number
          created_at?: string
          credit_id?: string | null
          id?: string
          model?: string | null
          session_id?: string | null
          tokens_in?: number | null
          tokens_out?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_credit_id_fkey"
            columns: ["credit_id"]
            isOneToOne: false
            referencedRelation: "user_credits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_usage_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_name: string
          event_props: Json
          id: number
          page_path: string | null
          session_id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_name: string
          event_props?: Json
          id?: never
          page_path?: string | null
          session_id: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_name?: string
          event_props?: Json
          id?: never
          page_path?: string | null
          session_id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      coaching_sessions: {
        Row: {
          created_at: string
          id: string
          messages: Json
          related_syndrome: string | null
          related_test_result_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          related_syndrome?: string | null
          related_test_result_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          related_syndrome?: string | null
          related_test_result_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coaching_sessions_related_test_result_id_fkey"
            columns: ["related_test_result_id"]
            isOneToOne: false
            referencedRelation: "test_results"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_records: {
        Row: {
          ai_comment: string | null
          body_reaction: string[] | null
          conversation_log: Json | null
          created_at: string
          emotion_score: number
          id: string
          primary_emotion: string
          recorded_at: string
          secondary_emotions: string[] | null
          situation: string | null
          source: string
          source_conversation_id: string | null
          user_id: string
        }
        Insert: {
          ai_comment?: string | null
          body_reaction?: string[] | null
          conversation_log?: Json | null
          created_at?: string
          emotion_score: number
          id?: string
          primary_emotion: string
          recorded_at?: string
          secondary_emotions?: string[] | null
          situation?: string | null
          source?: string
          source_conversation_id?: string | null
          user_id: string
        }
        Update: {
          ai_comment?: string | null
          body_reaction?: string[] | null
          conversation_log?: Json | null
          created_at?: string
          emotion_score?: number
          id?: string
          primary_emotion?: string
          recorded_at?: string
          secondary_emotions?: string[] | null
          situation?: string | null
          source?: string
          source_conversation_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "emotion_records_source_conversation_id_fkey"
            columns: ["source_conversation_id"]
            isOneToOne: false
            referencedRelation: "coaching_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      emotion_streaks: {
        Row: {
          created_at: string
          current_streak: number
          id: string
          last_record_date: string | null
          longest_streak: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          id?: string
          last_record_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          id?: string
          last_record_date?: string | null
          longest_streak?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      emotions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          memo: string | null
          score: number
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          memo?: string | null
          score: number
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          memo?: string | null
          score?: number
          user_id?: string
        }
        Relationships: []
      }
      payment_records: {
        Row: {
          amount_krw: number
          created_at: string
          id: string
          metadata: Json
          related_subscription_id: string | null
          related_test_id: string | null
          status: string
          toss_order_id: string | null
          toss_payment_key: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_krw: number
          created_at?: string
          id?: string
          metadata?: Json
          related_subscription_id?: string | null
          related_test_id?: string | null
          status: string
          toss_order_id?: string | null
          toss_payment_key?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_krw?: number
          created_at?: string
          id?: string
          metadata?: Json
          related_subscription_id?: string | null
          related_test_id?: string | null
          status?: string
          toss_order_id?: string | null
          toss_payment_key?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_records_related_subscription_id_fkey"
            columns: ["related_subscription_id"]
            isOneToOne: false
            referencedRelation: "user_subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_records_related_test_id_fkey"
            columns: ["related_test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          failed_at: string | null
          id: string
          metadata: Json
          order_id: string
          paid_at: string | null
          product_id: string
          product_type: string
          provider: string
          provider_payment_key: string | null
          refunded_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          metadata?: Json
          order_id: string
          paid_at?: string | null
          product_id: string
          product_type: string
          provider: string
          provider_payment_key?: string | null
          refunded_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          failed_at?: string | null
          id?: string
          metadata?: Json
          order_id?: string
          paid_at?: string | null
          product_id?: string
          product_type?: string
          provider?: string
          provider_payment_key?: string | null
          refunded_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          nickname: string | null
          school_type: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id: string
          nickname?: string | null
          school_type?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          nickname?: string | null
          school_type?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          ai_credits_monthly: number
          code: string
          created_at: string
          features: Json
          id: string
          is_active: boolean
          name: string
          price_krw: number
          weekly_free_tests: number
        }
        Insert: {
          ai_credits_monthly?: number
          code: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_krw?: number
          weekly_free_tests?: number
        }
        Update: {
          ai_credits_monthly?: number
          code?: string
          created_at?: string
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_krw?: number
          weekly_free_tests?: number
        }
        Relationships: []
      }
      test_entitlements: {
        Row: {
          consumed_at: string | null
          created_at: string
          expires_at: string | null
          id: string
          source: string
          test_id: string | null
          user_id: string
        }
        Insert: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          source: string
          test_id?: string | null
          user_id: string
        }
        Update: {
          consumed_at?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          source?: string
          test_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_entitlements_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      test_results: {
        Row: {
          answers: Json
          created_at: string
          id: string
          matched_syndrome: string | null
          recommendations: Json | null
          risk_label: string
          risk_level: string
          subdomain_scores: Json
          test_id: string
          total_score: number
          user_id: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          id?: string
          matched_syndrome?: string | null
          recommendations?: Json | null
          risk_label?: string
          risk_level?: string
          subdomain_scores?: Json
          test_id: string
          total_score?: number
          user_id: string
        }
        Update: {
          answers?: Json
          created_at?: string
          id?: string
          matched_syndrome?: string | null
          recommendations?: Json | null
          risk_label?: string
          risk_level?: string
          subdomain_scores?: Json
          test_id?: string
          total_score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_results_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          category: string
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_coming_soon: boolean
          is_free: boolean
          is_integrated: boolean
          is_recommended: boolean
          name: string
          price_krw: number
          question_count: number
          questions: Json
          related_syndrome: string
          subdomains: Json
        }
        Insert: {
          category: string
          created_at?: string
          description: string
          duration_minutes?: number
          id: string
          is_coming_soon?: boolean
          is_free?: boolean
          is_integrated?: boolean
          is_recommended?: boolean
          name: string
          price_krw?: number
          question_count?: number
          questions?: Json
          related_syndrome?: string
          subdomains?: Json
        }
        Update: {
          category?: string
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_coming_soon?: boolean
          is_free?: boolean
          is_integrated?: boolean
          is_recommended?: boolean
          name?: string
          price_krw?: number
          question_count?: number
          questions?: Json
          related_syndrome?: string
          subdomains?: Json
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          created_at: string
          credits_granted: number
          credits_used: number
          id: string
          period_end: string
          period_start: string
          source: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credits_granted: number
          credits_used?: number
          id?: string
          period_end: string
          period_start: string
          source: string
          user_id: string
        }
        Update: {
          created_at?: string
          credits_granted?: number
          credits_used?: number
          id?: string
          period_end?: string
          period_start?: string
          source?: string
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          id: string
          plan_id: string
          status: string
          toss_billing_key: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end: string
          current_period_start?: string
          id?: string
          plan_id: string
          status: string
          toss_billing_key?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          id?: string
          plan_id?: string
          status?: string
          toss_billing_key?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_test_access: {
        Row: {
          expires_at: string
          granted_at: string
          id: string
          payment_id: string | null
          test_id: string
          user_id: string
        }
        Insert: {
          expires_at: string
          granted_at?: string
          id?: string
          payment_id?: string | null
          test_id: string
          user_id: string
        }
        Update: {
          expires_at?: string
          granted_at?: string
          id?: string
          payment_id?: string | null
          test_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_test_access_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      consume_ai_credit: {
        Args: { p_cost?: number }
        Returns: {
          credit_id: string
          remaining: number
          success: boolean
        }[]
      }
      has_test_access: {
        Args: { p_test_id: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
