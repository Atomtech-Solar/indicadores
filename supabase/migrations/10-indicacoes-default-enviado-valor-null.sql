-- Indicacoes: novas entradas iniciam como enviado e valor potencial indefinido

ALTER TABLE public.indicacoes
  ALTER COLUMN valor_potencial DROP NOT NULL,
  ALTER COLUMN valor_potencial DROP DEFAULT;

CREATE OR REPLACE FUNCTION public.indicacoes_set_defaults ()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.tipo := lower(trim(NEW.tipo));
  IF NEW.tipo NOT IN ('pessoa', 'empresa') THEN
    RAISE EXCEPTION 'invalid tipo';
  END IF;

  -- Fluxo inicial obrigatório para novos cadastros
  NEW.status := 'enviado';
  -- Valor da comissão legado continua desativado no cadastro
  NEW.valor_comissao := NULL;
  -- Valor potencial fica indefinido até definição administrativa
  NEW.valor_potencial := NULL;

  RETURN NEW;
END;
$$;
