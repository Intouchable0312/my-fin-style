import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { enableBankingRequest, readEnableBankingCredentials } from "@/lib/enable-banking.server";

type Aspsp = { name: string; country: string; logo?: string; psu_types?: string[]; beta?: boolean };
type AccountApi = {
  account_id: string;
  uid?: string;
  name?: string;
  product?: string;
  currency?: string;
  cash_account_type?: string;
  iban?: string;
};
type BalanceApi = { balance_amount?: { amount?: string; currency?: string }; balance_type?: string; reference_date?: string };
type TransactionApi = {
  transaction_id?: string;
  entry_reference?: string;
  booking_date?: string;
  value_date?: string;
  transaction_amount?: { amount?: string; currency?: string };
  creditor_name?: string;
  debtor_name?: string;
  remittance_information?: string[] | string;
  status?: string;
  bank_transaction_code?: { description?: string };
};

const requireOwner = async (userId: string, supabase: Parameters<Parameters<typeof requireSupabaseAuth.options.server>[0]>[0] extends never ? never : never) => supabase;

async function ensureOwner(userId: string, supabase: any) {
  const { data: owner, error } = await supabase.from("app_owner").select("user_id").maybeSingle();
  if (error) throw new Error("Impossible de vérifier l’accès privé.");
  if (owner && owner.user_id !== userId) throw new Error("Cette application privée possède déjà un propriétaire.");
  if (!owner) {
    const { error: insertError } = await supabase.from("app_owner").insert({ user_id: userId });
    if (insertError) throw new Error("Cette application privée possède déjà un propriétaire.");
  }
}

export const getBankingOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureOwner(context.userId, context.supabase);
    const { data: connection, error } = await context.supabase
      .from("banking_connections")
      .select("id, aspsp_name, aspsp_country, valid_until, status, active_account_uid")
      .maybeSingle();
    if (error) throw new Error("Impossible de charger la connexion bancaire.");
    if (!connection) return { connection: null, accounts: [], activeAccount: null, balances: [], transactions: [], continuationKey: null };

    const { data: accounts, error: accountsError } = await context.supabase
      .from("bank_accounts")
      .select("id, external_uid, name, product, currency, iban_last4, account_type")
      .order("created_at");
    if (accountsError) throw new Error("Impossible de charger les comptes.");
    const activeAccount = accounts?.find((account) => account.external_uid === connection.active_account_uid) ?? accounts?.[0] ?? null;
    if (!activeAccount) return { connection, accounts: accounts ?? [], activeAccount: null, balances: [], transactions: [], continuationKey: null };

    const credentials = readEnableBankingCredentials();
    const [balanceResponse, transactionResponse] = await Promise.all([
      enableBankingRequest<{ balances?: BalanceApi[] }>(credentials, `/accounts/${encodeURIComponent(activeAccount.external_uid)}/balances`),
      enableBankingRequest<{ transactions?: TransactionApi[]; continuation_key?: string }>(credentials, `/accounts/${encodeURIComponent(activeAccount.external_uid)}/transactions`),
    ]);
    return {
      connection,
      accounts: accounts ?? [],
      activeAccount,
      balances: balanceResponse.balances ?? [],
      transactions: transactionResponse.transactions ?? [],
      continuationKey: transactionResponse.continuation_key ?? null,
    };
  });

export const listFrenchBanks = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureOwner(context.userId, context.supabase);
    const response = await enableBankingRequest<{ aspsps?: Aspsp[] }>(readEnableBankingCredentials(), "/aspsps?country=FR");
    return (response.aspsps ?? []).filter((bank) => bank.psu_types?.includes("personal") !== false);
  });

export const startBankAuthorization = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ name: z.string().min(1).max(200), country: z.string().length(2), redirectUrl: z.string().url() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOwner(context.userId, context.supabase);
    const state = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { error } = await context.supabase.from("banking_authorizations").insert({
      state,
      user_id: context.userId,
      aspsp_name: data.name,
      aspsp_country: data.country,
      expires_at: expiresAt,
    });
    if (error) throw new Error("Impossible de préparer l’autorisation bancaire.");
    const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const result = await enableBankingRequest<{ url: string }>(readEnableBankingCredentials(), "/auth", {
      method: "POST",
      body: JSON.stringify({
        access: { valid_until: validUntil },
        aspsp: { name: data.name, country: data.country },
        state,
        redirect_url: data.redirectUrl,
        psu_type: "personal",
      }),
    });
    return { url: result.url };
  });

export const selectBankAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await ensureOwner(context.userId, context.supabase);
    const { data: account, error } = await context.supabase.from("bank_accounts").select("external_uid").eq("id", data.accountId).maybeSingle();
    if (error || !account) throw new Error("Compte introuvable.");
    const { error: updateError } = await context.supabase.from("banking_connections").update({ active_account_uid: account.external_uid, updated_at: new Date().toISOString() }).eq("user_id", context.userId);
    if (updateError) throw new Error("Impossible de sélectionner ce compte.");
    return { ok: true };
  });

export const disconnectBank = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureOwner(context.userId, context.supabase);
    const { error } = await context.supabase.from("banking_connections").delete().eq("user_id", context.userId);
    if (error) throw new Error("Impossible de supprimer la connexion bancaire.");
    return { ok: true };
  });