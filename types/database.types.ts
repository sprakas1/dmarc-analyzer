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
      imap_configs: {
        Row: {
          created_at: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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