-- ETAPA 1 — INDICACOES

ALTER TABLE public.indicacoes
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

COMMENT ON COLUMN public.indicacoes.valor_comissao IS
  'DEPRECATED: manter apenas para compatibilidade legada. Controle de comissão deve ocorrer em public.comissoes.';

COMMENT ON COLUMN public.indicacoes.status IS
  'Fluxo esperado: enviado -> analise -> negociacao -> fechado/perdido.';

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_indicacoes_set_updated_at ON public.indicacoes;
CREATE TRIGGER trg_indicacoes_set_updated_at
  BEFORE UPDATE ON public.indicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.indicacoes_enforce_usuario_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_usuario_id bigint;
BEGIN
  v_usuario_id := public.get_my_usuario_id();
  IF v_usuario_id IS NULL THEN
    RAISE EXCEPTION 'usuario_id_not_found_for_authenticated_user';
  END IF;

  NEW.usuario_id := v_usuario_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_indicacoes_enforce_usuario_id ON public.indicacoes;
CREATE TRIGGER trg_indicacoes_enforce_usuario_id
  BEFORE INSERT ON public.indicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.indicacoes_enforce_usuario_id();

-- ETAPA 2 — COMISSOES

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.comissoes
    GROUP BY indicacao_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'duplicate_comissoes_for_same_indicacao';
  END IF;
END;
$$;

ALTER TABLE public.comissoes
  ADD COLUMN IF NOT EXISTS data_pagamento timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'comissoes_indicacao_id_unique'
      AND conrelid = 'public.comissoes'::regclass
  ) THEN
    ALTER TABLE public.comissoes
      ADD CONSTRAINT comissoes_indicacao_id_unique UNIQUE (indicacao_id);
  END IF;
END;
$$;

COMMENT ON COLUMN public.comissoes.status IS
  'Status financeiro: pendente = ainda nao aprovado; disponivel = liberado para saque; pago = ja pago.';

DROP TRIGGER IF EXISTS trg_comissoes_set_updated_at ON public.comissoes;
CREATE TRIGGER trg_comissoes_set_updated_at
  BEFORE UPDATE ON public.comissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ETAPA 3 — ATIVIDADES

ALTER TABLE public.atividades
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ETAPA 4 — RATE LIMIT TABLES

CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.rate_limits
  WHERE created_at < now() - interval '1 day';

  DELETE FROM public.otp_rate_limits
  WHERE created_at < now() - interval '1 day';
END;
$$;

-- ETAPA 6 — COMENTARIOS DE DOCUMENTACAO

COMMENT ON TABLE public.indicacoes IS 'Tabela principal de leads indicados';
COMMENT ON TABLE public.comissoes IS 'Controle financeiro das indicações';
COMMENT ON TABLE public.atividades IS 'Log de eventos do usuário';
COMMENT ON TABLE public.usuarios IS 'Perfil vinculado ao auth.users';
