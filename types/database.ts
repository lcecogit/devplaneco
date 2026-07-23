// Auto-generated from the live Supabase schema — do not edit by hand.
// Regenerate with: npm run types:generate

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
          dispute_status: Database["public"]["Enums"]["dispute_status"]
          id: string
          job_id: string | null
          reason: string | null
          reservation_id: string | null
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          dispute_status?: Database["public"]["Enums"]["dispute_status"]
          id?: string
          job_id?: string | null
          reason?: string | null
          reservation_id?: string | null
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          dispute_status?: Database["public"]["Enums"]["dispute_status"]
          id?: string
          job_id?: string | null
          reason?: string | null
          reservation_id?: string | null
          transport_partner_id?: string
          updated_at?: string
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
      job_invitations: {
        Row: {
          created_at: string
          id: string
          job_id: string
          status: Database["public"]["Enums"]["invitation_status"]
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          job_id: string
          status?: Database["public"]["Enums"]["invitation_status"]
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          job_id?: string
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
            foreignKeyName: "job_invitations_transport_partner_id_fkey"
            columns: ["transport_partner_id"]
            isOneToOne: false
            referencedRelation: "transport_partners"
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
          allocation_method: Database["public"]["Enums"]["allocation_method"]
          category: string | null
          collection_address: string | null
          collection_postcode: string
          collection_window_end: string | null
          collection_window_start: string | null
          created_at: string
          customer_id: string
          customer_price: number | null
          delivery_address: string | null
          delivery_postcode: string
          delivery_window_end: string | null
          delivery_window_start: string | null
          distance_miles: number | null
          estimated_duration_minutes: number | null
          id: string
          listed_at: string
          payout_amount: number | null
          status: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Insert: {
          allocation_method: Database["public"]["Enums"]["allocation_method"]
          category?: string | null
          collection_address?: string | null
          collection_postcode: string
          collection_window_end?: string | null
          collection_window_start?: string | null
          created_at?: string
          customer_id: string
          customer_price?: number | null
          delivery_address?: string | null
          delivery_postcode: string
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          distance_miles?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          listed_at?: string
          payout_amount?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title: string
          updated_at?: string
          work_type: Database["public"]["Enums"]["work_type"]
        }
        Update: {
          allocation_method?: Database["public"]["Enums"]["allocation_method"]
          category?: string | null
          collection_address?: string | null
          collection_postcode?: string
          collection_window_end?: string | null
          collection_window_start?: string | null
          created_at?: string
          customer_id?: string
          customer_price?: number | null
          delivery_address?: string | null
          delivery_postcode?: string
          delivery_window_end?: string | null
          delivery_window_start?: string | null
          distance_miles?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          listed_at?: string
          payout_amount?: number | null
          status?: Database["public"]["Enums"]["job_status"] | null
          title?: string
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
      ratings: {
        Row: {
          comment: string | null
          created_at: string
          customer_id: string
          id: string
          job_id: string
          rating: number
          transport_partner_id: string
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          customer_id: string
          id?: string
          job_id: string
          rating: number
          transport_partner_id: string
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          customer_id?: string
          id?: string
          job_id?: string
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
      transport_partners: {
        Row: {
          allow_bid_invitations: boolean
          business_description: string | null
          business_name: string
          cmr_insurance_doc_url: string | null
          company_type: string | null
          created_at: string
          goods_in_transit_insurance_doc_url: string | null
          id: string
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
          cmr_insurance_doc_url?: string | null
          company_type?: string | null
          created_at?: string
          goods_in_transit_insurance_doc_url?: string | null
          id?: string
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
          cmr_insurance_doc_url?: string | null
          company_type?: string | null
          created_at?: string
          goods_in_transit_insurance_doc_url?: string | null
          id?: string
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
          transport_partner_id: string
          updated_at: string
          uses_trailer: boolean
          vehicle_category: string | null
          vehicle_type: string | null
        }
        Insert: {
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
          transport_partner_id: string
          updated_at?: string
          uses_trailer?: boolean
          vehicle_category?: string | null
          vehicle_type?: string | null
        }
        Update: {
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
          transport_partner_id?: string
          updated_at?: string
          uses_trailer?: boolean
          vehicle_category?: string | null
          vehicle_type?: string | null
        }
        Relationships: [
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
      is_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      allocation_method:
        | "click_claim"
        | "express_interest"
        | "auction"
        | "reservation"
        | "route_matcher"
      bid_status: "pending" | "won" | "lost" | "expired"
      dispute_status: "none" | "submitted" | "resolved"
      driver_status: "active" | "inactive"
      fuel_type: "diesel" | "petrol" | "electric" | "hybrid"
      invitation_status: "pending" | "accepted" | "declined" | "expired"
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
      payment_status: "scheduled" | "pending" | "transferred"
      photo_stage: "collection" | "delivery"
      pmp_status: "active" | "resolved" | "terminated"
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
      dispute_status: ["none", "submitted", "resolved"],
      driver_status: ["active", "inactive"],
      fuel_type: ["diesel", "petrol", "electric", "hybrid"],
      invitation_status: ["pending", "accepted", "declined", "expired"],
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
      payment_status: ["scheduled", "pending", "transferred"],
      photo_stage: ["collection", "delivery"],
      pmp_status: ["active", "resolved", "terminated"],
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
