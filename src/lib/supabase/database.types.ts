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
          id: number;
          indicacao_id: number;
          status: string;
          usuario_id: number;
          valor: number;
        };
        Insert: {
          created_at?: string;
          id?: number;
          indicacao_id: number;
          status: string;
          usuario_id: number;
          valor: number;
        };
        Update: {
          created_at?: string;
          id?: number;
          indicacao_id?: number;
          status?: string;
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
          created_at: string;
          id: number;
          nome_indicado: string;
          status: string;
          tipo: string;
          usuario_id: number;
          valor_comissao: number | null;
          valor_potencial: number;
          whatsapp: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          nome_indicado: string;
          status?: string;
          tipo: string;
          usuario_id: number;
          valor_comissao?: number | null;
          valor_potencial?: number;
          whatsapp: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          nome_indicado?: string;
          status?: string;
          tipo?: string;
          usuario_id?: number;
          valor_comissao?: number | null;
          valor_potencial?: number;
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
      usuarios: {
        Row: {
          created_at: string;
          id: number;
          nome: string;
          usuario_id: string;
          whatsapp: string;
        };
        Insert: {
          created_at?: string;
          id?: number;
          nome: string;
          usuario_id: string;
          whatsapp: string;
        };
        Update: {
          created_at?: string;
          id?: number;
          nome?: string;
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
