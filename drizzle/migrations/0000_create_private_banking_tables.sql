CREATE TABLE public.app_owner (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  user_id uuid NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.app_owner TO authenticated;
GRANT ALL ON public.app_owner TO service_role;
ALTER TABLE public.app_owner ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can read own record" ON public.app_owner FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "First authenticated user can claim ownership" ON public.app_owner FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND NOT EXISTS (SELECT 1 FROM public.app_owner));

CREATE TABLE public.banking_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  session_id text NOT NULL,
  aspsp_name text NOT NULL,
  aspsp_country text NOT NULL,
  valid_until timestamptz,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'revoked', 'error')),
  active_account_uid uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banking_connections TO authenticated;
GRANT ALL ON public.banking_connections TO service_role;
ALTER TABLE public.banking_connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own banking connection" ON public.banking_connections FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  connection_id uuid NOT NULL REFERENCES public.banking_connections(id) ON DELETE CASCADE,
  external_uid uuid NOT NULL,
  name text,
  product text,
  currency text NOT NULL,
  iban_last4 text,
  account_type text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, external_uid)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_accounts TO authenticated;
GRANT ALL ON public.bank_accounts TO service_role;
ALTER TABLE public.bank_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own bank accounts" ON public.bank_accounts FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.banking_authorizations (
  state uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  aspsp_name text NOT NULL,
  aspsp_country text NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.banking_authorizations TO authenticated;
GRANT ALL ON public.banking_authorizations TO service_role;
ALTER TABLE public.banking_authorizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own authorizations" ON public.banking_authorizations FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX bank_accounts_user_connection_idx ON public.bank_accounts(user_id, connection_id);
CREATE INDEX banking_authorizations_expiry_idx ON public.banking_authorizations(expires_at);