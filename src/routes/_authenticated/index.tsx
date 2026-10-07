import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Home,
  Landmark,
  LogOut,
  PieChart,
  ReceiptText,
  RefreshCw,
  Search,
  Unplug,
  UserRound,
  WalletCards,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { AppButton } from "@/components/AppButton";
import { BankCard } from "@/components/BankCard";
import { getDeviceToken, forgetDeviceToken } from "@/lib/device-access";
import {
  disconnectDeviceBank as disconnectBank,
  getDeviceOverview as getBankingOverview,
  listDeviceBanks as listFrenchBanks,
  selectDeviceAccount as selectBankAccount,
  startDeviceAuthorization as startBankAuthorization,
} from "@/lib/device-banking.functions";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "Mon Compte — Solde et opérations" },
      { name: "description", content: "Votre solde et vos opérations bancaires réelles, connectés via Enable Banking." },
      { property: "og:title", content: "Mon Compte — Solde et opérations" },
      { property: "og:description", content: "Votre solde et vos opérations bancaires réelles, connectés via Enable Banking." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankingApp,
});

type Overview = Awaited<ReturnType<typeof getBankingOverview>>;
type Tx = Overview["transactions"][number];
type Tab = "home" | "statements" | "spending" | "account";
type Detail = { kind: "transaction"; tx: Tx } | { kind: "banks" } | { kind: "search" } | null;

const tabItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "statements", label: "Relevés", icon: ReceiptText },
  { id: "spending", label: "Dépenses", icon: PieChart },
  { id: "account", label: "Compte", icon: UserRound },
];

