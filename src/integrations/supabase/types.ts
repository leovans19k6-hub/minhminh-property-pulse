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
      buildings: {
        Row: {
          archived_at: string | null
          basement_floors: number | null
          building_type: string | null
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          metadata: Json
          name: string
          project_id: string
          status: string
          total_floors: number | null
          updated_at: string
          zone_id: string | null
        }
        Insert: {
          archived_at?: string | null
          basement_floors?: number | null
          building_type?: string | null
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json
          name: string
          project_id: string
          status?: string
          total_floors?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Update: {
          archived_at?: string | null
          basement_floors?: number | null
          building_type?: string | null
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json
          name?: string
          project_id?: string
          status?: string
          total_floors?: number | null
          updated_at?: string
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "buildings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buildings_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "project_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      developers: {
        Row: {
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          status: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          status?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      floors: {
        Row: {
          building_id: string
          created_at: string
          display_order: number
          floor_code: string
          floor_name: string | null
          floor_number: number | null
          id: string
          metadata: Json
          updated_at: string
        }
        Insert: {
          building_id: string
          created_at?: string
          display_order?: number
          floor_code: string
          floor_name?: string | null
          floor_number?: number | null
          id?: string
          metadata?: Json
          updated_at?: string
        }
        Update: {
          building_id?: string
          created_at?: string
          display_order?: number
          floor_code?: string
          floor_name?: string | null
          floor_number?: number | null
          id?: string
          metadata?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "floors_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      product_types: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          metadata: Json
          name: string
          project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json
          name: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json
          name?: string
          project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_types_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          branch: string | null
          created_at: string
          department: string | null
          employee_code: string | null
          full_name: string | null
          id: string
          phone: string | null
          position: string | null
          status: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          department?: string | null
          employee_code?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          branch?: string | null
          created_at?: string
          department?: string | null
          employee_code?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          position?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      project_members: {
        Row: {
          created_at: string
          id: string
          is_primary_contact: boolean
          member_role: string
          note: string | null
          phone_override: string | null
          project_id: string
          updated_at: string
          user_id: string
          zalo_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean
          member_role: string
          note?: string | null
          phone_override?: string | null
          project_id: string
          updated_at?: string
          user_id: string
          zalo_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_primary_contact?: boolean
          member_role?: string
          note?: string | null
          phone_override?: string | null
          project_id?: string
          updated_at?: string
          user_id?: string
          zalo_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_members_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      project_zones: {
        Row: {
          archived_at: string | null
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          metadata: Json
          name: string
          parent_zone_id: string | null
          project_id: string
          status: string
          updated_at: string
          zone_type: string | null
        }
        Insert: {
          archived_at?: string | null
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json
          name: string
          parent_zone_id?: string | null
          project_id: string
          status?: string
          updated_at?: string
          zone_type?: string | null
        }
        Update: {
          archived_at?: string | null
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          metadata?: Json
          name?: string
          parent_zone_id?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          zone_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_zones_parent_zone_id_fkey"
            columns: ["parent_zone_id"]
            isOneToOne: false
            referencedRelation: "project_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_zones_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          archived_at: string | null
          code: string
          cover_url: string | null
          created_at: string
          description: string | null
          developer_id: string | null
          display_order: number
          district: string | null
          id: string
          is_featured: boolean
          location_text: string | null
          logo_url: string | null
          metadata: Json
          name: string
          project_category: string
          province: string | null
          short_description: string | null
          slug: string
          status: string
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          code: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          developer_id?: string | null
          display_order?: number
          district?: string | null
          id?: string
          is_featured?: boolean
          location_text?: string | null
          logo_url?: string | null
          metadata?: Json
          name: string
          project_category?: string
          province?: string | null
          short_description?: string | null
          slug: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          code?: string
          cover_url?: string | null
          created_at?: string
          description?: string | null
          developer_id?: string | null
          display_order?: number
          district?: string | null
          id?: string
          is_featured?: boolean
          location_text?: string | null
          logo_url?: string | null
          metadata?: Json
          name?: string
          project_category?: string
          province?: string | null
          short_description?: string | null
          slug?: string
          status?: string
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_developer_id_fkey"
            columns: ["developer_id"]
            isOneToOne: false
            referencedRelation: "developers"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
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
      has_any_role: { Args: { role_codes: string[] }; Returns: boolean }
      has_role: { Args: { role_code: string }; Returns: boolean }
      is_project_manager: { Args: { p_project_id: string }; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      normalize_phone: { Args: { phone: string }; Returns: string }
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
