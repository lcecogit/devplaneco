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
      bids: {
        Row: {
          amount: number
          created_at: string
          id: string
          job_id: string
          status: Database["public"]["Enums"]["bid_status"]
          submitted_at: string
          transport_partner_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["bid_status"]
          submitted_at?: string
          transport_partner_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          job_id?: string
          status?: Database["public"]["Enums"]["bid_status"]
          submitted_at?: string
          transport_partner_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bids_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bids_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          customer_id: string
          id: string
          job_id: string | null
          payment_method_type: string | null
          provider: string | null
          provider_payment_id: string | null
          quote_id: string
          status: Database["public"]["Enums"]["customer_payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          customer_id: string
          id?: string
          job_id?: string | null
          payment_method_type?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          quote_id: string
          status?: Database["public"]["Enums"]["customer_payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          customer_id?: string
          id?: string
          job_id?: string | null
          payment_method_type?: string | null
          provider?: string | null
          provider_payment_id?: string | null
          quote_id?: string
          status?: Database["public"]["Enums"]["customer_payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deallocation_charges: {
        Row: {
          amount: number
          created_at: string
          dispute_reason: string | null
          dispute_status: Database["public"]["Enums"]["dispute_status"]
          id: string
          job_id: string | null
          reason: string | null
          reservation_id: string | null
          resolution: string | null
          transport_partner_id: string
          updated_at: string
          waived: boolean
        }
        Insert: {
          amount: number
          created_at?: string
          dispute_reason?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_status"]
          id?: string
          job_id?: string | null
          reason?: string | null
          reservation_id?: string | null
          resolution?: string | null
          transport_partner_id: string
          updated_at?: string
          waived?: boolean
        }
        Update: {
          amount?: number
          created_at?: string
          dispute_reason?: string | null
          dispute_status?: Database["public"]["Enums"]["dispute_status"]
          id?: string
          job_id?: string | null
          reason?: string | null
          reservation_id?: string | null
          resolution?: string | null
          transport_partner_id?: string
          updated_at?: string
          waived?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "deallocation_charges_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deallocation_charges_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deallocation_charges_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          created_at: string
          id: string
          profile_id: string
          status: Database["public"]["Enums"]["driver_status"]
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          profile_id: string
          status?: Database["public"]["Enums"]["driver_status"]
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          profile_id?: string
          status?: Database["public"]["Enums"]["driver_status"]
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "drivers_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      item_catalogue: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          created_at: string
          height_cm: number
          id: string
          is_active: boolean
          length_cm: number
          name: string
          search_terms: string[]
          sort_order: number
          updated_at: string
          volume_m3: number
          weight_kg: number | null
          width_cm: number
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          created_at?: string
          height_cm: number
          id?: string
          is_active?: boolean
          length_cm: number
          name: string
          search_terms?: string[]
          sort_order?: number
          updated_at?: string
          volume_m3: number
          weight_kg?: number | null
          width_cm: number
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          created_at?: string
          height_cm?: number
          id?: string
          is_active?: boolean
          length_cm?: number
          name?: string
          search_terms?: string[]
          sort_order?: number
          updated_at?: string
          volume_m3?: number
          weight_kg?: number | null
          width_cm?: number
        }
        Relationships: []
      }
      job_assignments: {
        Row: {
          assigned_at: string
          created_at: string
          driver_id: string | null
          id: string
          job_id: string
          transport_partner_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          assigned_at?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          job_id: string
          transport_partner_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          assigned_at?: string
          created_at?: string
          driver_id?: string | null
          id?: string
          job_id?: string
          transport_partner_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_assignments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_assignments_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_interests: {
        Row: {
          created_at: string
          id: string
          job_id: string
          note: string | null
          status: string
          transport_partner_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          note?: string | null
          status?: string
          transport_partner_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          note?: string | null
          status?: string
          transport_partner_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "job_interests_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interests_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_interests_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_invitations: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          job_id: string
          reservation_id: string | null
          status: Database["public"]["Enums"]["invitation_status"]
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          job_id?: string
          reservation_id?: string | null
          status?: Database["public"]["Enums"]["invitation_status"]
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_invitations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invitations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_invitations_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      job_items: {
        Row: {
          catalogue_item_id: string | null
          created_at: string
          custom_name: string | null
          height_cm: number | null
          id: string
          job_id: string
          length_cm: number | null
          quantity: number
          updated_at: string
          volume_m3: number
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          catalogue_item_id?: string | null
          created_at?: string
          custom_name?: string | null
          height_cm?: number | null
          id?: string
          job_id: string
          length_cm?: number | null
          quantity?: number
          updated_at?: string
          volume_m3?: number
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          catalogue_item_id?: string | null
          created_at?: string
          custom_name?: string | null
          height_cm?: number | null
          id?: string
          job_id?: string
          length_cm?: number | null
          quantity?: number
          updated_at?: string
          volume_m3?: number
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "job_items_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "item_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_items_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_recommendations: {
        Row: {
          created_at: string
          id: string
          job_id: string
          route_id: string
          sent_at: string
          status: Database["public"]["Enums"]["job_recommendation_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          route_id: string
          sent_at?: string
          status?: Database["public"]["Enums"]["job_recommendation_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          route_id?: string
          sent_at?: string
          status?: Database["public"]["Enums"]["job_recommendation_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_recommendations_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_recommendations_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      job_stops: {
        Row: {
          address_line: string | null
          address_text: string | null
          created_at: string
          floor: Database["public"]["Enums"]["floor_level"]
          has_lift: boolean
          id: string
          job_id: string
          lat: number | null
          lng: number | null
          outcode: string | null
          postcode: string | null
          sequence: number
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          address_text?: string | null
          created_at?: string
          floor?: Database["public"]["Enums"]["floor_level"]
          has_lift?: boolean
          id?: string
          job_id: string
          lat?: number | null
          lng?: number | null
          outcode?: string | null
          postcode?: string | null
          sequence: number
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          address_text?: string | null
          created_at?: string
          floor?: Database["public"]["Enums"]["floor_level"]
          has_lift?: boolean
          id?: string
          job_id?: string
          lat?: number | null
          lng?: number | null
          outcode?: string | null
          postcode?: string | null
          sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_stops_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      job_watchlist: {
        Row: {
          created_at: string
          id: string
          job_id: string
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_watchlist_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_watchlist_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          access_notes: string | null
          allocation_method:
            | Database["public"]["Enums"]["allocation_method"]
            | null
          bidding_closes_at: string | null
          category: string | null
          collection_address: string | null
          collection_postcode: string
          collection_window_end: string | null
          collection_window_start: string | null
          cover_tier: Database["public"]["Enums"]["cover_tier"]
          created_at: string
          crew_size: number | null
          customer_id: string
          customer_price: number | null
          delivery_address: string | null
          delivery_postcode: string
          delivery_window_end: string | null
          delivery_window_start: string | null
          distance_miles: number | null
          estimated_duration_minutes: number | null
          extended_cover_declared_value: number | null
          extended_cover_notes: string | null
          helper_included: boolean
          id: string
          listed_at: string
          matching_status: Database["public"]["Enums"]["matching_status"]
          payout_amount: number | null
          price_breakdown: Json | null
          quote_id: string | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          total_volume_m3: number | null
          updated_at: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          access_notes?: string | null
          allocation_method?:
            | Database["public"]["Enums"]["allocation_method"]
            | null
          bidding_closes_at?: string | null
          category?: string | null
          collection_address?: string | null
          collection_postcode: string
          collection_window_end?: string | null
          collection_window_start?: string | null
          cover_tier?: Database["public"]["Enums"]["cover_tier"]
          created_at?: string
          crew_size?: number | null
          customer_id: string
          customer_price?: number | null
          delivery_address?: string | null
          delivery_postcode: string
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          distance_miles?: number | null
          estimated_duration_minutes?: number | null
          extended_cover_declared_value?: number | null
          extended_cover_notes?: string | null
          helper_included?: boolean
          id?: string
          listed_at?: string
          matching_status?: Database["public"]["Enums"]["matching_status"]
          payout_amount?: number | null
          price_breakdown?: Json | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          total_volume_m3?: number | null
          updated_at?: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          access_notes?: string | null
          allocation_method?:
            | Database["public"]["Enums"]["allocation_method"]
            | null
          bidding_closes_at?: string | null
          category?: string | null
          collection_address?: string | null
          collection_postcode?: string
          collection_window_end?: string | null
          collection_window_start?: string | null
          cover_tier?: Database["public"]["Enums"]["cover_tier"]
          created_at?: string
          crew_size?: number | null
          customer_id?: string
          customer_price?: number | null
          delivery_address?: string | null
          delivery_postcode?: string
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          distance_miles?: number | null
          estimated_duration_minutes?: number | null
          extended_cover_declared_value?: number | null
          extended_cover_notes?: string | null
          helper_included?: boolean
          id?: string
          listed_at?: string
          matching_status?: Database["public"]["Enums"]["matching_status"]
          payout_amount?: number | null
          price_breakdown?: Json | null
          quote_id?: string | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
          total_volume_m3?: number | null
          updated_at?: string
          work_type?: Database["public"]["Enums"]["work_type"]
        }
        Relationships: [
          {
            foreignKeyName: "jobs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          created_at: string
          id: string
          job_id: string
          read_at: string | null
          sender_profile_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          job_id: string
          read_at?: string | null
          sender_profile_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          job_id?: string
          read_at?: string | null
          sender_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_profile_id_fkey"
            columns: ["sender_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_leads: {
        Row: {
          business_name: string
          company_type: string | null
          contact_name: string
          coverage_area: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          phone: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          business_name: string
          company_type?: string | null
          contact_name: string
          coverage_area?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          business_name?: string
          company_type?: string | null
          contact_name?: string
          coverage_area?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      partner_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          read_at: string | null
          title: string
          transport_partner_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          read_at?: string | null
          title: string
          transport_partner_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          read_at?: string | null
          title?: string
          transport_partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_notifications_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          express_pay: boolean
          express_pay_fee: number | null
          id: string
          job_id: string
          scheduled_date: string | null
          status: Database["public"]["Enums"]["payment_status"]
          transferred_date: string | null
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          express_pay?: boolean
          express_pay_fee?: number | null
          id?: string
          job_id: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transferred_date?: string | null
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          express_pay?: boolean
          express_pay_fee?: number | null
          id?: string
          job_id?: string
          scheduled_date?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          transferred_date?: string | null
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_management_plans: {
        Row: {
          created_at: string
          id: string
          reason: string | null
          started_at: string
          status: Database["public"]["Enums"]["pmp_status"]
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          reason?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["pmp_status"]
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string | null
          started_at?: string
          status?: Database["public"]["Enums"]["pmp_status"]
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_management_plans_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_metrics: {
        Row: {
          app_usage_pct: number | null
          computed_at: string
          created_at: string
          customer_feedback_rating: number | null
          deallocation_rate_pct: number | null
          id: string
          on_time_delivery_pct: number | null
          on_time_pickup_pct: number | null
          period_month: string
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          app_usage_pct?: number | null
          computed_at?: string
          created_at?: string
          customer_feedback_rating?: number | null
          deallocation_rate_pct?: number | null
          id?: string
          on_time_delivery_pct?: number | null
          on_time_pickup_pct?: number | null
          period_month: string
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          app_usage_pct?: number | null
          computed_at?: string
          created_at?: string
          customer_feedback_rating?: number | null
          deallocation_rate_pct?: number | null
          id?: string
          on_time_delivery_pct?: number | null
          on_time_pickup_pct?: number | null
          period_month?: string
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "performance_metrics_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      photos: {
        Row: {
          comment: string | null
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          has_damage: boolean
          id: string
          job_id: string
          stage: Database["public"]["Enums"]["photo_stage"]
          taken_at: string
          updated_at: string
          url: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          has_damage?: boolean
          id?: string
          job_id: string
          stage: Database["public"]["Enums"]["photo_stage"]
          taken_at?: string
          updated_at?: string
          url: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          has_damage?: boolean
          id?: string
          job_id?: string
          stage?: Database["public"]["Enums"]["photo_stage"]
          taken_at?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      proof_of_collection: {
        Row: {
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          job_id: string
          signature_url: string | null
          signed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          job_id: string
          signature_url?: string | null
          signed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          job_id?: string
          signature_url?: string | null
          signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_collection_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      proof_of_delivery: {
        Row: {
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          job_id: string
          signature_url: string | null
          signed_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          job_id: string
          signature_url?: string | null
          signed_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          job_id?: string
          signature_url?: string | null
          signed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "proof_of_delivery_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_items: {
        Row: {
          catalogue_item_id: string | null
          created_at: string
          custom_name: string | null
          height_cm: number | null
          id: string
          length_cm: number | null
          quantity: number
          quote_id: string
          updated_at: string
          volume_m3: number
          weight_kg: number | null
          width_cm: number | null
        }
        Insert: {
          catalogue_item_id?: string | null
          created_at?: string
          custom_name?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          quantity?: number
          quote_id: string
          updated_at?: string
          volume_m3?: number
          weight_kg?: number | null
          width_cm?: number | null
        }
        Update: {
          catalogue_item_id?: string | null
          created_at?: string
          custom_name?: string | null
          height_cm?: number | null
          id?: string
          length_cm?: number | null
          quantity?: number
          quote_id?: string
          updated_at?: string
          volume_m3?: number
          weight_kg?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "quote_items_catalogue_item_id_fkey"
            columns: ["catalogue_item_id"]
            isOneToOne: false
            referencedRelation: "item_catalogue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_items_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_requests: {
        Row: {
          collection_postcode: string
          created_at: string
          delivery_postcode: string
          details: string | null
          email: string
          full_name: string
          id: string
          phone: string | null
          preferred_date: string | null
          service_category: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
        }
        Insert: {
          collection_postcode: string
          created_at?: string
          delivery_postcode: string
          details?: string | null
          email: string
          full_name: string
          id?: string
          phone?: string | null
          preferred_date?: string | null
          service_category?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Update: {
          collection_postcode?: string
          created_at?: string
          delivery_postcode?: string
          details?: string | null
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          preferred_date?: string | null
          service_category?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
        }
        Relationships: []
      }
      quote_stops: {
        Row: {
          address_line: string | null
          address_text: string | null
          created_at: string
          floor: Database["public"]["Enums"]["floor_level"]
          has_lift: boolean
          id: string
          lat: number | null
          lng: number | null
          outcode: string | null
          postcode: string | null
          quote_id: string
          sequence: number
          updated_at: string
        }
        Insert: {
          address_line?: string | null
          address_text?: string | null
          created_at?: string
          floor?: Database["public"]["Enums"]["floor_level"]
          has_lift?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          outcode?: string | null
          postcode?: string | null
          quote_id: string
          sequence: number
          updated_at?: string
        }
        Update: {
          address_line?: string | null
          address_text?: string | null
          created_at?: string
          floor?: Database["public"]["Enums"]["floor_level"]
          has_lift?: boolean
          id?: string
          lat?: number | null
          lng?: number | null
          outcode?: string | null
          postcode?: string | null
          quote_id?: string
          sequence?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_stops_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          access_notes: string | null
          category_hint: string | null
          collection_window_end: string | null
          collection_window_start: string | null
          contact_name: string | null
          contact_phone: string | null
          cover_tier: Database["public"]["Enums"]["cover_tier"]
          created_at: string
          crew_size: number | null
          customer_id: string | null
          delivery_window_end: string | null
          delivery_window_start: string | null
          distance_miles: number | null
          duration_minutes: number | null
          email: string | null
          expires_at: string
          extended_cover_declared_value: number | null
          extended_cover_notes: string | null
          helper_included: boolean
          id: string
          marketing_opt_in: boolean
          price_breakdown: Json | null
          reference: string
          selected_date: string | null
          status: Database["public"]["Enums"]["quote_status"]
          terms_accepted_at: string | null
          total_price: number | null
          total_volume_m3: number | null
          updated_at: string
        }
        Insert: {
          access_notes?: string | null
          category_hint?: string | null
          collection_window_end?: string | null
          collection_window_start?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_tier?: Database["public"]["Enums"]["cover_tier"]
          created_at?: string
          crew_size?: number | null
          customer_id?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          distance_miles?: number | null
          duration_minutes?: number | null
          email?: string | null
          expires_at?: string
          extended_cover_declared_value?: number | null
          extended_cover_notes?: string | null
          helper_included?: boolean
          id?: string
          marketing_opt_in?: boolean
          price_breakdown?: Json | null
          reference?: string
          selected_date?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          terms_accepted_at?: string | null
          total_price?: number | null
          total_volume_m3?: number | null
          updated_at?: string
        }
        Update: {
          access_notes?: string | null
          category_hint?: string | null
          collection_window_end?: string | null
          collection_window_start?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          cover_tier?: Database["public"]["Enums"]["cover_tier"]
          created_at?: string
          crew_size?: number | null
          customer_id?: string | null
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          distance_miles?: number | null
          duration_minutes?: number | null
          email?: string | null
          expires_at?: string
          extended_cover_declared_value?: number | null
          extended_cover_notes?: string | null
          helper_included?: boolean
          id?: string
          marketing_opt_in?: boolean
          price_breakdown?: Json | null
          reference?: string
          selected_date?: string | null
          status?: Database["public"]["Enums"]["quote_status"]
          terms_accepted_at?: string | null
          total_price?: number | null
          total_volume_m3?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      ratings: {
        Row: {
          care_of_goods_rating: number | null
          comment: string | null
          communication_rating: number | null
          created_at: string
          customer_id: string
          id: string
          job_id: string
          presentation_rating: number | null
          punctuality_rating: number | null
          rating: number
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          care_of_goods_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          presentation_rating?: number | null
          punctuality_rating?: number | null
          rating: number
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          care_of_goods_rating?: number | null
          comment?: string | null
          communication_rating?: number | null
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
          presentation_rating?: number | null
          punctuality_rating?: number | null
          rating?: number
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ratings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: true
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ratings_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      reservation_compensations: {
        Row: {
          amount: number
          created_at: string
          id: string
          reservation_id: string
          transport_partner_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reservation_id: string
          transport_partner_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reservation_id?: string
          transport_partner_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservation_compensations_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservation_compensations_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          date: string
          end_postcode: string | null
          end_time: string | null
          id: string
          max_price: number | null
          min_price: number | null
          start_postcode: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["reservation_status"]
          team_size: number | null
          transport_partner_id: string
          type: Database["public"]["Enums"]["reservation_type"]
          updated_at: string
          van_space_m3: number | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          date: string
          end_postcode?: string | null
          end_time?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          start_postcode?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          team_size?: number | null
          transport_partner_id: string
          type: Database["public"]["Enums"]["reservation_type"]
          updated_at?: string
          van_space_m3?: number | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          date?: string
          end_postcode?: string | null
          end_time?: string | null
          id?: string
          max_price?: number | null
          min_price?: number | null
          start_postcode?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["reservation_status"]
          team_size?: number | null
          transport_partner_id?: string
          type?: Database["public"]["Enums"]["reservation_type"]
          updated_at?: string
          van_space_m3?: number | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          date: string
          direction: Database["public"]["Enums"]["route_direction"]
          end_postcode: string
          id: string
          job_categories: string[] | null
          start_postcode: string
          team_size: number | null
          transport_partner_id: string
          updated_at: string
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          date: string
          direction?: Database["public"]["Enums"]["route_direction"]
          end_postcode: string
          id?: string
          job_categories?: string[] | null
          start_postcode: string
          team_size?: number | null
          transport_partner_id: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          date?: string
          direction?: Database["public"]["Enums"]["route_direction"]
          end_postcode?: string
          id?: string
          job_categories?: string[] | null
          start_postcode?: string
          team_size?: number | null
          transport_partner_id?: string
          updated_at?: string
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "routes_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routes_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          name: string
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      service_specialisations: {
        Row: {
          category: string
          created_at: string
          id: string
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          transport_partner_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "service_specialisations_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      status_logs: {
        Row: {
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          job_id: string
          occurred_at: string
          source: Database["public"]["Enums"]["status_log_source"]
          status: Database["public"]["Enums"]["job_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          job_id: string
          occurred_at?: string
          source?: Database["public"]["Enums"]["status_log_source"]
          status: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          job_id?: string
          occurred_at?: string
          source?: Database["public"]["Enums"]["status_log_source"]
          status?: Database["public"]["Enums"]["job_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "status_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_partner_payment_details: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_sort_code: string | null
          created_at: string
          id: string
          payment_methods_accepted: string[]
          transport_partner_id: string
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          created_at?: string
          id?: string
          payment_methods_accepted?: string[]
          transport_partner_id: string
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_sort_code?: string | null
          created_at?: string
          id?: string
          payment_methods_accepted?: string[]
          transport_partner_id?: string
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transport_partner_payment_details_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: true
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      transport_partners: {
        Row: {
          allow_bid_invitations: boolean
          business_description: string | null
          business_name: string
          category_preferences: string[]
          cmr_cover_amount: number | null
          cmr_insurance_doc_url: string | null
          company_type: string | null
          created_at: string
          goods_in_transit_cover_amount: number | null
          goods_in_transit_insurance_doc_url: string | null
          guidelines_accepted_at: string | null
          id: string
          notify_email: boolean
          notify_sms: boolean
          profile_id: string
          profile_photo_url: string | null
          published: boolean
          trade_associations: string[] | null
          updated_at: string
        }
        Insert: {
          allow_bid_invitations?: boolean
          business_description?: string | null
          business_name: string
          category_preferences?: string[]
          cmr_cover_amount?: number | null
          cmr_insurance_doc_url?: string | null
          company_type?: string | null
          created_at?: string
          goods_in_transit_cover_amount?: number | null
          goods_in_transit_insurance_doc_url?: string | null
          guidelines_accepted_at?: string | null
          id?: string
          notify_email?: boolean
          notify_sms?: boolean
          profile_id: string
          profile_photo_url?: string | null
          published?: boolean
          trade_associations?: string[] | null
          updated_at?: string
        }
        Update: {
          allow_bid_invitations?: boolean
          business_description?: string | null
          business_name?: string
          category_preferences?: string[]
          cmr_cover_amount?: number | null
          cmr_insurance_doc_url?: string | null
          company_type?: string | null
          created_at?: string
          goods_in_transit_cover_amount?: number | null
          goods_in_transit_insurance_doc_url?: string | null
          guidelines_accepted_at?: string | null
          id?: string
          notify_email?: boolean
          notify_sms?: boolean
          profile_id?: string
          profile_photo_url?: string | null
          published?: boolean
          trade_associations?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transport_partners_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string
          doc_type: Database["public"]["Enums"]["vehicle_doc_type"]
          file_url: string
          id: string
          updated_at: string
          uploaded_at: string
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          doc_type: Database["public"]["Enums"]["vehicle_doc_type"]
          file_url: string
          id?: string
          updated_at?: string
          uploaded_at?: string
          vehicle_id: string
        }
        Update: {
          created_at?: string
          doc_type?: Database["public"]["Enums"]["vehicle_doc_type"]
          file_url?: string
          id?: string
          updated_at?: string
          uploaded_at?: string
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicles: {
        Row: {
          admin_note: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          approval_status: Database["public"]["Enums"]["vehicle_approval_status"]
          base_lat: number | null
          base_lng: number | null
          base_postcode: string | null
          can_transport_motorbikes: boolean
          cargo_volume_m3: number | null
          created_at: string
          crew_capacity: number | null
          fuel_type: Database["public"]["Enums"]["fuel_type"] | null
          has_tail_lift: boolean
          id: string
          make: string | null
          max_load_length_m: number | null
          model: string | null
          payload_kg: number | null
          photo_url: string | null
          registration_number: string
          rejection_reason: string | null
          transport_partner_id: string
          updated_at: string
          uses_trailer: boolean
          vehicle_category: string | null
          vehicle_type: string | null
        }
        Insert: {
          admin_note?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          approval_status?: Database["public"]["Enums"]["vehicle_approval_status"]
          base_lat?: number | null
          base_lng?: number | null
          base_postcode?: string | null
          can_transport_motorbikes?: boolean
          cargo_volume_m3?: number | null
          created_at?: string
          crew_capacity?: number | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          has_tail_lift?: boolean
          id?: string
          make?: string | null
          max_load_length_m?: number | null
          model?: string | null
          payload_kg?: number | null
          photo_url?: string | null
          registration_number: string
          rejection_reason?: string | null
          transport_partner_id: string
          updated_at?: string
          uses_trailer?: boolean
          vehicle_category?: string | null
          vehicle_type?: string | null
        }
        Update: {
          admin_note?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          approval_status?: Database["public"]["Enums"]["vehicle_approval_status"]
          base_lat?: number | null
          base_lng?: number | null
          base_postcode?: string | null
          can_transport_motorbikes?: boolean
          cargo_volume_m3?: number | null
          created_at?: string
          crew_capacity?: number | null
          fuel_type?: Database["public"]["Enums"]["fuel_type"] | null
          has_tail_lift?: boolean
          id?: string
          make?: string | null
          max_load_length_m?: number | null
          model?: string | null
          payload_kg?: number | null
          photo_url?: string | null
          registration_number?: string
          rejection_reason?: string | null
          transport_partner_id?: string
          updated_at?: string
          uses_trailer?: boolean
          vehicle_category?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicles_admin_reviewed_by_fkey"
            columns: ["admin_reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicles_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_assign_job: {
        Args: {
          p_job_id: string
          p_transport_partner_id: string
          p_vehicle_id: string
        }
        Returns: Json
      }
      alert_matches: {
        Args: never
        Returns: {
          allocation_method: Database["public"]["Enums"]["allocation_method"]
          bid_count: number
          bidding_closes_at: string
          category: string
          collection_area: string
          collection_window_end: string
          collection_window_start: string
          customer_price: number
          delivery_area: string
          distance_miles: number
          job_id: string
          listed_at: string
          matched_search_name: string
        }[]
      }
      claim_job: {
        Args: { p_job_id: string; p_vehicle_id: string }
        Returns: Json
      }
      close_expired_auctions: { Args: never; Returns: undefined }
      expire_job_invitations: { Args: never; Returns: undefined }
      expire_unfilled_reservations: { Args: never; Returns: undefined }
      express_interest: {
        Args: { p_job_id: string; p_note?: string; p_vehicle_id: string }
        Returns: Json
      }
      find_auction_jobs: {
        Args: never
        Returns: {
          bid_count: number
          bidding_closes_at: string
          category: string
          collection_area: string
          collection_window_end: string
          collection_window_start: string
          customer_price: number
          delivery_area: string
          delivery_window_end: string
          delivery_window_start: string
          distance_miles: number
          id: string
          listed_at: string
          lowest_bid_amount: number
          my_bid_amount: number
          my_bid_status: Database["public"]["Enums"]["bid_status"]
          my_bid_vehicle_id: string
        }[]
      }
      find_express_interest_jobs: {
        Args: never
        Returns: {
          category: string
          collection_area: string
          collection_window_end: string
          collection_window_start: string
          customer_price: number
          delivery_area: string
          distance_miles: number
          id: string
          interest_count: number
          listed_at: string
          my_interest_status: string
          payout_amount: number
        }[]
      }
      find_work_jobs: {
        Args: { p_job_id?: string }
        Returns: {
          category: string
          collection_area: string
          collection_outward: string
          collection_window_end: string
          collection_window_start: string
          customer_price: number
          delivery_area: string
          delivery_outward: string
          delivery_window_end: string
          delivery_window_start: string
          distance_miles: number
          id: string
          listed_at: string
          payout_amount: number
        }[]
      }
      generate_quote_reference: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      job_interested_partners: {
        Args: { p_job_id: string }
        Returns: {
          business_name: string
          interest_id: string
          note: string
          submitted_at: string
        }[]
      }
      mark_messages_read: { Args: { p_job_id: string }; Returns: undefined }
      mark_notifications_read: { Args: never; Returns: undefined }
      my_bids: {
        Args: never
        Returns: {
          amount: number
          bid_id: string
          category: string
          collection_area: string
          delivery_area: string
          job_id: string
          matching_status: Database["public"]["Enums"]["matching_status"]
          status: Database["public"]["Enums"]["bid_status"]
          submitted_at: string
        }[]
      }
      my_job_invitations: {
        Args: never
        Returns: {
          category: string
          collection_area: string
          collection_window_end: string
          collection_window_start: string
          created_at: string
          customer_price: number
          delivery_area: string
          distance_miles: number
          expires_at: string
          invitation_id: string
          job_id: string
          payout_amount: number
          status: Database["public"]["Enums"]["invitation_status"]
          via_reservation: boolean
        }[]
      }
      my_message_threads: {
        Args: never
        Returns: {
          category: string
          counterpart_name: string
          job_id: string
          job_title: string
          last_message_at: string
          last_message_body: string
          unread_count: number
        }[]
      }
      my_performance_summary: {
        Args: never
        Returns: {
          active_performance_plan: boolean
          average_rating: number
          booster_eligible: boolean
          deallocation_count: number
          deallocation_total_amount: number
          express_pay_eligible: boolean
          job_access_blocked: boolean
          job_access_probation: boolean
          jobs_last_30_days: number
          jobs_until_full_access: number
          member_since: string
          rating_count: number
          total_jobs: number
        }[]
      }
      my_route_recommendations: {
        Args: never
        Returns: {
          allocation_method: Database["public"]["Enums"]["allocation_method"]
          category: string
          collection_area: string
          collection_window_end: string
          collection_window_start: string
          customer_price: number
          delivery_area: string
          distance_miles: number
          job_id: string
          recommendation_id: string
          route_id: string
          sent_at: string
          status: Database["public"]["Enums"]["job_recommendation_status"]
        }[]
      }
      my_watchlist: {
        Args: never
        Returns: {
          allocation_method: Database["public"]["Enums"]["allocation_method"]
          bid_count: number
          bidding_closes_at: string
          category: string
          collection_area: string
          collection_window_end: string
          collection_window_start: string
          created_at: string
          customer_price: number
          delivery_area: string
          distance_miles: number
          job_id: string
          matching_status: Database["public"]["Enums"]["matching_status"]
          watchlist_id: string
        }[]
      }
      partner_reviews: {
        Args: never
        Returns: {
          care_of_goods_rating: number
          category: string
          comment: string
          communication_rating: number
          created_at: string
          customer_name: string
          job_id: string
          overall_rating: number
          presentation_rating: number
          punctuality_rating: number
          rating_id: string
        }[]
      }
      respond_to_job_invitation: {
        Args: {
          p_accept: boolean
          p_invitation_id: string
          p_vehicle_id?: string
        }
        Returns: Json
      }
      select_interested_partner: {
        Args: { p_interest_id: string; p_job_id: string }
        Returns: Json
      }
      submit_bid: {
        Args: { p_amount: number; p_job_id: string; p_vehicle_id: string }
        Returns: Json
      }
    }
    Enums: {
      allocation_method:
        | "click_claim"
        | "express_interest"
        | "auction"
        | "reservation"
        | "route_matcher"
      bid_status: "pending" | "won" | "lost" | "expired"
      cover_tier: "standard" | "extended_requested"
      customer_payment_status:
        | "unpaid"
        | "pending"
        | "succeeded"
        | "failed"
        | "refunded"
      dispute_status: "none" | "submitted" | "resolved"
      driver_status: "active" | "inactive"
      floor_level:
        | "basement"
        | "ground"
        | "first"
        | "second"
        | "third"
        | "fourth"
        | "fifth"
        | "sixth"
        | "above_sixth"
      fuel_type: "diesel" | "petrol" | "electric" | "hybrid"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
      item_category:
        | "sofas"
        | "wardrobes"
        | "boxes_bags"
        | "beds_mattresses"
        | "tables"
        | "televisions"
        | "appliances"
        | "chairs"
      job_recommendation_status: "sent" | "accepted" | "declined"
      job_status:
        | "assigned"
        | "en_route_to_collection"
        | "arrived_at_collection"
        | "documentation_complete_collection"
        | "collection_complete"
        | "in_transit"
        | "arrived_at_delivery"
        | "documentation_complete_delivery"
        | "delivery_complete"
      lead_status: "new" | "contacted" | "converted" | "archived"
      matching_status: "draft" | "listed" | "matched" | "cancelled"
      payment_status: "scheduled" | "pending" | "transferred"
      photo_stage: "collection" | "delivery"
      pmp_status: "active" | "resolved" | "terminated"
      quote_status: "in_progress" | "converted" | "abandoned"
      reservation_status:
        | "pending"
        | "accepted"
        | "partially_matched"
        | "fully_booked"
        | "expired"
      reservation_type: "full_day" | "custom"
      route_direction: "outbound" | "return" | "both"
      status_log_source: "auto" | "manual"
      user_role: "customer" | "partner" | "driver" | "admin"
      vehicle_approval_status:
        | "draft"
        | "submitted"
        | "under_review"
        | "approved"
        | "rejected"
      vehicle_doc_type: "log_book" | "mot" | "v5"
      work_type: "single" | "journey" | "auction"
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
      allocation_method: [
        "click_claim",
        "express_interest",
        "auction",
        "reservation",
        "route_matcher",
      ],
      bid_status: ["pending", "won", "lost", "expired"],
      cover_tier: ["standard", "extended_requested"],
      customer_payment_status: [
        "unpaid",
        "pending",
        "succeeded",
        "failed",
        "refunded",
      ],
      dispute_status: ["none", "submitted", "resolved"],
      driver_status: ["active", "inactive"],
      floor_level: [
        "basement",
        "ground",
        "first",
        "second",
        "third",
        "fourth",
        "fifth",
        "sixth",
        "above_sixth",
      ],
      fuel_type: ["diesel", "petrol", "electric", "hybrid"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
      item_category: [
        "sofas",
        "wardrobes",
        "boxes_bags",
        "beds_mattresses",
        "tables",
        "televisions",
        "appliances",
        "chairs",
      ],
      job_recommendation_status: ["sent", "accepted", "declined"],
      job_status: [
        "assigned",
        "en_route_to_collection",
        "arrived_at_collection",
        "documentation_complete_collection",
        "collection_complete",
        "in_transit",
        "arrived_at_delivery",
        "documentation_complete_delivery",
        "delivery_complete",
      ],
      lead_status: ["new", "contacted", "converted", "archived"],
      matching_status: ["draft", "listed", "matched", "cancelled"],
      payment_status: ["scheduled", "pending", "transferred"],
      photo_stage: ["collection", "delivery"],
      pmp_status: ["active", "resolved", "terminated"],
      quote_status: ["in_progress", "converted", "abandoned"],
      reservation_status: [
        "pending",
        "accepted",
        "partially_matched",
        "fully_booked",
        "expired",
      ],
      reservation_type: ["full_day", "custom"],
      route_direction: ["outbound", "return", "both"],
      status_log_source: ["auto", "manual"],
      user_role: ["customer", "partner", "driver", "admin"],
      vehicle_approval_status: [
        "draft",
        "submitted",
        "under_review",
        "approved",
        "rejected",
      ],
      vehicle_doc_type: ["log_book", "mot", "v5"],
      work_type: ["single", "journey", "auction"],
    },
  },
} as const