const money = (amount: number, currency = "EUR") =>
  `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
const txAmount = (tx: Tx) => {
  const raw = Number(tx.transaction_amount?.amount ?? 0);
  const debit = (tx as { credit_debit_indicator?: string }).credit_debit_indicator === "DBIT";
  return debit ? -Math.abs(raw) : raw;
};
const txDate = (tx: Tx) => tx.booking_date ?? tx.value_date ?? "";
const txLabel = (tx: Tx) => {
  const info = Array.isArray(tx.remittance_information) ? tx.remittance_information.join(" ") : tx.remittance_information;
  const creditor = (tx as { creditor?: { name?: string } }).creditor?.name ?? tx.creditor_name;
  const debtor = (tx as { debtor?: { name?: string } }).debtor?.name ?? tx.debtor_name;
  return (txAmount(tx) < 0 ? creditor : debtor) || info || tx.bank_transaction_code?.description || "Opération";
};
const dayLabel = (d: string) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "short" }) : "Date inconnue");
const longDate = (d: string) => (d ? new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" }) : "—");

function pickBalance(o: Overview) {
  const order = ["ITAV", "CLAV", "ITBD", "CLBD", "XPCD", "OTHR"];
  const sorted = [...o.balances].sort((a, b) => order.indexOf(a.balance_type ?? "OTHR") - order.indexOf(b.balance_type ?? "OTHR"));
  const b = sorted[0];
  return b?.balance_amount?.amount ? { amount: Number(b.balance_amount.amount), currency: b.balance_amount.currency ?? "EUR" } : null;
}

function BankingApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const fetchOverview = useServerFn(getBankingOverview);
  const overview = useQuery({ queryKey: ["banking"], queryFn: () => fetchOverview({ data: { token: getDeviceToken() } }), retry: false });
  const status = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("bank") : null;

  const goTab = (next: Tab) => {
    setTab(next);
    setDetail(null);
  };

  let content: ReactNode;
  if (overview.isLoading) content = <CenteredNote>Chargement de vos données bancaires…</CenteredNote>;
  else if (overview.error) content = <CenteredNote action={<AppButton onClick={() => overview.refetch()} className="mt-4 font-semibold text-primary">Réessayer</AppButton>}>{overview.error.message}</CenteredNote>;
  else if (!overview.data?.connection) content = <ConnectScreen status={status} onChoose={() => setDetail({ kind: "banks" })} />;
  else {
    const data = overview.data;
    content = (
      <>
        {tab === "home" && <HomeScreen data={data} onTx={(tx) => setDetail({ kind: "transaction", tx })} />}
        {tab === "statements" && <StatementsScreen data={data} onSearch={() => setDetail({ kind: "search" })} />}
        {tab === "spending" && <SpendingScreen data={data} />}
        {tab === "account" && <AccountScreen data={data} onReconnect={() => setDetail({ kind: "banks" })} />}
      </>
    );
  }

  return (
    <main className="min-h-[100dvh] bg-background md:py-8">
      <section className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-background md:min-h-[860px] md:shadow-2xl">
        {detail?.kind === "transaction" && overview.data && <TransactionDetail tx={detail.tx} data={overview.data} onBack={() => setDetail(null)} />}
        {detail?.kind === "banks" && <BankPicker onBack={() => setDetail(null)} />}
        {detail?.kind === "search" && overview.data && <SearchScreen data={overview.data} onBack={() => setDetail(null)} onTx={(tx) => setDetail({ kind: "transaction", tx })} />}
        {!detail && (
          <>
            <div className="h-[calc(100dvh-78px)] min-h-[690px] overflow-y-auto pb-5 md:h-[782px]">{content}</div>
            {overview.data?.connection && <BottomNav active={tab} onChange={goTab} />}
          </>
        )}
      </section>
    </main>
  );
}

function CenteredNote({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="flex min-h-[600px] flex-col items-center justify-center bg-muted px-8 text-center text-[18px] text-muted-foreground"><p>{children}</p>{action}</div>;
}

function PageHeader({ title, subtitle }: { title: string; subtitle?: string | undefined }) {
  return (
    <header className="relative flex h-[90px] items-end justify-center border-b border-border bg-card px-5 pb-3">
      <div className="text-center">
        <h1 className="text-[22px] leading-6 font-normal">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  );
}

function accountSubtitle(data: Overview) {
  const a = data.activeAccount;
  if (!a) return data.connection?.aspsp_name;
  return a.iban_last4 ? `Compte se terminant par - ${a.iban_last4}` : a.name ?? data.connection?.aspsp_name;
}

function ConnectScreen({ status, onChoose }: { status: string | null; onChoose: () => void }) {
  const messages: Record<string, string> = {
    cancelled: "L’autorisation a été annulée.",
    invalid: "Le lien d’autorisation a expiré. Recommencez.",
    error: "La banque n’a pas pu être connectée. Recommencez.",
  };
  return (
    <div className="min-h-full bg-muted px-5 pb-8 pt-12">
      <div className="mx-auto w-[64%]"><BankCard /></div>
      <section className="relative z-10 -mt-10 rounded-lg bg-card p-5 shadow-sm">
        <p className="text-[20px] text-muted-foreground">Aucune banque connectée</p>
        <p className="mt-2 text-[17px] leading-6">Connectez votre banque pour afficher votre solde et vos opérations réelles.</p>
        {status && messages[status] && <p className="mt-3 text-[16px] text-destructive">{messages[status]}</p>}
        <AppButton onClick={onChoose} className="mt-5 flex w-full items-center border-t border-border pt-4 text-left text-[20px]">
          <Landmark className="mr-4 text-primary" size={28} /><span className="flex-1">Connecter ma banque</span><ChevronRight className="text-border" />
        </AppButton>
      </section>
    </div>
  );
}

function HomeScreen({ data, onTx }: { data: Overview; onTx: (tx: Tx) => void }) {
  const balance = pickBalance(data);
  const groups = useMemo(() => {
    const map = new Map<string, Tx[]>();
    [...data.transactions].sort((a, b) => txDate(b).localeCompare(txDate(a))).forEach((tx) => {
      const k = txDate(tx);
      map.set(k, [...(map.get(k) ?? []), tx]);
    });
    return [...map.entries()];
  }, [data.transactions]);
  return (
    <div className="min-h-full bg-muted px-5 pb-8 pt-12">
      <div className="mx-auto w-[64%]"><BankCard /></div>
      <section className="relative z-10 -mt-10 rounded-lg bg-card p-5 shadow-sm">
        <p className="text-[20px] text-muted-foreground">Solde actuel</p>
        <p className="mt-1 text-[36px] leading-none font-semibold">{balance ? money(balance.amount, balance.currency) : "Indisponible"}</p>
        <div className="mt-4 flex justify-between text-[18px]"><span className="text-muted-foreground">Banque</span><span>{data.connection?.aspsp_name}</span></div>
      </section>
      {groups.length === 0 && <p className="mt-8 text-center text-[18px] text-muted-foreground">Aucune opération transmise par votre banque.</p>}
      {groups.map(([date, txs]) => (
        <section key={date} className="mt-7">
          <h2 className="mb-3 text-[23px] font-semibold">{dayLabel(date)}</h2>
          <div className="overflow-hidden rounded-lg bg-card">
            {txs.map((tx, i) => <TxRow key={i} tx={tx} onOpen={() => onTx(tx)} />)}
          </div>
        </section>
      ))}
    </div>
  );
}

function TxRow({ tx, onOpen }: { tx: Tx; onOpen: () => void }) {
  const amt = txAmount(tx);
  return (
    <AppButton onClick={onOpen} className="flex min-h-[76px] w-full items-center justify-between gap-3 border-b border-border px-5 text-left text-[18px] last:border-b-0">
      <span className="min-w-0 flex-1 truncate uppercase">{txLabel(tx)}</span>
      <span className={amt > 0 ? "text-primary" : ""}>{money(amt, tx.transaction_amount?.currency)}</span>
    </AppButton>
  );
}

function StatementsScreen({ data, onSearch }: { data: Overview; onSearch: () => void }) {
  const balance = pickBalance(data);
  const dates = data.transactions.map(txDate).filter(Boolean).sort();
  const total = data.transactions.reduce((s, tx) => s + txAmount(tx), 0);
  return (
    <div className="min-h-full bg-muted">
      <PageHeader title="Relevés" subtitle={accountSubtitle(data)} />
      <div className="px-5 pt-5">
        <section className="rounded-lg bg-card p-5">
          <p className="text-[20px] text-muted-foreground">Solde</p>
          <strong className="mt-1 block text-[36px] leading-none">{balance ? money(balance.amount, balance.currency) : "Indisponible"}</strong>
        </section>
        <h2 className="mt-7 text-[24px] font-semibold">Période transmise</h2>
        <section className="mt-4 rounded-[18px] bg-card p-6 shadow-md">
          <strong className="text-[21px]">{dates.length ? `${dayLabel(dates[0] ?? "")} - ${dayLabel(dates[dates.length - 1] ?? "")}` : "Aucune opération"}</strong>
          <p className="mt-7 text-[20px] text-muted-foreground">Solde net des opérations</p>
          <strong className="mt-1 block text-[36px] leading-none">{money(total, data.activeAccount?.currency ?? "EUR")}</strong>
          <p className="mt-2 text-[21px]">{data.transactions.length} Transactions</p>
        </section>
        {data.balances.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-lg bg-card">
            {data.balances.map((b, i) => (
              <div key={i} className="flex justify-between border-b border-border px-5 py-4 text-[17px] last:border-b-0">
                <span className="text-muted-foreground">{b.balance_type ?? "Solde"}{b.reference_date ? ` · ${dayLabel(b.reference_date)}` : ""}</span>
                <span>{money(Number(b.balance_amount?.amount ?? 0), b.balance_amount?.currency)}</span>
              </div>
            ))}
          </section>
        )}
        <div className="py-8 text-center text-primary">
          <AppButton onClick={onSearch} className="font-semibold"><span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-card"><Search size={34} /></span>Rechercher vos transactions</AppButton>
        </div>
      </div>
    </div>
  );
}

function SpendingScreen({ data }: { data: Overview }) {
  const months = useMemo(() => {
    const map = new Map<string, { out: number; in: number }>();
    data.transactions.forEach((tx) => {
      const k = txDate(tx).slice(0, 7);
      if (!k) return;
      const v = map.get(k) ?? { out: 0, in: 0 };
      const a = txAmount(tx);
      if (a < 0) v.out += -a; else v.in += a;
      map.set(k, v);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  }, [data.transactions]);
  const max = Math.max(1, ...months.map(([, v]) => v.out));
  const cur = data.activeAccount?.currency ?? "EUR";
  return (
    <div className="min-h-full bg-card">
      <PageHeader title="Dépenses" subtitle={accountSubtitle(data)} />
      <SectionLabel>Par mois</SectionLabel>
      {months.length === 0 && <p className="px-5 py-6 text-muted-foreground">Aucune opération transmise.</p>}
      {months.map(([m, v]) => (
        <div key={m} className="mx-5 border-b border-border py-5">
          <div className="flex justify-between text-[19px]"><span className="capitalize">{new Date(`${m}-01`).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</span><strong>{money(-v.out, cur)}</strong></div>
          <div className="mt-3 h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${(v.out / max) * 100}%` }} /></div>
          <p className="mt-2 text-sm text-muted-foreground">Entrées : {money(v.in, cur)}</p>
        </div>
      ))}
    </div>
  );
}

