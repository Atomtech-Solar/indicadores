-- Se a migration 14 (versão inicial) tiver sido aplicada, ela revogou SELECT amplo
-- e concedeu apenas colunas sem valor_projeto — isso quebrava PostgREST/views.
-- Este passo restaura SELECT completo em indicacoes para authenticated.
-- Idempotente: GRANT SELECT repetido é seguro.
--
-- UI do indicador continua sem valor_projeto: vw_indicacoes_dashboard não inclui a coluna.

GRANT SELECT ON public.indicacoes TO authenticated;
