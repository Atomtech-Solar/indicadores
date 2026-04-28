-- Campo adicional para upload da foto do padrão

ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS foto_padrao_url text;

COMMENT ON COLUMN public.indicacoes.foto_padrao_url IS
  'Caminho do arquivo da foto do padrão no bucket storage.indicacoes-comprovantes.';