function AccountScreen({ data, onReconnect }: { data: Overview; onReconnect: () => void }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const select = useServerFn(selectBankAccount);
  const disconnect = useServerFn(disconnectBank);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await qc.invalidateQueries({ queryKey: ["banking"] }); } finally { setBusy(false); }
  };
  return (
    <div className="min-h-full bg-card">
      <PageHeader title="Compte" subtitle={accountSubtitle(data)} />
      <SectionLabel>Vos comptes</SectionLabel>
      {data.accounts.map((a) => (
        <MenuRow key={a.id} icon={<WalletCards />} label={a.name ?? a.product ?? "Compte"} right={a.id === data.activeAccount?.id ? "Affiché" : a.iban_last4 ? `•• ${a.iban_last4}` : undefined} onClick={() => !busy && run(() => select({ data: { token: getDeviceToken(), accountId: a.id } }))} />
      ))}
      <SectionLabel>Votre banque</SectionLabel>
      <MenuRow icon={<Building2 />} label={data.connection?.aspsp_name ?? "Banque"} right={data.connection?.valid_until ? `Jusqu’au ${new Date(data.connection.valid_until).toLocaleDateString("fr-FR")}` : undefined} onClick={onReconnect} />
      <MenuRow icon={<RefreshCw />} label="Renouveler l’autorisation" onClick={onReconnect} />
      <MenuRow icon={<Unplug />} label="Déconnecter la banque" onClick={() => !busy && confirm("Déconnecter votre banque ?") && run(() => disconnect({ data: { token: getDeviceToken() } }))} />
      <SectionLabel>Session</SectionLabel>
      <MenuRow icon={<LogOut />} label="Oublier cet appareil" onClick={() => !busy && confirm("Oublier cet appareil et déconnecter la banque ?") && run(async () => { await disconnect({ data: { token: getDeviceToken() } }); forgetDeviceToken(); qc.clear(); await navigate({ to: "/" }); })} />
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) { return <h2 className="border-y border-border bg-muted px-5 py-3 text-[18px] font-semibold text-muted-foreground">{children}</h2>; }

