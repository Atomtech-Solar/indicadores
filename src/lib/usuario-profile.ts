import { supabase } from "@/lib/supabase/client";

export async function upsertUsuarioProfile(input: { nome: string; whatsapp: string }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("Sessão necessária para salvar o perfil.");

  const { error } = await supabase.from("usuarios").upsert(
    {
      usuario_id: session.user.id,
      nome: input.nome,
      whatsapp: input.whatsapp,
    },
    { onConflict: "usuario_id" },
  );
  if (error) throw error;
}

export async function fetchUsuarioRow() {
  const { data, error } = await supabase.from("usuarios").select("*").maybeSingle();
  if (error) throw error;
  return data;
}
