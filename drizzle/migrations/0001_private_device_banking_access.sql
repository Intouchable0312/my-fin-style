CREATE TABLE public.bank_device_connections (
 token_hash text PRIMARY KEY,
 connection jsonb,
 accounts jsonb NOT NULL DEFAULT '[]'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.bank_device_connections TO service_role;
ALTER TABLE public.bank_device_connections ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.bank_device_authorizations (
 state uuid PRIMARY KEY,
 token_hash text NOT NULL REFERENCES public.bank_device_connections(token_hash) ON DELETE CASCADE,
 aspsp_name text NOT NULL,
 aspsp_country text NOT NULL,
 expires_at timestamptz NOT NULL,
 consumed_at timestamptz
);
GRANT ALL ON public.bank_device_authorizations TO service_role;
ALTER TABLE public.bank_device_authorizations ENABLE ROW LEVEL SECURITY;