function MenuRow({ icon, label, right, onClick }: { icon: ReactNode; label: string; right?: string | undefined; onClick?: () => void }) {
  return <AppButton onClick={onClick} className="mx-5 flex min-h-[75px] w-[calc(100%-40px)] items-center gap-4 border-b border-border text-left"><span className="text-primary">{icon}</span><span className="flex-1 text-[19px] leading-6">{label}</span>{right && <span className="text-sm text-muted-foreground">{right}</span>}<ChevronRight size={22} className="text-border" /></AppButton>;
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="absolute inset-x-0 bottom-0 z-20 grid h-[78px] grid-cols-4 border-t border-border bg-card/95 pb-2 backdrop-blur">{tabItems.map(({ id, label, icon: Icon }) => <AppButton key={id} onClick={() => onChange(id)} className={`flex flex-col items-center justify-center gap-1 text-xs ${active === id ? "text-primary" : "text-muted-foreground"}`}><Icon size={27} strokeWidth={active === id ? 2.2 : 1.8} /><span>{label}</span></AppButton>)}</nav>;
}

function DetailHeader({ title, subtitle, onBack }: { title: string; subtitle?: string | undefined; onBack: () => void }) {
  return <header className="relative flex h-[90px] items-end justify-center border-b border-border bg-card px-5 pb-3"><AppButton aria-label="Retour" onClick={onBack} className="absolute bottom-3 left-3 text-primary"><ChevronLeft size={34} /></AppButton><div className="max-w-[78%] text-center"><h1 className="text-[20px] leading-6">{title}</h1>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div></header>;
}

