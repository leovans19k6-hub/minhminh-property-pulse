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
      product_media: {
        Row: {
          alt_text: string | null
          created_at: string
          display_order: number
          file_url: string
          id: string
          is_primary: boolean
          media_type: string
          metadata: Json
          product_id: string
          thumbnail_url: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          file_url: string
          id?: string
          is_primary?: boolean
          media_type: string
          metadata?: Json
          product_id: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          display_order?: number
          file_url?: string
          id?: string
          is_primary?: boolean
          media_type?: string
          metadata?: Json
          product_id?: string
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_media_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          currency: string
          id: string
          metadata: Json
          new_amount: number
          old_amount: number | null
          price_code: string | null
          price_option_id: string | null
          product_id: string
          reason: string | null
          source: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          currency?: string
          id?: string
          metadata?: Json
          new_amount: number
          old_amount?: number | null
          price_code?: string | null
          price_option_id?: string | null
          product_id: string
          reason?: string | null
          source?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          currency?: string
          id?: string
          metadata?: Json
          new_amount?: number
          old_amount?: number | null
          price_code?: string | null
          price_option_id?: string | null
          product_id?: string
          reason?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_price_option_id_fkey"
            columns: ["price_option_id"]
            isOneToOne: false
            referencedRelation: "product_price_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_price_options: {
        Row: {
          amount: number
          created_at: string
          currency: string
          discount_amount: number | null
          discount_percent: number | null
          effective_from: string | null
          effective_to: string | null
          grace_period_months: number | null
          id: string
          is_primary: boolean
          loan_ratio: number | null
          metadata: Json
          payment_term_summary: string | null
          price_code: string
          price_name: string
          price_per_sqm: number | null
          product_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          discount_amount?: number | null
          discount_percent?: number | null
          effective_from?: string | null
          effective_to?: string | null
          grace_period_months?: number | null
          id?: string
          is_primary?: boolean
          loan_ratio?: number | null
          metadata?: Json
          payment_term_summary?: string | null
          price_code: string
          price_name: string
          price_per_sqm?: number | null
          product_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          discount_amount?: number | null
          discount_percent?: number | null
          effective_from?: string | null
          effective_to?: string | null
          grace_period_months?: number | null
          id?: string
          is_primary?: boolean
          loan_ratio?: number | null
          metadata?: Json
          payment_term_summary?: string | null
          price_code?: string
          price_name?: string
          price_per_sqm?: number | null
          product_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_price_options_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          metadata: Json
          new_status: string
          old_status: string | null
          product_id: string
          reason: string | null
          source: string | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata?: Json
          new_status: string
          old_status?: string | null
          product_id: string
          reason?: string | null
          source?: string | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          metadata?: Json
          new_status?: string
          old_status?: string | null
          product_id?: string
          reason?: string | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_status_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
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
      products: {
        Row: {
          archived_at: string | null
          balcony_direction: string | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string | null
          built_up_area: number | null
          carpet_area: number | null
          category: string
          construction_area: number | null
          construction_status: string | null
          created_at: string
          depth: number | null
          description: string | null
          direction: string | null
          door_direction: string | null
          external_code: string | null
          featured: boolean
          floor_id: string | null
          floor_number: number | null
          frontage: number | null
          handover_standard: string | null
          id: string
          inventory_source: string | null
          land_area: number | null
          legal_status: string | null
          metadata: Json
          number_of_floors: number | null
          ownership_type: string | null
          product_code: string
          product_name: string | null
          product_type_id: string | null
          project_id: string
          release_date: string | null
          status: string
          total_floor_area: number | null
          unit_type: string | null
          updated_at: string
          view_text: string | null
          zone_id: string | null
        }
        Insert: {
          archived_at?: string | null
          balcony_direction?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string | null
          built_up_area?: number | null
          carpet_area?: number | null
          category: string
          construction_area?: number | null
          construction_status?: string | null
          created_at?: string
          depth?: number | null
          description?: string | null
          direction?: string | null
          door_direction?: string | null
          external_code?: string | null
          featured?: boolean
          floor_id?: string | null
          floor_number?: number | null
          frontage?: number | null
          handover_standard?: string | null
          id?: string
          inventory_source?: string | null
          land_area?: number | null
          legal_status?: string | null
          metadata?: Json
          number_of_floors?: number | null
          ownership_type?: string | null
          product_code: string
          product_name?: string | null
          product_type_id?: string | null
          project_id: string
          release_date?: string | null
          status?: string
          total_floor_area?: number | null
          unit_type?: string | null
          updated_at?: string
          view_text?: string | null
          zone_id?: string | null
        }
        Update: {
          archived_at?: string | null
          balcony_direction?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          building_id?: string | null
          built_up_area?: number | null
          carpet_area?: number | null
          category?: string
          construction_area?: number | null
          construction_status?: string | null
          created_at?: string
          depth?: number | null
          description?: string | null
          direction?: string | null
          door_direction?: string | null
          external_code?: string | null
          featured?: boolean
          floor_id?: string | null
          floor_number?: number | null
          frontage?: number | null
          handover_standard?: string | null
          id?: string
          inventory_source?: string | null
          land_area?: number | null
          legal_status?: string | null
          metadata?: Json
          number_of_floors?: number | null
          ownership_type?: string | null
          product_code?: string
          product_name?: string | null
          product_type_id?: string | null
          project_id?: string
          release_date?: string | null
          status?: string
          total_floor_area?: number | null
          unit_type?: string | null
          updated_at?: string
          view_text?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_floor_id_fkey"
            columns: ["floor_id"]
            isOneToOne: false
            referencedRelation: "floors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "project_zones"
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
      project_documents: {
        Row: {
          archived_at: string | null
          created_at: string
          description: string | null
          display_order: number
          document_type: string
          effective_date: string | null
          file_url: string
          id: string
          is_public: boolean
          metadata: Json
          project_id: string
          status: string
          thumbnail_url: string | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          document_type: string
          effective_date?: string | null
          file_url: string
          id?: string
          is_public?: boolean
          metadata?: Json
          project_id: string
          status?: string
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          description?: string | null
          display_order?: number
          document_type?: string
          effective_date?: string | null
          file_url?: string
          id?: string
          is_public?: boolean
          metadata?: Json
          project_id?: string
          status?: string
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
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
