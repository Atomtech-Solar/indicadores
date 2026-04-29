-- Permite ao indicador editar apenas nome/whatsapp das próprias indicações.
-- Mantém modelo Zero Trust via RLS.

-- Grant de UPDATE apenas nas colunas de contato e anexos.
GRANT UPDATE (nome_indicado, whatsapp, conta_energia_url, foto_padrao_url) ON public.indicacoes TO authenticated;

-- Política de update: admin pode tudo, indicador apenas as próprias linhas.
DROP POLICY IF EXISTS indicacoes_update_own_contact ON public.indicacoes;
CREATE POLICY indicacoes_update_own_contact ON public.indicacoes
  FOR UPDATE TO authenticated
  USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = indicacoes.usuario_id
        AND u.usuario_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1
      FROM public.usuarios u
      WHERE u.id = indicacoes.usuario_id
        AND u.usuario_id = auth.uid()
    )
  );
