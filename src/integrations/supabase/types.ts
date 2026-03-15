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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      binui_projects: {
        Row: {
          category: string
          consultant_notes: Json
          created: string
          created_at: string
          details: Json
          history: Json
          id: number
          images: Json
          name: string
          note: string
          status: string
          sub: string
        }
        Insert: {
          category: string
          consultant_notes?: Json
          created: string
          created_at?: string
          details?: Json
          history?: Json
          id?: never
          images?: Json
          name: string
          note?: string
          status?: string
          sub: string
        }
        Update: {
          category?: string
          consultant_notes?: Json
          created?: string
          created_at?: string
          details?: Json
          history?: Json
          id?: never
          images?: Json
          name?: string
          note?: string
          status?: string
          sub?: string
        }
        Relationships: []
      }
      generic_projects: {
        Row: {
          category: string
          created: string
          created_at: string
          decision: string
          description: string
          document: string
          domain: string
          history: Json
          id: number
          image: string | null
          initiator: string
          link: string
          name: string
          note: string
          poem: string
          poetic_name: string
          status: string
          sub: string
          task: string
          tracking: Json
          view_link: string
        }
        Insert: {
          category: string
          created: string
          created_at?: string
          decision?: string
          description?: string
          document?: string
          domain: string
          history?: Json
          id?: never
          image?: string | null
          initiator?: string
          link?: string
          name: string
          note?: string
          poem?: string
          poetic_name?: string
          status?: string
          sub: string
          task?: string
          tracking?: Json
          view_link?: string
        }
        Update: {
          category?: string
          created?: string
          created_at?: string
          decision?: string
          description?: string
          document?: string
          domain?: string
          history?: Json
          id?: never
          image?: string | null
          initiator?: string
          link?: string
          name?: string
          note?: string
          poem?: string
          poetic_name?: string
          status?: string
          sub?: string
          task?: string
          tracking?: Json
          view_link?: string
        }
        Relationships: []
      }
      idea_cards: {
        Row: {
          created_at: string
          id: number
          image_url: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: never
          image_url?: string
          name?: string
        }
        Update: {
          created_at?: string
          id?: never
          image_url?: string
          name?: string
        }
        Relationships: []
      }
      project_attachments: {
        Row: {
          created_at: string
          file_url: string
          id: number
          name: string
          project_id: number
          project_type: string
        }
        Insert: {
          created_at?: string
          file_url: string
          id?: never
          name: string
          project_id: number
          project_type: string
        }
        Update: {
          created_at?: string
          file_url?: string
          id?: never
          name?: string
          project_id?: number
          project_type?: string
        }
        Relationships: []
      }
      tabaot: {
        Row: {
          consultant_notes: Json
          created_at: string
          id: number
          instructions_url: string
          note: string
          plan_name: string
          quarter: string
          tashrit_url: string
        }
        Insert: {
          consultant_notes?: Json
          created_at?: string
          id?: never
          instructions_url?: string
          note?: string
          plan_name?: string
          quarter?: string
          tashrit_url?: string
        }
        Update: {
          consultant_notes?: Json
          created_at?: string
          id?: never
          instructions_url?: string
          note?: string
          plan_name?: string
          quarter?: string
          tashrit_url?: string
        }
        Relationships: []
      }
      archi_activity_log: {
        Row: {
          id: string
          project_id: string
          actor_type: 'architect' | 'client' | 'contractor'
          actor_id: string
          action: string
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          actor_type: 'architect' | 'client' | 'contractor'
          actor_id: string
          action: string
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          actor_type?: 'architect' | 'client' | 'contractor'
          actor_id?: string
          action?: string
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_activity_log_project_id_fkey'; columns: ['project_id']; referencedRelation: 'archi_projects'; referencedColumns: ['id'] }
        ]
      }
      archi_clients: {
        Row: {
          id: string
          project_id: string
          full_name: string
          email: string | null
          phone: string | null
          access_token: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          full_name: string
          email?: string | null
          phone?: string | null
          access_token?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          full_name?: string
          email?: string | null
          phone?: string | null
          access_token?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_clients_project_id_fkey'; columns: ['project_id']; referencedRelation: 'archi_projects'; referencedColumns: ['id'] }
        ]
      }
      archi_contractors: {
        Row: {
          id: string
          project_id: string
          full_name: string
          company_name: string | null
          role: string | null
          email: string | null
          access_token: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          full_name: string
          company_name?: string | null
          role?: string | null
          email?: string | null
          access_token?: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          full_name?: string
          company_name?: string | null
          role?: string | null
          email?: string | null
          access_token?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_contractors_project_id_fkey'; columns: ['project_id']; referencedRelation: 'archi_projects'; referencedColumns: ['id'] }
        ]
      }
      archi_documents: {
        Row: {
          id: string
          project_id: string
          stage_id: string | null
          name: string
          file_url: string
          uploaded_by: string
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          stage_id?: string | null
          name: string
          file_url: string
          uploaded_by: string
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          stage_id?: string | null
          name?: string
          file_url?: string
          uploaded_by?: string
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_documents_project_id_fkey'; columns: ['project_id']; referencedRelation: 'archi_projects'; referencedColumns: ['id'] },
          { foreignKeyName: 'archi_documents_stage_id_fkey'; columns: ['stage_id']; referencedRelation: 'archi_stages'; referencedColumns: ['id'] },
          { foreignKeyName: 'archi_documents_uploaded_by_fkey'; columns: ['uploaded_by']; referencedRelation: 'archi_users'; referencedColumns: ['id'] }
        ]
      }
      archi_payments: {
        Row: {
          id: string
          project_id: string
          stage_id: string
          amount: number
          status: 'pending' | 'awaiting_approval' | 'approved' | 'paid' | 'overdue'
          due_date: string | null
          approved_at: string | null
          paid_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          stage_id: string
          amount?: number
          status?: 'pending' | 'awaiting_approval' | 'approved' | 'paid' | 'overdue'
          due_date?: string | null
          approved_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          stage_id?: string
          amount?: number
          status?: 'pending' | 'awaiting_approval' | 'approved' | 'paid' | 'overdue'
          due_date?: string | null
          approved_at?: string | null
          paid_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_payments_project_id_fkey'; columns: ['project_id']; referencedRelation: 'archi_projects'; referencedColumns: ['id'] },
          { foreignKeyName: 'archi_payments_stage_id_fkey'; columns: ['stage_id']; referencedRelation: 'archi_stages'; referencedColumns: ['id'] }
        ]
      }
      archi_projects: {
        Row: {
          id: string
          name: string
          client_id: string | null
          owner_id: string
          status: 'active' | 'completed' | 'archived'
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          client_id?: string | null
          owner_id: string
          status?: 'active' | 'completed' | 'archived'
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          client_id?: string | null
          owner_id?: string
          status?: 'active' | 'completed' | 'archived'
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_projects_client_id_fkey'; columns: ['client_id']; referencedRelation: 'archi_clients'; referencedColumns: ['id'] },
          { foreignKeyName: 'archi_projects_owner_id_fkey'; columns: ['owner_id']; referencedRelation: 'archi_users'; referencedColumns: ['id'] }
        ]
      }
      archi_stages: {
        Row: {
          id: string
          project_id: string
          name: string
          order_index: number
          status: 'pending' | 'in_progress' | 'completed'
          fee_amount: number
          completed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          order_index?: number
          status?: 'pending' | 'in_progress' | 'completed'
          fee_amount?: number
          completed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          order_index?: number
          status?: 'pending' | 'in_progress' | 'completed'
          fee_amount?: number
          completed_at?: string | null
          created_at?: string
        }
        Relationships: [
          { foreignKeyName: 'archi_stages_project_id_fkey'; columns: ['project_id']; referencedRelation: 'archi_projects'; referencedColumns: ['id'] }
        ]
      }
      archi_users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'architect' | 'team_member'
          plan: 'free' | 'pro' | 'studio'
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: 'architect' | 'team_member'
          plan?: 'free' | 'pro' | 'studio'
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string
          role?: 'architect' | 'team_member'
          plan?: 'free' | 'pro' | 'studio'
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      archi_client_approve_payment: {
        Args: { p_token: string; p_payment_id: string }
        Returns: Json
      }
      archi_client_portal: {
        Args: { p_token: string }
        Returns: Json
      }
      archi_contractor_portal: {
        Args: { p_token: string }
        Returns: Json
      }
      archi_create_default_stages: {
        Args: { p_project_id: string }
        Returns: undefined
      }
    }
    Enums: {
      archi_actor_type: 'architect' | 'client' | 'contractor'
      archi_payment_status: 'pending' | 'awaiting_approval' | 'approved' | 'paid' | 'overdue'
      archi_project_status: 'active' | 'completed' | 'archived'
      archi_stage_status: 'pending' | 'in_progress' | 'completed'
      archi_user_plan: 'free' | 'pro' | 'studio'
      archi_user_role: 'architect' | 'team_member'
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
      archi_actor_type: ['architect', 'client', 'contractor'] as const,
      archi_payment_status: ['pending', 'awaiting_approval', 'approved', 'paid', 'overdue'] as const,
      archi_project_status: ['active', 'completed', 'archived'] as const,
      archi_stage_status: ['pending', 'in_progress', 'completed'] as const,
      archi_user_plan: ['free', 'pro', 'studio'] as const,
      archi_user_role: ['architect', 'team_member'] as const,
    },
  },
} as const
