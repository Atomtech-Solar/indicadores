CREATE TABLE IF NOT EXISTS public.rate_limits (
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip_created_at
  ON public.rate_limits (ip, created_at DESC);
