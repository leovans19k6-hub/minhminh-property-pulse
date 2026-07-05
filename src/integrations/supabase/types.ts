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
      audit_logs: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json
          new_data: Json | null
          old_data: Json | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json
          new_data?: Json | null
          old_data?: Json | null
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
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
      crm_activities: {
        Row: {
          activity_type: string
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          lead_id: string | null
          metadata: Json
          occurred_at: string
          project_id: string | null
          registration_id: string | null
          title: string
        }
        Insert: {
          activity_type: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          project_id?: string | null
          registration_id?: string | null
          title: string
        }
        Update: {
          activity_type?: string
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          occurred_at?: string
          project_id?: string | null
          registration_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crm_activities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_activities_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          assigned_to: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          id: string
          lead_id: string | null
          metadata: Json
          priority: string
          project_id: string | null
          registration_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          priority?: string
          project_id?: string | null
          registration_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          priority?: string
          project_id?: string | null
          registration_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "crm_tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_tasks_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
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
      event_product_types: {
        Row: {
          created_at: string
          event_id: string
          product_type_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          product_type_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          product_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_product_types_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_product_types_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      event_products: {
        Row: {
          created_at: string
          event_id: string
          product_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          product_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_products_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "event_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sales_policies: {
        Row: {
          created_at: string
          event_id: string
          policy_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          policy_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          policy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sales_policies_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_sales_policies_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sales_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      event_sessions: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          ends_at: string
          event_id: string
          id: string
          location_text: string | null
          metadata: Json
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          ends_at: string
          event_id: string
          id?: string
          location_text?: string | null
          metadata?: Json
          starts_at: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          ends_at?: string
          event_id?: string
          id?: string
          location_text?: string | null
          metadata?: Json
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_sessions_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_vouchers: {
        Row: {
          created_at: string
          event_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          event_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          event_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_vouchers_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_vouchers_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          address_text: string | null
          agenda_json: Json
          applicability_scope: string
          archived_at: string | null
          attachment_url: string | null
          attachments: Json
          capacity: number | null
          contact_phone: string | null
          content: string | null
          created_at: string
          created_by: string | null
          end_at: string | null
          event_type: string
          id: string
          is_featured: boolean
          latitude: number | null
          location_name: string | null
          location_notes: string | null
          location_type: string
          longitude: number | null
          meeting_url: string | null
          metadata: Json
          per_user_limit: number
          priority: number
          project_id: string | null
          published_at: string | null
          registered_count: number
          registration_deadline: string | null
          registration_start: string | null
          site_tour_details: Json
          slug: string
          speakers_json: Json
          start_at: string | null
          status: string
          summary: string | null
          thumbnail_url: string | null
          timezone: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address_text?: string | null
          agenda_json?: Json
          applicability_scope?: string
          archived_at?: string | null
          attachment_url?: string | null
          attachments?: Json
          capacity?: number | null
          contact_phone?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          event_type: string
          id?: string
          is_featured?: boolean
          latitude?: number | null
          location_name?: string | null
          location_notes?: string | null
          location_type?: string
          longitude?: number | null
          meeting_url?: string | null
          metadata?: Json
          per_user_limit?: number
          priority?: number
          project_id?: string | null
          published_at?: string | null
          registered_count?: number
          registration_deadline?: string | null
          registration_start?: string | null
          site_tour_details?: Json
          slug: string
          speakers_json?: Json
          start_at?: string | null
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          timezone?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address_text?: string | null
          agenda_json?: Json
          applicability_scope?: string
          archived_at?: string | null
          attachment_url?: string | null
          attachments?: Json
          capacity?: number | null
          contact_phone?: string | null
          content?: string | null
          created_at?: string
          created_by?: string | null
          end_at?: string | null
          event_type?: string
          id?: string
          is_featured?: boolean
          latitude?: number | null
          location_name?: string | null
          location_notes?: string | null
          location_type?: string
          longitude?: number | null
          meeting_url?: string | null
          metadata?: Json
          per_user_limit?: number
          priority?: number
          project_id?: string | null
          published_at?: string | null
          registered_count?: number
          registration_deadline?: string | null
          registration_start?: string | null
          site_tour_details?: Json
          slug?: string
          speakers_json?: Json
          start_at?: string | null
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          timezone?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          product_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      inventory_import_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string | null
          error_summary: string | null
          failed_rows: number
          file_name: string
          file_url: string | null
          id: string
          import_type: string
          metadata: Json
          processed_rows: number
          project_id: string
          started_at: string | null
          status: string
          success_rows: number
          total_rows: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: string | null
          failed_rows?: number
          file_name: string
          file_url?: string | null
          id?: string
          import_type: string
          metadata?: Json
          processed_rows?: number
          project_id: string
          started_at?: string | null
          status?: string
          success_rows?: number
          total_rows?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          error_summary?: string | null
          failed_rows?: number
          file_name?: string
          file_url?: string | null
          id?: string
          import_type?: string
          metadata?: Json
          processed_rows?: number
          project_id?: string
          started_at?: string | null
          status?: string
          success_rows?: number
          total_rows?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_import_jobs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_import_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inventory_import_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_import_rows: {
        Row: {
          action: string | null
          created_at: string
          error_message: string | null
          id: string
          import_job_id: string
          product_code: string | null
          product_id: string | null
          raw_data: Json
          row_number: number
          status: string
        }
        Insert: {
          action?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_job_id: string
          product_code?: string | null
          product_id?: string | null
          raw_data?: Json
          row_number: number
          status?: string
        }
        Update: {
          action?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          import_job_id?: string
          product_code?: string | null
          product_id?: string | null
          raw_data?: Json
          row_number?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_import_rows_import_job_id_fkey"
            columns: ["import_job_id"]
            isOneToOne: false
            referencedRelation: "inventory_import_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "inventory_import_rows_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_template_fields: {
        Row: {
          created_at: string
          data_type: string
          display_order: number
          field_group: string | null
          field_key: string
          field_label: string
          help_text: string | null
          id: string
          is_filterable: boolean
          is_required: boolean
          is_searchable: boolean
          is_sortable: boolean
          metadata: Json
          options: Json
          placeholder: string | null
          show_in_admin_table: boolean
          show_in_form: boolean
          show_in_mobile_list: boolean
          show_in_product_detail: boolean
          template_id: string
          unit: string | null
          updated_at: string
          validation_rules: Json
        }
        Insert: {
          created_at?: string
          data_type: string
          display_order?: number
          field_group?: string | null
          field_key: string
          field_label: string
          help_text?: string | null
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          is_sortable?: boolean
          metadata?: Json
          options?: Json
          placeholder?: string | null
          show_in_admin_table?: boolean
          show_in_form?: boolean
          show_in_mobile_list?: boolean
          show_in_product_detail?: boolean
          template_id: string
          unit?: string | null
          updated_at?: string
          validation_rules?: Json
        }
        Update: {
          created_at?: string
          data_type?: string
          display_order?: number
          field_group?: string | null
          field_key?: string
          field_label?: string
          help_text?: string | null
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          is_sortable?: boolean
          metadata?: Json
          options?: Json
          placeholder?: string | null
          show_in_admin_table?: boolean
          show_in_form?: boolean
          show_in_mobile_list?: boolean
          show_in_product_detail?: boolean
          template_id?: string
          unit?: string | null
          updated_at?: string
          validation_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "inventory_template_fields_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inventory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_template_views: {
        Row: {
          code: string
          configuration: Json
          created_at: string
          display_order: number
          id: string
          name: string
          template_id: string
          updated_at: string
          view_type: string
        }
        Insert: {
          code: string
          configuration?: Json
          created_at?: string
          display_order?: number
          id?: string
          name: string
          template_id: string
          updated_at?: string
          view_type: string
        }
        Update: {
          code?: string
          configuration?: Json
          created_at?: string
          display_order?: number
          id?: string
          name?: string
          template_id?: string
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_template_views_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "inventory_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_templates: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_system: boolean
          name: string
          project_category: string | null
          source_project_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name: string
          project_category?: string | null
          source_project_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_system?: boolean
          name?: string
          project_category?: string | null
          source_project_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_templates_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inventory_templates_source_project_id_fkey"
            columns: ["source_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_view_fields: {
        Row: {
          column_label: string
          core_field_key: string | null
          created_at: string
          display_order: number
          field_definition_id: string | null
          field_source: string
          filterable: boolean
          id: string
          inventory_view_id: string
          mobile_visible: boolean
          pinned: string | null
          price_code: string | null
          searchable: boolean
          sortable: boolean
          updated_at: string
          visible: boolean
          width: number | null
        }
        Insert: {
          column_label: string
          core_field_key?: string | null
          created_at?: string
          display_order?: number
          field_definition_id?: string | null
          field_source: string
          filterable?: boolean
          id?: string
          inventory_view_id: string
          mobile_visible?: boolean
          pinned?: string | null
          price_code?: string | null
          searchable?: boolean
          sortable?: boolean
          updated_at?: string
          visible?: boolean
          width?: number | null
        }
        Update: {
          column_label?: string
          core_field_key?: string | null
          created_at?: string
          display_order?: number
          field_definition_id?: string | null
          field_source?: string
          filterable?: boolean
          id?: string
          inventory_view_id?: string
          mobile_visible?: boolean
          pinned?: string | null
          price_code?: string | null
          searchable?: boolean
          sortable?: boolean
          updated_at?: string
          visible?: boolean
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_view_fields_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "product_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_view_fields_inventory_view_id_fkey"
            columns: ["inventory_view_id"]
            isOneToOne: false
            referencedRelation: "inventory_views"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_views: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          default_sort_direction: string
          default_sort_field: string | null
          description: string | null
          id: string
          is_default: boolean
          name: string
          page_size: number
          project_id: string
          status: string
          updated_at: string
          view_type: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          default_sort_direction?: string
          default_sort_field?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name: string
          page_size?: number
          project_id: string
          status?: string
          updated_at?: string
          view_type: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          default_sort_direction?: string
          default_sort_field?: string | null
          description?: string | null
          id?: string
          is_default?: boolean
          name?: string
          page_size?: number
          project_id?: string
          status?: string
          updated_at?: string
          view_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_views_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "inventory_views_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sources: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          name: string
          status: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          name: string
          status?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          status?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          archived_at: string | null
          assigned_to: string | null
          conversion_reason: string | null
          converted_at: string | null
          converted_by: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          interested_product_id: string | null
          interested_project_id: string | null
          lost_at: string | null
          lost_by: string | null
          lost_reason: string | null
          merged_at: string | null
          merged_by: string | null
          merged_into_lead_id: string | null
          metadata: Json
          normalized_phone: string | null
          note: string | null
          phone: string
          priority: string
          source_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          assigned_to?: string | null
          conversion_reason?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          interested_product_id?: string | null
          interested_project_id?: string | null
          lost_at?: string | null
          lost_by?: string | null
          lost_reason?: string | null
          merged_at?: string | null
          merged_by?: string | null
          merged_into_lead_id?: string | null
          metadata?: Json
          normalized_phone?: string | null
          note?: string | null
          phone: string
          priority?: string
          source_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          assigned_to?: string | null
          conversion_reason?: string | null
          converted_at?: string | null
          converted_by?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          interested_product_id?: string | null
          interested_project_id?: string | null
          lost_at?: string | null
          lost_by?: string | null
          lost_reason?: string | null
          merged_at?: string | null
          merged_by?: string | null
          merged_into_lead_id?: string | null
          metadata?: Json
          normalized_phone?: string | null
          note?: string | null
          phone?: string
          priority?: string
          source_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_converted_by_fkey"
            columns: ["converted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_interested_product_id_fkey"
            columns: ["interested_product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "leads_interested_product_id_fkey"
            columns: ["interested_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_interested_project_id_fkey"
            columns: ["interested_project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "leads_interested_project_id_fkey"
            columns: ["interested_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_lost_by_fkey"
            columns: ["lost_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_merged_by_fkey"
            columns: ["merged_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_merged_into_lead_id_fkey"
            columns: ["merged_into_lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "lead_sources"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_url: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          message: string | null
          metadata: Json
          notification_type: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          notification_type: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          action_url?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          message?: string | null
          metadata?: Json
          notification_type?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_product_types: {
        Row: {
          policy_id: string
          product_type_id: string
        }
        Insert: {
          policy_id: string
          product_type_id: string
        }
        Update: {
          policy_id?: string
          product_type_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_product_types_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sales_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_product_types_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
        ]
      }
      policy_products: {
        Row: {
          policy_id: string
          product_id: string
        }
        Insert: {
          policy_id: string
          product_id: string
        }
        Update: {
          policy_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "policy_products_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sales_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "policy_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_custom_values: {
        Row: {
          created_at: string
          field_definition_id: string
          id: string
          product_id: string
          updated_at: string
          value_boolean: boolean | null
          value_date: string | null
          value_datetime: string | null
          value_decimal: number | null
          value_integer: number | null
          value_jsonb: Json | null
          value_text: string | null
        }
        Insert: {
          created_at?: string
          field_definition_id: string
          id?: string
          product_id: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_datetime?: string | null
          value_decimal?: number | null
          value_integer?: number | null
          value_jsonb?: Json | null
          value_text?: string | null
        }
        Update: {
          created_at?: string
          field_definition_id?: string
          id?: string
          product_id?: string
          updated_at?: string
          value_boolean?: boolean | null
          value_date?: string | null
          value_datetime?: string | null
          value_decimal?: number | null
          value_integer?: number | null
          value_jsonb?: Json | null
          value_text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_custom_values_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "product_field_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_custom_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "product_custom_values_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_field_definitions: {
        Row: {
          created_at: string
          data_type: string
          display_order: number
          field_group: string | null
          field_key: string
          field_label: string
          help_text: string | null
          id: string
          is_filterable: boolean
          is_required: boolean
          is_searchable: boolean
          is_sortable: boolean
          metadata: Json
          placeholder: string | null
          product_type_id: string | null
          project_id: string
          show_in_admin_table: boolean
          show_in_form: boolean
          show_in_mobile_list: boolean
          show_in_product_detail: boolean
          status: string
          unit: string | null
          updated_at: string
          validation_rules: Json
        }
        Insert: {
          created_at?: string
          data_type: string
          display_order?: number
          field_group?: string | null
          field_key: string
          field_label: string
          help_text?: string | null
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          is_sortable?: boolean
          metadata?: Json
          placeholder?: string | null
          product_type_id?: string | null
          project_id: string
          show_in_admin_table?: boolean
          show_in_form?: boolean
          show_in_mobile_list?: boolean
          show_in_product_detail?: boolean
          status?: string
          unit?: string | null
          updated_at?: string
          validation_rules?: Json
        }
        Update: {
          created_at?: string
          data_type?: string
          display_order?: number
          field_group?: string | null
          field_key?: string
          field_label?: string
          help_text?: string | null
          id?: string
          is_filterable?: boolean
          is_required?: boolean
          is_searchable?: boolean
          is_sortable?: boolean
          metadata?: Json
          placeholder?: string | null
          product_type_id?: string | null
          project_id?: string
          show_in_admin_table?: boolean
          show_in_form?: boolean
          show_in_mobile_list?: boolean
          show_in_product_detail?: boolean
          status?: string
          unit?: string | null
          updated_at?: string
          validation_rules?: Json
        }
        Relationships: [
          {
            foreignKeyName: "product_field_definitions_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_field_definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "product_field_definitions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      product_field_options: {
        Row: {
          created_at: string
          display_order: number
          field_definition_id: string
          id: string
          metadata: Json
          option_label: string
          option_value: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_order?: number
          field_definition_id: string
          id?: string
          metadata?: Json
          option_label: string
          option_value: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_order?: number
          field_definition_id?: string
          id?: string
          metadata?: Json
          option_label?: string
          option_value?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_field_options_field_definition_id_fkey"
            columns: ["field_definition_id"]
            isOneToOne: false
            referencedRelation: "product_field_definitions"
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
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
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
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
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
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
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
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_inventory_settings: {
        Row: {
          allow_bulk_edit: boolean
          allow_bulk_price_update: boolean
          allow_bulk_status_update: boolean
          allow_custom_fields: boolean
          allow_product_clone: boolean
          created_at: string
          default_admin_view_id: string | null
          default_mobile_view_id: string | null
          inventory_display_name: string
          metadata: Json
          project_id: string
          realtime_enabled: boolean
          updated_at: string
        }
        Insert: {
          allow_bulk_edit?: boolean
          allow_bulk_price_update?: boolean
          allow_bulk_status_update?: boolean
          allow_custom_fields?: boolean
          allow_product_clone?: boolean
          created_at?: string
          default_admin_view_id?: string | null
          default_mobile_view_id?: string | null
          inventory_display_name?: string
          metadata?: Json
          project_id: string
          realtime_enabled?: boolean
          updated_at?: string
        }
        Update: {
          allow_bulk_edit?: boolean
          allow_bulk_price_update?: boolean
          allow_bulk_status_update?: boolean
          allow_custom_fields?: boolean
          allow_product_clone?: boolean
          created_at?: string
          default_admin_view_id?: string | null
          default_mobile_view_id?: string | null
          inventory_display_name?: string
          metadata?: Json
          project_id?: string
          realtime_enabled?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_inventory_settings_default_admin_view_id_fkey"
            columns: ["default_admin_view_id"]
            isOneToOne: false
            referencedRelation: "inventory_views"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_inventory_settings_default_mobile_view_id_fkey"
            columns: ["default_mobile_view_id"]
            isOneToOne: false
            referencedRelation: "inventory_views"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_inventory_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "project_inventory_settings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
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
      registration_reviews: {
        Row: {
          created_at: string
          decision: string
          id: string
          metadata: Json
          note: string | null
          project_id: string | null
          registration_id: string
          reviewed_at: string
          reviewed_by: string | null
        }
        Insert: {
          created_at?: string
          decision: string
          id?: string
          metadata?: Json
          note?: string | null
          project_id?: string | null
          registration_id: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Update: {
          created_at?: string
          decision?: string
          id?: string
          metadata?: Json
          note?: string | null
          project_id?: string | null
          registration_id?: string
          reviewed_at?: string
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registration_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "registration_reviews_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_reviews_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registration_reviews_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      registrations: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          event_id: string | null
          id: string
          lead_id: string | null
          metadata: Json
          note: string | null
          product_id: string | null
          project_id: string | null
          registration_code: string
          registration_type: string
          status: string
          updated_at: string
          voucher_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          note?: string | null
          product_id?: string | null
          project_id?: string | null
          registration_code?: string
          registration_type: string
          status?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          event_id?: string | null
          id?: string
          lead_id?: string | null
          metadata?: Json
          note?: string | null
          product_id?: string | null
          project_id?: string | null
          registration_code?: string
          registration_type?: string
          status?: string
          updated_at?: string
          voucher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registrations_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "registrations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "registrations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registrations_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
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
      sales_policies: {
        Row: {
          applicability_scope: string
          archived_at: string | null
          attachment_url: string | null
          attachments: Json
          content: string | null
          content_json: Json
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_featured: boolean
          metadata: Json
          priority: number
          project_id: string
          published_at: string | null
          registration_deadline: string | null
          slug: string
          status: string
          summary: string | null
          title: string
          updated_at: string
          updated_by: string | null
          version: string | null
          version_number: number
        }
        Insert: {
          applicability_scope?: string
          archived_at?: string | null
          attachment_url?: string | null
          attachments?: Json
          content?: string | null
          content_json?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_featured?: boolean
          metadata?: Json
          priority?: number
          project_id: string
          published_at?: string | null
          registration_deadline?: string | null
          slug: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
          version_number?: number
        }
        Update: {
          applicability_scope?: string
          archived_at?: string | null
          attachment_url?: string | null
          attachments?: Json
          content?: string | null
          content_json?: Json
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_featured?: boolean
          metadata?: Json
          priority?: number
          project_id?: string
          published_at?: string | null
          registration_deadline?: string | null
          slug?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          version?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_policies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "sales_policies_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_policy_versions: {
        Row: {
          change_summary: string | null
          created_at: string
          created_by: string | null
          id: string
          policy_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id: string
          snapshot: Json
          version_number: number
        }
        Update: {
          change_summary?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          policy_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_policy_versions_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sales_policies"
            referencedColumns: ["id"]
          },
        ]
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
      voucher_product_types: {
        Row: {
          created_at: string
          product_type_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          product_type_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          product_type_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_product_types_product_type_id_fkey"
            columns: ["product_type_id"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_product_types_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_products: {
        Row: {
          created_at: string
          product_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          product_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          product_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "inventory_product_summary"
            referencedColumns: ["product_id"]
          },
          {
            foreignKeyName: "voucher_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_products_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      voucher_sales_policies: {
        Row: {
          created_at: string
          policy_id: string
          voucher_id: string
        }
        Insert: {
          created_at?: string
          policy_id: string
          voucher_id: string
        }
        Update: {
          created_at?: string
          policy_id?: string
          voucher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voucher_sales_policies_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "sales_policies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voucher_sales_policies_voucher_id_fkey"
            columns: ["voucher_id"]
            isOneToOne: false
            referencedRelation: "vouchers"
            referencedColumns: ["id"]
          },
        ]
      }
      vouchers: {
        Row: {
          applicability_scope: string
          archived_at: string | null
          attachment_url: string | null
          attachments: Json
          benefits_json: Json
          code: string | null
          conditions_json: Json
          content: string | null
          created_at: string
          created_by: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          is_featured: boolean
          metadata: Json
          per_user_limit: number
          priority: number
          project_id: string
          published_at: string | null
          quantity: number | null
          registered_count: number
          registration_deadline: string | null
          registration_start: string | null
          slug: string
          status: string
          summary: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          updated_by: string | null
          value_amount: number | null
          value_percent: number | null
          voucher_type: string
        }
        Insert: {
          applicability_scope?: string
          archived_at?: string | null
          attachment_url?: string | null
          attachments?: Json
          benefits_json?: Json
          code?: string | null
          conditions_json?: Json
          content?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_featured?: boolean
          metadata?: Json
          per_user_limit?: number
          priority?: number
          project_id: string
          published_at?: string | null
          quantity?: number | null
          registered_count?: number
          registration_deadline?: string | null
          registration_start?: string | null
          slug: string
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          updated_by?: string | null
          value_amount?: number | null
          value_percent?: number | null
          voucher_type?: string
        }
        Update: {
          applicability_scope?: string
          archived_at?: string | null
          attachment_url?: string | null
          attachments?: Json
          benefits_json?: Json
          code?: string | null
          conditions_json?: Json
          content?: string | null
          created_at?: string
          created_by?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          is_featured?: boolean
          metadata?: Json
          per_user_limit?: number
          priority?: number
          project_id?: string
          published_at?: string | null
          quantity?: number | null
          registered_count?: number
          registration_deadline?: string | null
          registration_start?: string | null
          slug?: string
          status?: string
          summary?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
          value_amount?: number | null
          value_percent?: number | null
          voucher_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "vouchers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
          },
          {
            foreignKeyName: "vouchers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      inventory_product_summary: {
        Row: {
          balcony_direction: string | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string | null
          building_name: string | null
          built_up_area: number | null
          carpet_area: number | null
          category: string | null
          construction_area: number | null
          currency: string | null
          direction: string | null
          door_direction: string | null
          featured: boolean | null
          floor_id: string | null
          floor_number: number | null
          land_area: number | null
          primary_image_url: string | null
          primary_price: number | null
          primary_price_name: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          product_type_id: string | null
          product_type_name: string | null
          project_id: string | null
          project_name: string | null
          status: string | null
          updated_at: string | null
          view_text: string | null
          zone_id: string | null
          zone_name: string | null
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
            referencedRelation: "project_inventory_stats"
            referencedColumns: ["project_id"]
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
      project_inventory_stats: {
        Row: {
          available_count: number | null
          booked_count: number | null
          holding_count: number | null
          last_inventory_update: string | null
          locked_count: number | null
          project_id: string | null
          sold_count: number | null
          total_products: number | null
          unavailable_count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      _apply_event_audience: {
        Args: {
          p_event_id: string
          p_policy_ids: string[]
          p_product_ids: string[]
          p_product_type_ids: string[]
          p_project_id: string
          p_voucher_ids: string[]
        }
        Returns: undefined
      }
      _apply_event_sessions: {
        Args: {
          p_event_id: string
          p_evt_end: string
          p_evt_start: string
          p_sessions: Json
        }
        Returns: undefined
      }
      _apply_policy_applicability: {
        Args: {
          p_policy_id: string
          p_product_ids: string[]
          p_product_type_ids: string[]
          p_project_id: string
        }
        Returns: string
      }
      _apply_product_custom_values: {
        Args: {
          p_product_id: string
          p_product_type_id: string
          p_project_id: string
          p_values: Json
        }
        Returns: undefined
      }
      _apply_product_prices: {
        Args: { p_prices: Json; p_product_id: string }
        Returns: undefined
      }
      _apply_voucher_applicability: {
        Args: {
          p_policy_ids: string[]
          p_product_ids: string[]
          p_product_type_ids: string[]
          p_project_id: string
          p_voucher_id: string
        }
        Returns: undefined
      }
      _event_registration_count: {
        Args: { p_event_id: string }
        Returns: number
      }
      _log_crm_activity: {
        Args: {
          p_content: string
          p_lead: string
          p_metadata: Json
          p_project: string
          p_reg: string
          p_title: string
          p_type: string
        }
        Returns: string
      }
      _ops_can_access_lead: { Args: { p_lead: string }; Returns: boolean }
      _ops_can_access_registration: {
        Args: { p_reg: string }
        Returns: boolean
      }
      _ops_can_manage_project: { Args: { p_project: string }; Returns: boolean }
      _resolve_mobile_primary_contact: {
        Args: { p_project_id: string }
        Returns: Json
      }
      _task_access: {
        Args: { p_task_id: string }
        Returns: Record<string, unknown>
      }
      _voucher_registration_count: {
        Args: { p_voucher_id: string }
        Returns: number
      }
      accessible_mobile_project_ids: { Args: never; Returns: string[] }
      add_mobile_favorite: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      apply_inventory_template: {
        Args: {
          p_include_fields?: boolean
          p_include_views?: boolean
          p_overwrite?: boolean
          p_project_id: string
          p_template_id: string
        }
        Returns: Json
      }
      archive_event: {
        Args: { p_event_id: string; p_reason?: string }
        Returns: Json
      }
      archive_product: {
        Args: { p_product_id: string; p_reason?: string }
        Returns: undefined
      }
      archive_sales_policy: {
        Args: { p_policy_id: string; p_reason?: string }
        Returns: Json
      }
      archive_voucher: {
        Args: { p_reason?: string; p_voucher_id: string }
        Returns: Json
      }
      assign_crm_task: {
        Args: { p_assigned_to: string; p_task_id: string }
        Returns: Json
      }
      assign_lead: {
        Args: { p_assigned_to: string; p_lead_id: string }
        Returns: Json
      }
      assign_registration: {
        Args: { p_assigned_to: string; p_registration_id: string }
        Returns: Json
      }
      bootstrap_super_admin: { Args: { p_user_id: string }; Returns: undefined }
      bulk_assign_leads: {
        Args: { p_assigned_to: string; p_lead_ids: string[] }
        Returns: Json
      }
      bulk_assign_registrations: {
        Args: { p_assigned_to: string; p_registration_ids: string[] }
        Returns: Json
      }
      bulk_create_floors: {
        Args: {
          p_building_id: string
          p_code_prefix?: string
          p_code_suffix?: string
          p_end_floor: number
          p_excluded_floors?: number[]
          p_project_id: string
          p_start_floor: number
        }
        Returns: {
          building_id: string
          created_at: string
          display_order: number
          floor_code: string
          floor_name: string | null
          floor_number: number | null
          id: string
          metadata: Json
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "floors"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      can_access_mobile_product: {
        Args: { p_product_id: string }
        Returns: boolean
      }
      can_access_mobile_project: {
        Args: { p_project_id: string }
        Returns: boolean
      }
      can_transition_lead_status: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      can_transition_registration_status: {
        Args: { p_from: string; p_to: string }
        Returns: boolean
      }
      cancel_crm_task: {
        Args: { p_reason?: string; p_task_id: string }
        Returns: Json
      }
      cancel_event: {
        Args: { p_event_id: string; p_reason?: string }
        Returns: Json
      }
      cancel_my_event_registration: {
        Args: { p_registration_id: string }
        Returns: Json
      }
      cancel_my_voucher_registration: {
        Args: { p_registration_id: string }
        Returns: Json
      }
      check_event_eligibility: {
        Args: {
          p_event_id: string
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_voucher_id?: string
        }
        Returns: Json
      }
      check_voucher_eligibility: {
        Args: {
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_voucher_id: string
        }
        Returns: Json
      }
      clone_event: {
        Args: {
          p_event_id: string
          p_new_slug: string
          p_new_title?: string
          p_shift_start?: string
        }
        Returns: Json
      }
      clone_product: {
        Args: { p_new_code: string; p_source_id: string }
        Returns: string
      }
      clone_sales_policy: {
        Args: { p_new_slug: string; p_new_title?: string; p_policy_id: string }
        Returns: Json
      }
      clone_voucher: {
        Args: {
          p_new_code?: string
          p_new_slug: string
          p_new_title?: string
          p_voucher_id: string
        }
        Returns: Json
      }
      commit_inventory_import: { Args: { p_job_id: string }; Returns: Json }
      complete_crm_task: { Args: { p_task_id: string }; Returns: Json }
      complete_event: {
        Args: { p_event_id: string; p_reason?: string }
        Returns: Json
      }
      convert_lead: {
        Args: { p_lead_id: string; p_reason?: string }
        Returns: Json
      }
      create_crm_activity: {
        Args: {
          p_activity_type: string
          p_content?: string
          p_lead_id: string
          p_metadata?: Json
          p_occurred_at?: string
          p_registration_id: string
          p_title: string
        }
        Returns: Json
      }
      create_crm_task: {
        Args: {
          p_assigned_to?: string
          p_description?: string
          p_due_at?: string
          p_lead_id: string
          p_priority?: string
          p_registration_id: string
          p_title: string
        }
        Returns: Json
      }
      create_event: {
        Args: {
          p_event: Json
          p_policy_ids?: string[]
          p_product_ids?: string[]
          p_product_type_ids?: string[]
          p_project_id: string
          p_publish?: boolean
          p_sessions?: Json
          p_voucher_ids?: string[]
        }
        Returns: Json
      }
      create_product_with_values: {
        Args: {
          p_core: Json
          p_custom?: Json
          p_prices?: Json
          p_project_id: string
        }
        Returns: string
      }
      create_sales_policy: {
        Args: {
          p_policy: Json
          p_product_ids?: string[]
          p_product_type_ids?: string[]
          p_project_id: string
          p_publish?: boolean
        }
        Returns: Json
      }
      create_sales_policy_version: {
        Args: { p_change_summary: string; p_policy_id: string }
        Returns: number
      }
      create_voucher: {
        Args: {
          p_policy_ids?: string[]
          p_product_ids?: string[]
          p_product_type_ids?: string[]
          p_project_id: string
          p_publish?: boolean
          p_voucher: Json
        }
        Returns: Json
      }
      duplicate_inventory_view: {
        Args: { p_code: string; p_name: string; p_source_id: string }
        Returns: string
      }
      event_derived_state: { Args: { p_event_id: string }; Returns: string }
      generate_registration_code_value: { Args: never; Returns: string }
      get_active_event_detail: {
        Args: {
          p_event_id: string
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_voucher_id?: string
        }
        Returns: Json
      }
      get_active_project_events: {
        Args: {
          p_event_type?: string
          p_limit?: number
          p_offset?: number
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_project_id: string
          p_starts_from?: string
          p_starts_to?: string
          p_voucher_id?: string
        }
        Returns: Json
      }
      get_active_project_policies: {
        Args: {
          p_product_id?: string
          p_product_type_id?: string
          p_project_id: string
        }
        Returns: Json
      }
      get_active_project_vouchers: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_project_id: string
        }
        Returns: Json
      }
      get_active_voucher_detail: {
        Args: {
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_voucher_id: string
        }
        Returns: Json
      }
      get_event_admin_detail: { Args: { p_event_id: string }; Returns: Json }
      get_lead_admin_detail: { Args: { p_lead_id: string }; Returns: Json }
      get_lead_timeline: {
        Args: { p_lead_id: string; p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_mobile_favorites: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: Json
      }
      get_mobile_inventory_filters: {
        Args: { p_project_id?: string }
        Returns: Json
      }
      get_mobile_product_detail: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_mobile_project_detail: {
        Args: { p_project_id: string }
        Returns: Json
      }
      get_mobile_projects: { Args: never; Returns: Json }
      get_my_event_registrations: {
        Args: {
          p_event_type?: string
          p_limit?: number
          p_offset?: number
          p_project_id?: string
          p_status?: string
        }
        Returns: Json
      }
      get_my_operations_work: {
        Args: { p_limit?: number; p_project_id?: string }
        Returns: Json
      }
      get_my_voucher_registrations: {
        Args: {
          p_limit?: number
          p_offset?: number
          p_project_id?: string
          p_status?: string
        }
        Returns: Json
      }
      get_operations_dashboard: {
        Args: { p_project_id?: string }
        Returns: Json
      }
      get_operations_registration_capabilities: {
        Args: { p_caller_id?: string; p_registration_id: string }
        Returns: Json
      }
      get_or_create_registration_lead: {
        Args: { p_product_id?: string; p_project_id: string; p_user_id: string }
        Returns: string
      }
      get_product_admin_detail: {
        Args: { p_product_id: string }
        Returns: Json
      }
      get_product_detail: { Args: { p_product_id: string }; Returns: Json }
      get_registration_admin_detail: {
        Args: { p_registration_id: string }
        Returns: Json
      }
      get_registration_domain: { Args: { p_type: string }; Returns: string }
      get_registration_timeline: {
        Args: { p_limit?: number; p_offset?: number; p_registration_id: string }
        Returns: Json
      }
      get_sales_policy_admin_detail: {
        Args: { p_policy_id: string }
        Returns: Json
      }
      get_voucher_admin_detail: {
        Args: { p_voucher_id: string }
        Returns: Json
      }
      has_any_role: { Args: { role_codes: string[] }; Returns: boolean }
      has_project_role: {
        Args: { p_project_id: string; p_roles: string[] }
        Returns: boolean
      }
      has_role: { Args: { role_code: string }; Returns: boolean }
      inventory_import_add_rows: {
        Args: { p_job_id: string; p_rows: Json }
        Returns: number
      }
      is_active_user: { Args: never; Returns: boolean }
      is_event_registration_type: { Args: { p_type: string }; Returns: boolean }
      is_project_manager: { Args: { p_project_id: string }; Returns: boolean }
      is_project_member: { Args: { p_project_id: string }; Returns: boolean }
      is_reserved_product_field_key: {
        Args: { p_key: string }
        Returns: boolean
      }
      is_valid_assignee: {
        Args: { p_project: string; p_user: string }
        Returns: boolean
      }
      mark_lead_lost: {
        Args: { p_lead_id: string; p_reason: string }
        Returns: Json
      }
      normalize_phone: { Args: { phone: string }; Returns: string }
      pause_event: { Args: { p_event_id: string }; Returns: Json }
      pause_voucher: { Args: { p_voucher_id: string }; Returns: Json }
      publish_event: { Args: { p_event_id: string }; Returns: Json }
      publish_sales_policy: {
        Args: { p_change_summary?: string; p_policy_id: string }
        Returns: Json
      }
      publish_voucher: { Args: { p_voucher_id: string }; Returns: Json }
      register_for_event: {
        Args: {
          p_event_id: string
          p_note?: string
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_voucher_id?: string
        }
        Returns: Json
      }
      register_for_voucher: {
        Args: {
          p_note?: string
          p_policy_id?: string
          p_product_id?: string
          p_product_type_id?: string
          p_voucher_id: string
        }
        Returns: Json
      }
      remove_mobile_favorite: {
        Args: { p_product_id: string }
        Returns: undefined
      }
      reopen_lead: {
        Args: { p_lead_id: string; p_reason?: string }
        Returns: Json
      }
      restore_event: { Args: { p_event_id: string }; Returns: Json }
      restore_product: { Args: { p_product_id: string }; Returns: undefined }
      restore_sales_policy: { Args: { p_policy_id: string }; Returns: Json }
      restore_voucher: { Args: { p_voucher_id: string }; Returns: Json }
      resume_event: { Args: { p_event_id: string }; Returns: Json }
      resume_voucher: { Args: { p_voucher_id: string }; Returns: Json }
      review_registration: {
        Args: { p_decision: string; p_note?: string; p_registration_id: string }
        Returns: Json
      }
      save_inventory_view_fields: {
        Args: { p_fields: Json; p_view_id: string }
        Returns: number
      }
      search_assignable_users: {
        Args: {
          p_limit?: number
          p_project_id: string
          p_query?: string
          p_target_type: string
        }
        Returns: Json
      }
      search_bulk_assignable_users: {
        Args: {
          p_limit?: number
          p_project_ids: string[]
          p_query?: string
          p_target_type: string
        }
        Returns: Json
      }
      search_crm_tasks: {
        Args: {
          p_assigned_to?: string
          p_due_today?: boolean
          p_limit?: number
          p_offset?: number
          p_overdue?: boolean
          p_priority?: string
          p_project_id?: string
          p_query?: string
          p_status?: string
        }
        Returns: Json
      }
      search_events: {
        Args: {
          p_derived_state?: string
          p_event_type?: string
          p_featured?: boolean
          p_include_archived?: boolean
          p_limit?: number
          p_offset?: number
          p_project_id: string
          p_query?: string
          p_starts_from?: string
          p_starts_to?: string
          p_status?: string
        }
        Returns: Json
      }
      search_inventory: {
        Args: {
          p_area_max?: number
          p_area_min?: number
          p_building_id?: string
          p_category?: string
          p_direction?: string
          p_floor_max?: number
          p_floor_min?: number
          p_limit?: number
          p_offset?: number
          p_price_max?: number
          p_price_min?: number
          p_product_type_id?: string
          p_project_id?: string
          p_query?: string
          p_status?: string
          p_zone_id?: string
        }
        Returns: {
          balcony_direction: string | null
          bathrooms: number | null
          bedrooms: number | null
          building_id: string | null
          building_name: string | null
          built_up_area: number | null
          carpet_area: number | null
          category: string | null
          construction_area: number | null
          currency: string | null
          direction: string | null
          door_direction: string | null
          featured: boolean | null
          floor_id: string | null
          floor_number: number | null
          land_area: number | null
          primary_image_url: string | null
          primary_price: number | null
          primary_price_name: string | null
          product_code: string | null
          product_id: string | null
          product_name: string | null
          product_type_id: string | null
          product_type_name: string | null
          project_id: string | null
          project_name: string | null
          status: string | null
          updated_at: string | null
          view_text: string | null
          zone_id: string | null
          zone_name: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "inventory_product_summary"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      search_leads: {
        Args: {
          p_assigned_to?: string
          p_created_from?: string
          p_created_to?: string
          p_limit?: number
          p_offset?: number
          p_priority?: string
          p_project_id?: string
          p_query?: string
          p_source_id?: string
          p_status?: string
          p_unassigned?: boolean
        }
        Returns: Json
      }
      search_mobile_inventory: {
        Args: {
          p_area_max?: number
          p_area_min?: number
          p_building_id?: string
          p_category?: string
          p_direction?: string
          p_floor_max?: number
          p_floor_min?: number
          p_limit?: number
          p_offset?: number
          p_price_max?: number
          p_price_min?: number
          p_product_type_id?: string
          p_project_id?: string
          p_query?: string
          p_status?: string
          p_zone_id?: string
        }
        Returns: Json
      }
      search_registrations: {
        Args: {
          p_assigned_to?: string
          p_created_from?: string
          p_created_to?: string
          p_domain?: string
          p_limit?: number
          p_offset?: number
          p_project_id?: string
          p_query?: string
          p_registration_type?: string
          p_status?: string
          p_unassigned?: boolean
        }
        Returns: Json
      }
      search_sales_policies: {
        Args: {
          p_effective_state?: string
          p_featured?: boolean
          p_limit?: number
          p_offset?: number
          p_project_id: string
          p_query?: string
          p_status?: string
        }
        Returns: Json
      }
      search_vouchers: {
        Args: {
          p_derived_state?: string
          p_featured?: boolean
          p_include_archived?: boolean
          p_limit?: number
          p_offset?: number
          p_project_id: string
          p_query?: string
          p_status?: string
        }
        Returns: Json
      }
      set_default_inventory_view: {
        Args: { p_view_id: string }
        Returns: undefined
      }
      set_lead_priority: {
        Args: { p_lead_id: string; p_priority: string }
        Returns: Json
      }
      set_product_custom_values: {
        Args: { p_product_id: string; p_values: Json }
        Returns: undefined
      }
      set_project_primary_contact: {
        Args: { p_project_id: string; p_project_member_id: string }
        Returns: undefined
      }
      snapshot_template_from_project: {
        Args: {
          p_code: string
          p_description?: string
          p_name: string
          p_project_category?: string
          p_project_id: string
        }
        Returns: string
      }
      start_crm_task: { Args: { p_task_id: string }; Returns: Json }
      transition_lead_status: {
        Args: { p_lead_id: string; p_reason?: string; p_status: string }
        Returns: Json
      }
      transition_registration_status: {
        Args: { p_reason?: string; p_registration_id: string; p_status: string }
        Returns: Json
      }
      unpublish_sales_policy: {
        Args: { p_change_summary?: string; p_policy_id: string }
        Returns: Json
      }
      update_crm_task: {
        Args: {
          p_description?: string
          p_due_at?: string
          p_priority?: string
          p_task_id: string
          p_title?: string
        }
        Returns: Json
      }
      update_event: {
        Args: {
          p_event_id: string
          p_event_patch: Json
          p_policy_ids?: string[]
          p_product_ids?: string[]
          p_product_type_ids?: string[]
          p_sessions?: Json
          p_voucher_ids?: string[]
        }
        Returns: Json
      }
      update_lead_profile: {
        Args: {
          p_email?: string
          p_full_name?: string
          p_interested_project_id?: string
          p_lead_id: string
          p_note?: string
          p_phone?: string
          p_source_id?: string
        }
        Returns: Json
      }
      update_product_with_values: {
        Args: {
          p_core?: Json
          p_custom?: Json
          p_prices?: Json
          p_product_id: string
        }
        Returns: undefined
      }
      update_sales_policy: {
        Args: {
          p_change_summary?: string
          p_policy_id: string
          p_policy_patch: Json
          p_product_ids?: string[]
          p_product_type_ids?: string[]
        }
        Returns: Json
      }
      update_voucher: {
        Args: {
          p_policy_ids?: string[]
          p_product_ids?: string[]
          p_product_type_ids?: string[]
          p_voucher_id: string
          p_voucher_patch: Json
        }
        Returns: Json
      }
      validate_event_agenda: { Args: { p_agenda: Json }; Returns: undefined }
      validate_event_attachments: {
        Args: { p_attachments: Json }
        Returns: undefined
      }
      validate_event_dates: {
        Args: {
          p_end: string
          p_reg_deadline: string
          p_reg_start: string
          p_start: string
        }
        Returns: undefined
      }
      validate_event_location: {
        Args: {
          p_address: string
          p_lat: number
          p_lng: number
          p_type: string
          p_url: string
          p_venue: string
        }
        Returns: undefined
      }
      validate_event_session_row: {
        Args: {
          p_end: string
          p_evt_end: string
          p_evt_start: string
          p_start: string
          p_title: string
        }
        Returns: undefined
      }
      validate_event_speakers: {
        Args: { p_speakers: Json }
        Returns: undefined
      }
      validate_inventory_view: { Args: { p_view_id: string }; Returns: Json }
      validate_operations_registration_transition: {
        Args: {
          p_new_status: string
          p_operation: string
          p_registration_id: string
        }
        Returns: undefined
      }
      validate_policy_applicability: {
        Args: {
          p_product_ids: string[]
          p_product_type_ids: string[]
          p_project_id: string
        }
        Returns: undefined
      }
      validate_product_relationships: {
        Args: {
          p_building_id: string
          p_floor_id: string
          p_product_type_id: string
          p_project_id: string
          p_zone_id: string
        }
        Returns: undefined
      }
      validate_sales_policy_attachments: {
        Args: { p_attachments: Json }
        Returns: undefined
      }
      validate_sales_policy_content: {
        Args: { p_content: Json }
        Returns: undefined
      }
      validate_sales_policy_dates: {
        Args: { p_from: string; p_to: string }
        Returns: undefined
      }
      validate_sales_policy_slug: {
        Args: { p_slug: string }
        Returns: undefined
      }
      validate_site_tour_details: {
        Args: { p_details: Json; p_event_type: string }
        Returns: undefined
      }
      validate_voucher_attachments: {
        Args: { p_attachments: Json }
        Returns: undefined
      }
      validate_voucher_benefits: {
        Args: { p_benefits: Json }
        Returns: undefined
      }
      validate_voucher_conditions: {
        Args: { p_conditions: Json }
        Returns: undefined
      }
      validate_voucher_dates: {
        Args: {
          p_registration_deadline: string
          p_registration_start: string
          p_valid_from: string
          p_valid_to: string
        }
        Returns: undefined
      }
      voucher_derived_state:
        | { Args: { p_voucher_id: string }; Returns: string }
        | {
            Args: {
              p_reg_count: number
              v: Database["public"]["Tables"]["vouchers"]["Row"]
            }
            Returns: string
          }
      write_audit_log: {
        Args: {
          p_action: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new?: Json
          p_old?: Json
        }
        Returns: string
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
