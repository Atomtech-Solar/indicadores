export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      atividades: {
        Row: {
          created_at: string;
          descricao: string;
          id: number;
          tipo: string;
          usuario_id: number;
        };
        Insert: {
          created_at?: string;
          descricao: string;
          id?: number;
          tipo: string;
          usuario_id: number;
        };
        Update: {
          created_at?: string;
          descricao?: string;
          id?: number;
          tipo?: string;
          usuario_id?: number;
        };
        Relationships: [
          {
            foreignKeyName: "atividades_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      comissoes: {
        Row: {
          created_at: string;
          data_pagamento: string | null;
          id: number;
          indicacao_id: number;
          status: string;
          updated_at: string;
          usuario_id: number;
          valor: number;
        };
        Insert: {
          created_at?: string;
          data_pagamento?: string | null;
          id?: number;
          indicacao_id: number;
          status: string;
          updated_at?: string;
          usuario_id: number;
          valor: number;
        };
        Update: {
          created_at?: string;
          data_pagamento?: string | null;
          id?: number;
          indicacao_id?: number;
          status?: string;
          updated_at?: string;
          usuario_id?: number;
          valor?: number;
        };
        Relationships: [
          {
            foreignKeyName: "comissoes_indicacao_id_fkey";
            columns: ["indicacao_id"];
            isOneToOne: false;
            referencedRelation: "indicacoes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "comissoes_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      indicacoes: {
        Row: {
          conta_energia_url: string | null;
          created_at: string;
          foto_extra_1_url: string | null;
          foto_extra_2_url: string | null;
          foto_padrao_url: string | null;
          id: number;
          nome_indicado: string;
          observacoes: string | null;
          status: string;
          tipo_projeto: string | null;
          tipo: string;
          usuario_id: number;
          updated_at: string;
          valor_comissao: number | null;
          valor_potencial: number | null;
          valor_projeto: number | null;
          whatsapp: string;
        };
        Insert: {
          conta_energia_url?: string | null;
          created_at?: string;
          foto_extra_1_url?: string | null;
          foto_extra_2_url?: string | null;
          foto_padrao_url?: string | null;
          id?: number;
          nome_indicado: string;
          observacoes?: string | null;
          status?: string;
          tipo_projeto?: string | null;
          tipo: string;
          usuario_id: number;
          updated_at?: string;
          valor_comissao?: number | null;
          valor_potencial?: number | null;
          valor_projeto?: number | null;
          whatsapp: string;
        };
        Update: {
          conta_energia_url?: string | null;
          created_at?: string;
          foto_extra_1_url?: string | null;
          foto_extra_2_url?: string | null;
          foto_padrao_url?: string | null;
          id?: number;
          nome_indicado?: string;
          observacoes?: string | null;
          status?: string;
          tipo_projeto?: string | null;
          tipo?: string;
          usuario_id?: number;
          updated_at?: string;
          valor_comissao?: number | null;
          valor_potencial?: number | null;
          valor_projeto?: number | null;
          whatsapp?: string;
        };
        Relationships: [
          {
            foreignKeyName: "indicacoes_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      admin_messages: {
        Row: {
          category: string;
          content: string;
          created_at: string;
          created_by: number;
          id: number;
          is_favorite: boolean;
          title: string;
          updated_at: string;
          usage_count: number;
        };
        Insert: {
          category: string;
          content: string;
          created_at?: string;
          created_by: number;
          id?: number;
          is_favorite?: boolean;
          title: string;
          updated_at?: string;
          usage_count?: number;
        };
        Update: {
          category?: string;
          content?: string;
          created_at?: string;
          created_by?: number;
          id?: number;
          is_favorite?: boolean;
          title?: string;
          updated_at?: string;
          usage_count?: number;
        };
        Relationships: [
          {
            foreignKeyName: "admin_messages_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      notificacoes: {
        Row: {
          ator_nome: string | null;
          ator_usuario_id: number | null;
          created_at: string;
          destinatario_usuario_id: number;
          entidade_id: number | null;
          entidade_tipo: string | null;
          evento: string;
          id: number;
          lida: boolean;
          mensagem: string;
          metadata: Json;
          titulo: string;
        };
        Insert: {
          ator_nome?: string | null;
          ator_usuario_id?: number | null;
          created_at?: string;
          destinatario_usuario_id: number;
          entidade_id?: number | null;
          entidade_tipo?: string | null;
          evento: string;
          id?: number;
          lida?: boolean;
          mensagem: string;
          metadata?: Json;
          titulo: string;
        };
        Update: {
          ator_nome?: string | null;
          ator_usuario_id?: number | null;
          created_at?: string;
          destinatario_usuario_id?: number;
          entidade_id?: number | null;
          entidade_tipo?: string | null;
          evento?: string;
          id?: number;
          lida?: boolean;
          mensagem?: string;
          metadata?: Json;
          titulo?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notificacoes_ator_usuario_id_fkey";
            columns: ["ator_usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notificacoes_destinatario_usuario_id_fkey";
            columns: ["destinatario_usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          },
        ];
      };
      usuarios: {
        Row: {
          created_at: string;
          foto_perfil_url: string | null;
          id: number;
          nome: string;
          role: string;
          usuario_id: string;
          whatsapp: string;
        };
        Insert: {
          created_at?: string;
          foto_perfil_url?: string | null;
          id?: number;
          nome: string;
          role?: string;
          usuario_id: string;
          whatsapp: string;
        };
        Update: {
          created_at?: string;
          foto_perfil_url?: string | null;
          id?: number;
          nome?: string;
          role?: string;
          usuario_id?: string;
          whatsapp?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      admin_delete_indicacao: {
        Args: { target_id: number };
        Returns: null;
      };
      get_admin_dashboard_summary: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_faturamento: number;
          faturamento_mes: number;
          total_comissoes_pagas: number;
          total_indicacoes: number;
          total_indicadores: number;
        }[];
      };
      get_admin_reports: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      get_my_usuario_id: { Args: Record<PropertyKey, never>; Returns: number };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
