-- Applied remotely via Supabase; kept for version control.
-- Project: Indicadores (bnmumsdjmfabovbjxdvb)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.usuarios (
  id bigserial PRIMARY KEY,
  usuario_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  nome text NOT NULL,
  whatsapp text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.indicacoes (
  id bigserial PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  nome_indicado text NOT NULL,
  whatsapp text NOT NULL,
  tipo text NOT NULL CHECK (tipo IN ('pessoa', 'empresa')),
  status text NOT NULL DEFAULT 'enviado' CHECK (status IN ('enviado', 'analise', 'negociacao', 'fechado', 'perdido')),
  valor_potencial numeric NOT NULL DEFAULT 0,
  valor_comissao numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.comissoes (
  id bigserial PRIMARY KEY,
  indicacao_id bigint NOT NULL REFERENCES public.indicacoes (id) ON DELETE CASCADE,
  usuario_id bigint NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  valor numeric NOT NULL,
  status text NOT NULL CHECK (status IN ('pendente', 'disponivel', 'pago')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.atividades (
  id bigserial PRIMARY KEY,
  usuario_id bigint NOT NULL REFERENCES public.usuarios (id) ON DELETE CASCADE,
  tipo text NOT NULL,
  descricao text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_indicacoes_usuario_id ON public.indicacoes (usuario_id);
CREATE INDEX idx_comissoes_usuario_id ON public.comissoes (usuario_id);
CREATE INDEX idx_comissoes_indicacao_id ON public.comissoes (indicacao_id);
CREATE INDEX idx_atividades_usuario_id ON public.atividades (usuario_id);

CREATE OR REPLACE FUNCTION public.indicacoes_set_defaults ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tipo := lower(trim(NEW.tipo));
  IF NEW.tipo NOT IN ('pessoa', 'empresa') THEN
    RAISE EXCEPTION 'invalid tipo';
  END IF;
  NEW.status := 'enviado';
  NEW.valor_comissao := NULL;
  IF NEW.tipo = 'empresa' THEN
    NEW.valor_potencial := 1500;
  ELSE
    NEW.valor_potencial := 750;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_indicacoes_set_defaults ON public.indicacoes;
CREATE TRIGGER trg_indicacoes_set_defaults
  BEFORE INSERT ON public.indicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.indicacoes_set_defaults ();

CREATE OR REPLACE FUNCTION public.log_indicacao_criada ()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.atividades (usuario_id, tipo, descricao)
  VALUES (NEW.usuario_id, 'indicacao_criada', 'Indicação registrada: ' || NEW.nome_indicado);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_indicacoes_log ON public.indicacoes;
CREATE TRIGGER trg_indicacoes_log
  AFTER INSERT ON public.indicacoes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_indicacao_criada ();

CREATE OR REPLACE FUNCTION public.get_my_usuario_id ()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT u.id
  FROM public.usuarios u
  WHERE u.usuario_id = auth.uid ()
  LIMIT 1;
$$;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.indicacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comissoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

CREATE POLICY usuarios_select_own ON public.usuarios
  FOR SELECT TO authenticated
  USING (usuario_id = auth.uid ());

CREATE POLICY usuarios_insert_own ON public.usuarios
  FOR INSERT TO authenticated
  WITH CHECK (usuario_id = auth.uid ());

CREATE POLICY usuarios_update_own ON public.usuarios
  FOR UPDATE TO authenticated
  USING (usuario_id = auth.uid ())
  WITH CHECK (usuario_id = auth.uid ());

CREATE POLICY indicacoes_select_own ON public.indicacoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = indicacoes.usuario_id AND u.usuario_id = auth.uid ()
    )
  );

CREATE POLICY indicacoes_insert_own ON public.indicacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = indicacoes.usuario_id AND u.usuario_id = auth.uid ()
    )
  );

CREATE POLICY comissoes_select_own ON public.comissoes
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = comissoes.usuario_id AND u.usuario_id = auth.uid ()
    )
  );

CREATE POLICY atividades_select_own ON public.atividades
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.usuarios u
      WHERE u.id = atividades.usuario_id AND u.usuario_id = auth.uid ()
    )
  );

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.usuarios TO authenticated;
GRANT SELECT, INSERT ON public.indicacoes TO authenticated;
GRANT SELECT ON public.comissoes TO authenticated;
GRANT SELECT ON public.atividades TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
