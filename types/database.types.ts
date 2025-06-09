export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      ai_usage_tracking: {
        Row: {
          cost_usd: number
          created_at: string | null
          id: string
          model_provider: string
          operation_type: string
          tokens_used: number
          user_id: string | null
        }
        Insert: {
          cost_usd?: number
          created_at?: string | null
          id?: string
          model_provider: string
          operation_type: string
          tokens_used?: number
          user_id?: string | null
        }
        Update: {
          cost_usd?: number
          created_at?: string | null
          id?: string
          model_provider?: string
          operation_type?: string
          tokens_used?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_tracking_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_configurations: {
        Row: {
          alert_type: string
          created_at: string | null
          domain: string
          enabled: boolean | null
          id: string
          sensitivity_level: string | null
          threshold_value: number
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          alert_type: string
          created_at?: string | null
          domain: string
          enabled?: boolean | null
          id?: string
          sensitivity_level?: string | null
          threshold_value: number
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          alert_type?: string
          created_at?: string | null
          domain?: string
          enabled?: boolean | null
          id?: string
          sensitivity_level?: string | null
          threshold_value?: number
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_configurations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analysis_results: {
        Row: {
          analysis_date: string | null
          anomalies_detected: number | null
          created_at: string | null
          domain: string
          failure_rate: number | null
          health_score: number | null
          id: string
          recommendations_count: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_date?: string | null
          anomalies_detected?: number | null
          created_at?: string | null
          domain: string
          failure_rate?: number | null
          health_score?: number | null
          id?: string
          recommendations_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_date?: string | null
          anomalies_detected?: number | null
          created_at?: string | null
          domain?: string
          failure_rate?: number | null
          health_score?: number | null
          id?: string
          recommendations_count?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analysis_results_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dmarc_records: {
        Row: {
          count: number
          created_at: string | null
          disposition: string | null
          dkim_domain: string | null
          dkim_result: string | null
          dkim_selector: string | null
          envelope_from: string | null
          envelope_to: string | null
          header_from: string | null
          id: string
          report_id: string | null
          source_ip: unknown
          spf_domain: string | null
          spf_result: string | null
        }
        Insert: {
          count?: number
          created_at?: string | null
          disposition?: string | null
          dkim_domain?: string | null
          dkim_result?: string | null
          dkim_selector?: string | null
          envelope_from?: string | null
          envelope_to?: string | null
          header_from?: string | null
          id?: string
          report_id?: string | null
          source_ip: unknown
          spf_domain?: string | null
          spf_result?: string | null
        }
        Update: {
          count?: number
          created_at?: string | null
          disposition?: string | null
          dkim_domain?: string | null
          dkim_result?: string | null
          dkim_selector?: string | null
          envelope_from?: string | null
          envelope_to?: string | null
          header_from?: string | null
          id?: string
          report_id?: string | null
          source_ip?: unknown
          spf_domain?: string | null
          spf_result?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dmarc_records_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "dmarc_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      dmarc_reports: {
        Row: {
          analysis_status: string | null
          created_at: string | null
          date_range_begin: string | null
          date_range_end: string | null
          domain: string
          domain_policy: string | null
          email: string | null
          error_message: string | null
          fail_count: number | null
          id: string
          imap_config_id: string | null
          last_analyzed: string | null
          org_name: string
          pass_count: number | null
          policy_percentage: number | null
          report_id: string
          status: string | null
          subdomain_policy: string | null
          total_records: number | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          analysis_status?: string | null
          created_at?: string | null
          date_range_begin?: string | null
          date_range_end?: string | null
          domain: string
          domain_policy?: string | null
          email?: string | null
          error_message?: string | null
          fail_count?: number | null
          id?: string
          imap_config_id?: string | null
          last_analyzed?: string | null
          org_name: string
          pass_count?: number | null
          policy_percentage?: number | null
          report_id: string
          status?: string | null
          subdomain_policy?: string | null
          total_records?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          analysis_status?: string | null
          created_at?: string | null
          date_range_begin?: string | null
          date_range_end?: string | null
          domain?: string
          domain_policy?: string | null
          email?: string | null
          error_message?: string | null
          fail_count?: number | null
          id?: string
          imap_config_id?: string | null
          last_analyzed?: string | null
          org_name?: string
          pass_count?: number | null
          policy_percentage?: number | null
          report_id?: string
          status?: string | null
          subdomain_policy?: string | null
          total_records?: number | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dmarc_reports_imap_config_id_fkey"
            columns: ["imap_config_id"]
            isOneToOne: false
            referencedRelation: "imap_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dmarc_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_scores: {
        Row: {
          created_at: string | null
          dkim_score: number | null
          dmarc_score: number | null
          domain: string
          id: string
          overall_score: number | null
          score_date: string
          spf_score: number | null
          trend_direction: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          dkim_score?: number | null
          dmarc_score?: number | null
          domain: string
          id?: string
          overall_score?: number | null
          score_date?: string
          spf_score?: number | null
          trend_direction?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          dkim_score?: number | null
          dmarc_score?: number | null
          domain?: string
          id?: string
          overall_score?: number | null
          score_date?: string
          spf_score?: number | null
          trend_direction?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      imap_configs: {
        Row: {
          created_at: string | null
          encryption_key_id: string | null
          folder: string | null
          host: string
          id: string
          is_active: boolean | null
          last_polled_at: string | null
          name: string
          password_encrypted: string | null
          port: number | null
          updated_at: string | null
          use_ssl: boolean | null
          user_id: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          encryption_key_id?: string | null
          folder?: string | null
          host: string
          id?: string
          is_active?: boolean | null
          last_polled_at?: string | null
          name: string
          password_encrypted?: string | null
          port?: number | null
          updated_at?: string | null
          use_ssl?: boolean | null
          user_id?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          encryption_key_id?: string | null
          folder?: string | null
          host?: string
          id?: string
          is_active?: boolean | null
          last_polled_at?: string | null
          name?: string
          password_encrypted?: string | null
          port?: number | null
          updated_at?: string | null
          use_ssl?: boolean | null
          user_id?: string | null
          username?: string
        }
        Relationships: [
          {
            foreignKeyName: "imap_configs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          organization_name: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name?: string | null
          id: string
          organization_name?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          organization_name?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      raw_dmarc_reports: {
        Row: {
          compressed_xml: string | null
          created_at: string | null
          domain: string
          encryption_key_id: string | null
          expires_at: string
          id: string
          report_date: string
          user_id: string | null
        }
        Insert: {
          compressed_xml?: string | null
          created_at?: string | null
          domain: string
          encryption_key_id?: string | null
          expires_at?: string
          id?: string
          report_date: string
          user_id?: string | null
        }
        Update: {
          compressed_xml?: string | null
          created_at?: string | null
          domain?: string
          encryption_key_id?: string | null
          expires_at?: string
          id?: string
          report_date?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "raw_dmarc_reports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recommendations: {
        Row: {
          analysis_result_id: string | null
          created_at: string | null
          description: string
          id: string
          implementation_steps: Json
          priority: string | null
          recommendation_type: string
          status: string | null
          title: string
          updated_at: string | null
          user_action: string | null
        }
        Insert: {
          analysis_result_id?: string | null
          created_at?: string | null
          description: string
          id?: string
          implementation_steps: Json
          priority?: string | null
          recommendation_type: string
          status?: string | null
          title: string
          updated_at?: string | null
          user_action?: string | null
        }
        Update: {
          analysis_result_id?: string | null
          created_at?: string | null
          description?: string
          id?: string
          implementation_steps?: Json
          priority?: string | null
          recommendation_type?: string
          status?: string | null
          title?: string
          updated_at?: string | null
          user_action?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "recommendations_analysis_result_id_fkey"
            columns: ["analysis_result_id"]
            isOneToOne: false
            referencedRelation: "analysis_results"
            referencedColumns: ["id"]
          },
        ]
      }
      storage_preferences: {
        Row: {
          compression_enabled: boolean | null
          created_at: string | null
          id: string
          retention_days: number | null
          store_raw_xml: boolean | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          compression_enabled?: boolean | null
          created_at?: string | null
          id?: string
          retention_days?: number | null
          store_raw_xml?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          compression_enabled?: boolean | null
          created_at?: string | null
          id?: string
          retention_days?: number | null
          store_raw_xml?: boolean | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "storage_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_quotas: {
        Row: {
          created_at: string | null
          current_usage: number | null
          id: string
          monthly_token_limit: number | null
          reset_date: string | null
          tier_level: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          current_usage?: number | null
          id?: string
          monthly_token_limit?: number | null
          reset_date?: string | null
          tier_level?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          current_usage?: number | null
          id?: string
          monthly_token_limit?: number | null
          reset_date?: string | null
          tier_level?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_quotas_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      debug_auth_context: {
        Args: Record<PropertyKey, never>
        Returns: {
          current_user_id: string
          auth_role: string
          jwt_claims: Json
        }[]
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

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const 