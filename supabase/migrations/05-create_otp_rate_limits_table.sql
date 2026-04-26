CREATE TABLE IF NOT EXISTS public.otp_rate_limits (
  email text NOT NULL,
  ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_email_created_at
  ON public.otp_rate_limits (email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_ip_created_at
  ON public.otp_rate_limits (ip, created_at DESC);
