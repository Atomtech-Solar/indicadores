-- Fotos adicionais na indicação (até 4 anexos no total: conta, padrão, 2 extras).

ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS foto_extra_1_url text,
  ADD COLUMN IF NOT EXISTS foto_extra_2_url text;

COMMENT ON COLUMN public.indicacoes.foto_extra_1_url IS
  'Caminho opcional de imagem extra no bucket indicacoes-comprovantes.';
COMMENT ON COLUMN public.indicacoes.foto_extra_2_url IS
  'Caminho opcional de segunda imagem extra no bucket indicacoes-comprovantes.';

GRANT UPDATE (foto_extra_1_url, foto_extra_2_url) ON public.indicacoes TO authenticated;
