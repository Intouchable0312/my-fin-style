import { createFileRoute } from "@tanstack/react-router";

import { enableBankingRequest, readEnableBankingCredentials } from "@/lib/enable-banking.server";

type SessionResponse = {
  session_id: string;
  valid_until?: string;
  accounts?: Array<{
    uid: string;
    account_id?: { iban?: string; other?: { identification?: string } } | null;
    name?: string;
    product?: string;
    currency?: string;
    cash_account_type?: string;
  }>;
};

export const Route = createFileRoute("/api/public/enable-banking-callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const requestUrl = new URL(request.url);
        const state = requestUrl.searchParams.get("state");
        const code = requestUrl.searchParams.get("code");
        const destination = new URL("/", requestUrl.origin);
        if (!state || !code) {
          destination.searchParams.set("bank", "cancelled");
          return Response.redirect(destination, 303);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: pending } = await supabaseAdmin
          .from("banking_authorizations")
          .select("state, user_id, aspsp_name, aspsp_country, expires_at, consumed_at")
          .eq("state", state)
          .maybeSingle();
        if (!pending || pending.consumed_at || new Date(pending.expires_at).getTime() < Date.now()) {
          destination.searchParams.set("bank", "invalid");
          return Response.redirect(destination, 303);
        }

        try {
          const session = await enableBankingRequest<SessionResponse>(readEnableBankingCredentials(), "/sessions", {
            method: "POST",
            body: JSON.stringify({ code }),
          });
          const { data: connection, error: connectionError } = await supabaseAdmin
            .from("banking_connections")
            .upsert({
              user_id: pending.user_id,
              session_id: session.session_id,
              aspsp_name: pending.aspsp_name,
              aspsp_country: pending.aspsp_country,
              valid_until: session.valid_until ?? null,
              status: "active",
              active_account_uid: session.accounts?.[0]?.uid ?? null,
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id" })
            .select("id")
            .single();
          if (connectionError || !connection) throw new Error("Connection write failed");

          if (session.accounts?.length) {
            const rows = session.accounts.map((account) => ({
              user_id: pending.user_id,
              connection_id: connection.id,
              external_uid: account.uid,
              name: account.name ?? null,
              product: account.product ?? null,
              currency: account.currency ?? "EUR",
              iban_last4: account.account_id?.iban ? account.account_id.iban.replace(/\s/g, "").slice(-4) : null,
              account_type: account.cash_account_type ?? null,
              metadata: {},
              updated_at: new Date().toISOString(),
            }));
            const { error: accountError } = await supabaseAdmin.from("bank_accounts").upsert(rows, { onConflict: "user_id,external_uid" });
            if (accountError) throw new Error("Account write failed");
          }
          await supabaseAdmin.from("banking_authorizations").update({ consumed_at: new Date().toISOString() }).eq("state", state);
          destination.searchParams.set("bank", "connected");
        } catch (error) {
          console.error("Enable Banking callback failed", error);
          destination.searchParams.set("bank", "error");
        }
        return Response.redirect(destination, 303);
      },
    },
  },
});