import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { enableBankingRequest, readEnableBankingCredentials } from "./enable-banking.server";
import type { getBankingOverview as originalOverview } from "./banking.functions";

type Overview = Awaited<ReturnType<typeof originalOverview>>;
const deviceInput = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) });
export async function hashDeviceToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}
const emptyOverview: Overview = { connection: null, accounts: [], activeAccount: null, balances: [], transactions: [], continuationKey: null };

export const getDeviceOverview = createServerFn({ method: "POST" })
  .inputValidator(input => deviceInput.parse(input))
  .handler(async ({ data }): Promise<Overview> => {
    const hash = await hashDeviceToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin.from("bank_device_connections").select("connection, accounts").eq("token_hash", hash).maybeSingle();
    if (error) throw new Error("Impossible de charger la connexion bancaire.");
    if (!row?.connection) return emptyOverview;
    const connection = row.connection as unknown as NonNullable<Overview["connection"]>;
    const accounts = row.accounts as unknown as Overview["accounts"];
    const activeAccount = accounts.find(a => a.external_uid === connection.active_account_uid) ?? accounts[0] ?? null;
    if (!activeAccount) return { ...emptyOverview, connection, accounts };
    if (connection.valid_until && new Date(connection.valid_until).getTime() < Date.now()) {
      return { ...emptyOverview, connection: { ...connection, status: "expired" }, accounts, activeAccount };
    }
    const credentials = readEnableBankingCredentials();
    const [balances, transactions] = await Promise.all([
      enableBankingRequest<{ balances?: Overview["balances"] }>(credentials, `/accounts/${encodeURIComponent(activeAccount.external_uid)}/balances`),
      enableBankingRequest<{ transactions?: Overview["transactions"]; continuation_key?: string }>(credentials, `/accounts/${encodeURIComponent(activeAccount.external_uid)}/transactions`),
    ]);
    return { connection, accounts, activeAccount, balances: balances.balances ?? [], transactions: transactions.transactions ?? [], continuationKey: transactions.continuation_key ?? null };
  });

export const listDeviceBanks = createServerFn({ method: "GET" }).handler(async () => {
  const result = await enableBankingRequest<{ aspsps?: Array<{ name: string; country: string; logo?: string; psu_types?: string[] }> }>(readEnableBankingCredentials(), "/aspsps?country=FR");
  const seen = new Set<string>();
  return (result.aspsps ?? []).filter(b => b.psu_types?.includes("personal") !== false).filter(b => {
    const key = `${b.country}-${b.name}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).sort((a, b) => a.name.localeCompare(b.name, "fr"));
});

export const startDeviceAuthorization = createServerFn({ method: "POST" })
  .inputValidator(input => deviceInput.extend({ name: z.string().min(1).max(200), country: z.string().length(2), redirectUrl: z.string().url() }).parse(input))
  .handler(async ({ data }) => {
    const hash = await hashDeviceToken(data.token);
    const state = crypto.randomUUID();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: deviceError } = await supabaseAdmin.from("bank_device_connections").upsert({ token_hash: hash }, { onConflict: "token_hash", ignoreDuplicates: true });
    if (deviceError) throw new Error("Impossible de préparer cet appareil.");
    const { error } = await supabaseAdmin.from("bank_device_authorizations").insert({ state, token_hash: hash, aspsp_name: data.name, aspsp_country: data.country, expires_at: new Date(Date.now() + 15 * 60000).toISOString() });
    if (error) throw new Error("Impossible de préparer l’autorisation bancaire.");
    const result = await enableBankingRequest<{ url: string }>(readEnableBankingCredentials(), "/auth", { method: "POST", body: JSON.stringify({ access: { valid_until: new Date(Date.now() + 90 * 86400000).toISOString() }, aspsp: { name: data.name, country: data.country }, state, redirect_url: data.redirectUrl, psu_type: "personal" }) });
    return { url: result.url };
  });

export const selectDeviceAccount = createServerFn({ method: "POST" })
  .inputValidator(input => deviceInput.extend({ accountId: z.string().uuid() }).parse(input))
  .handler(async ({ data }) => {
    const hash = await hashDeviceToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin.from("bank_device_connections").select("connection, accounts").eq("token_hash", hash).maybeSingle();
    if (!row?.connection) throw new Error("Reconnectez votre banque.");
    const accounts = row.accounts as unknown as Overview["accounts"];
    const account = accounts.find(a => a.id === data.accountId);
    if (!account) throw new Error("Compte introuvable.");
    const connection = row.connection as Record<string, any>;
    const { error } = await supabaseAdmin.from("bank_device_connections").update({ connection: { ...connection, active_account_uid: account.external_uid } }).eq("token_hash", hash);
    if (error) throw new Error("Impossible de sélectionner ce compte.");
    return { ok: true };
  });

export const disconnectDeviceBank = createServerFn({ method: "POST" })
  .inputValidator(input => deviceInput.parse(input))
  .handler(async ({ data }) => {
    const hash = await hashDeviceToken(data.token);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("bank_device_connections").delete().eq("token_hash", hash);
    if (error) throw new Error("Impossible de déconnecter la banque.");
    return { ok: true };
  });