function TransactionDetail({ tx, data, onBack }: { tx: Tx; data: Overview; onBack: () => void }) {
  const info = Array.isArray(tx.remittance_information) ? tx.remittance_information.join(" ") : tx.remittance_information;
  const rows: Array<[string, string | undefined]> = [
    ["Date d’opération", tx.booking_date && longDate(tx.booking_date)],
    ["Date de valeur", tx.value_date && longDate(tx.value_date)],
    ["Libellé", info],
    ["Type", tx.bank_transaction_code?.description],
    ["Statut", tx.status],
  ];
  return (
    <div className="min-h-[100dvh] bg-card">
      <DetailHeader title="Détails de l'opération" subtitle={accountSubtitle(data)} onBack={onBack} />
      <section className="bg-muted px-5 py-6">
        <strong className="block text-[23px] uppercase">{txLabel(tx)}</strong>
        <strong className="block text-[39px] leading-none">{money(txAmount(tx), tx.transaction_amount?.currency)}</strong>
        <p className="mt-4 text-[18px]">{longDate(txDate(tx))}</p>
      </section>
      <section className="px-5 pt-6">
        <h2 className="text-[24px] font-semibold">Détails de l'opération</h2>
        <div className="mt-4">
          {rows.filter(([, v]) => v).map(([k, v]) => <div key={k} className="flex justify-between gap-6 border-b border-border py-5 text-[18px]"><span className="shrink-0 text-muted-foreground">{k}</span><span className="text-right">{v}</span></div>)}
        </div>
      </section>
    </div>
  );
}

function SearchScreen({ data, onBack, onTx }: { data: Overview; onBack: () => void; onTx: (tx: Tx) => void }) {
  const [q, setQ] = useState("");
  const list = data.transactions.filter((tx) => `${txLabel(tx)} ${tx.transaction_amount?.amount ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="min-h-[100dvh] bg-muted">
      <DetailHeader title="Rechercher" subtitle={accountSubtitle(data)} onBack={onBack} />
      <div className="p-5"><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Libellé ou montant" className="h-12 w-full rounded-lg border border-border bg-card px-4 text-[17px] outline-none" /></div>
      <div className="mx-5 overflow-hidden rounded-lg bg-card">{list.map((tx, i) => <TxRow key={i} tx={tx} onOpen={() => onTx(tx)} />)}</div>
      {list.length === 0 && <p className="text-center text-muted-foreground">Aucun résultat.</p>}
    </div>
  );
}

function BankPicker({ onBack }: { onBack: () => void }) {
  const fetchBanks = useServerFn(listFrenchBanks);
  const start = useServerFn(startBankAuthorization);
  const banks = useQuery({ queryKey: ["banks"], queryFn: () => fetchBanks(), retry: false });
  const [q, setQ] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const choose = async (name: string, country: string) => {
    setErr(null);
    try {
      const { url } = await start({ data: { token: getDeviceToken(), name, country, redirectUrl: `${window.location.origin}/api/public/enable-banking-callback` } });
      window.location.href = url;
    } catch (e) { setErr(e instanceof Error ? e.message : "Erreur"); }
  };
  const list = (banks.data ?? []).filter((b) => b.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="min-h-[100dvh] bg-muted">
      <DetailHeader title="Choisir votre banque" onBack={onBack} />
      <div className="p-5"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher une banque" className="h-12 w-full rounded-lg border border-border bg-card px-4 text-[17px] outline-none" /></div>
      {err && <p className="px-5 pb-3 text-destructive">{err}</p>}
      {banks.isLoading && <p className="text-center text-muted-foreground">Chargement des banques…</p>}
      {banks.error && <p className="px-5 text-center text-destructive">{banks.error.message}</p>}
      <div className="bg-card">{list.map((b, i) => <MenuRow key={`${b.country}-${b.name}-${i}`} icon={b.logo ? <img src={b.logo} alt="" className="h-7 w-7 object-contain" /> : <Landmark />} label={b.name} onClick={() => choose(b.name, b.country)} />)}</div>
    </div>
  );
}
