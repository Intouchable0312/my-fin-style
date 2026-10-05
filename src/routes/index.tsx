import { createFileRoute } from "@tanstack/react-router";
import {
  Bell,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CreditCard,
  Gift,
  Home,
  Info,
  LocateFixed,
  LockKeyhole,
  MapPin,
  MessageSquare,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  UserRoundPlus,
  WalletCards,
  Zap,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AppButton } from "@/components/AppButton";
import { BankCard } from "@/components/BankCard";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mon Compte — Solde et opérations" },
      { name: "description", content: "Consultez votre solde, vos relevés, vos offres et les réglages de votre compte." },
      { property: "og:title", content: "Mon Compte — Solde et opérations" },
      { property: "og:description", content: "Consultez votre solde, vos relevés, vos offres et les réglages de votre compte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: BankingApp,
});

type Tab = "home" | "statements" | "offers" | "account";
type Detail = "transaction" | "notifications" | "pin" | "freeze" | "capacity" | null;

const tabItems: Array<{ id: Tab; label: string; icon: typeof Home }> = [
  { id: "home", label: "Accueil", icon: Home },
  { id: "statements", label: "Relevés", icon: ReceiptText },
  { id: "offers", label: "Offres", icon: Gift },
  { id: "account", label: "Compte", icon: UserRound },
];

function BankingApp() {
  const [tab, setTab] = useState<Tab>("home");
  const [detail, setDetail] = useState<Detail>(null);
  const [frozen, setFrozen] = useState(true);
  const [amount, setAmount] = useState("150000");

  const goTab = (next: Tab) => {
    setTab(next);
    setDetail(null);
  };

  return (
    <main className="min-h-[100dvh] bg-background md:py-8">
      <section className="relative mx-auto min-h-[100dvh] w-full max-w-[430px] overflow-hidden bg-background md:min-h-[860px] md:shadow-2xl">
        {detail === "transaction" && <TransactionDetail onBack={() => setDetail(null)} />}
        {detail === "notifications" && <Notifications onBack={() => setDetail(null)} />}
        {detail === "pin" && <PinScreen onBack={() => setDetail(null)} />}
        {detail === "freeze" && <FreezeScreen frozen={frozen} setFrozen={setFrozen} onBack={() => setDetail(null)} />}
        {detail === "capacity" && <CapacityScreen amount={amount} setAmount={setAmount} onBack={() => setDetail(null)} />}

        {!detail && (
          <>
            <div className="h-[calc(100dvh-78px)] min-h-[690px] overflow-y-auto pb-5 md:h-[782px]">
              {tab === "home" && <HomeScreen onTransaction={() => setDetail("transaction")} onMessages={() => setDetail("notifications")} />}
              {tab === "statements" && <StatementsScreen onCapacity={() => setDetail("capacity")} />}
              {tab === "offers" && <OffersScreen onMessages={() => setDetail("notifications")} />}
              {tab === "account" && <AccountScreen onMessages={() => setDetail("notifications")} onPin={() => setDetail("pin")} onFreeze={() => setDetail("freeze")} />}
            </div>
            <BottomNav active={tab} onChange={goTab} />
          </>
        )}
      </section>
    </main>
  );
}

function PageHeader({ title, subtitle, onMessages }: { title?: string; subtitle?: string; onMessages?: () => void }) {
  return (
    <header className="relative flex h-[90px] items-end justify-center border-b border-border bg-card px-5 pb-3">
      <div className="text-center">
        {title && <h1 className="text-[22px] leading-6 font-normal">{title}</h1>}
        {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {onMessages && (
        <AppButton aria-label="Notifications" onClick={onMessages} className="absolute right-5 bottom-3 text-primary">
          <MessageSquare size={29} strokeWidth={1.8} />
        </AppButton>
      )}
    </header>
  );
}

function HomeScreen({ onTransaction, onMessages }: { onTransaction: () => void; onMessages: () => void }) {
  return (
    <div className="min-h-full bg-muted px-5 pb-8 pt-5">
      <div className="flex justify-end">
        <AppButton aria-label="Notifications" onClick={onMessages} className="text-primary"><MessageSquare size={29} strokeWidth={1.8} /></AppButton>
      </div>
      <div className="mx-auto -mt-1 w-[64%]"><BankCard /></div>
      <section className="relative z-10 -mt-10 rounded-lg bg-card p-5 shadow-sm">
        <p className="text-[20px] text-muted-foreground">Solde actuel</p>
        <p className="mt-1 text-[36px] leading-none font-semibold">1 006,56 EUR</p>
        <div className="mt-4 flex justify-between text-[19px]"><span className="text-muted-foreground">Montant à payer</span><span>0,00 EUR</span></div>
        <div className="mt-2 flex justify-between text-[18px]"><span>Points fidélité</span><span>29 006</span></div>
        <AppButton onClick={onTransaction} className="mt-5 flex w-full items-center border-t border-border pt-4 text-left text-[20px]">
          <ReceiptText className="mr-4 text-primary" size={28} /><span className="flex-1">Opérations</span><ChevronRight className="text-border" />
        </AppButton>
      </section>
      <TransactionGroup date="7 avr." onOpen={onTransaction} items={["RESTAURANT", "50,00 EUR"]} />
      <TransactionGroup date="6 avr." onOpen={onTransaction} items={["SUPERMARCHÉ", "86,42 EUR"]} />
      <TransactionGroup date="3 avr." onOpen={onTransaction} items={["PRÉLÈVEMENT", "124,90 EUR"]} />
    </div>
  );
}

function TransactionGroup({ date, items, onOpen }: { date: string; items: [string, string]; onOpen: () => void }) {
  return <section className="mt-7"><h2 className="mb-3 text-[23px] font-semibold">{date}</h2><AppButton onClick={onOpen} className="flex h-[76px] w-full items-center justify-between rounded-lg bg-card px-5 text-[18px]"><span>{items[0]}</span><span>{items[1]}</span></AppButton></section>;
}

function StatementsScreen({ onCapacity }: { onCapacity: () => void }) {
  return (
    <div className="min-h-full bg-muted">
      <PageHeader title="Relevés" />
      <div className="px-5 pt-5">
        <section className="rounded-lg bg-card p-5">
          <div className="flex items-center gap-2 text-[20px] text-muted-foreground">Solde <Info size={21} className="text-primary" /></div>
          <div className="mt-1 flex items-center justify-between"><strong className="text-[36px] leading-none">1 006,56 EUR</strong><ChevronDown className="text-primary" /></div>
        </section>
        <div className="mt-7 flex items-center justify-between"><h2 className="text-[24px] font-semibold">Relevés récents</h2><span className="text-[20px] font-semibold text-primary">Tout voir</span></div>
        <section className="mt-4 rounded-[18px] bg-card p-6 shadow-md">
          <div className="flex items-start justify-between"><strong className="text-[21px]">janv. 23 - Aujourd'hui</strong><span className="rounded-md bg-muted px-3 py-2 text-[18px]">Actuel</span></div>
          <p className="mt-7 text-[20px] text-muted-foreground">Transactions récentes</p>
          <strong className="mt-1 block text-[36px] leading-none">1 006,56 EUR</strong>
          <p className="mt-2 text-[21px]">26 Transactions</p>
          <p className="mt-20 text-[18px] text-muted-foreground">Arrêté des comptes le 20 févr. <strong className="text-foreground">(0 jours)</strong></p>
        </section>
        <div className="my-4 flex justify-center gap-3"><i className="h-2.5 w-2.5 rounded-full bg-border" /><i className="h-2.5 w-2.5 rounded-full bg-border" /><i className="h-2.5 w-2.5 rounded-full bg-primary" /></div>
        <div className="grid grid-cols-2 gap-6 py-5 text-center text-primary">
          <AppButton onClick={onCapacity} className="font-semibold"><span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-card"><Zap size={34} /></span>Capacité de dépenses</AppButton>
          <AppButton className="font-semibold"><span className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-card"><Search size={34} /></span>Rechercher vos transactions</AppButton>
        </div>
      </div>
    </div>
  );
}

function OffersScreen({ onMessages }: { onMessages: () => void }) {
  return (
    <div className="min-h-full bg-card">
      <PageHeader title="Offres" subtitle="Carte se terminant par - 21001" onMessages={onMessages} />
      <section className="bg-muted px-6 py-5 text-center">
        <LocateFixed className="mx-auto" size={42} strokeWidth={1.6} />
        <h2 className="mt-4 text-[23px]">Vos offres du moment</h2><p className="text-[18px] text-muted-foreground">Découvrez, inscrivez-vous et profitez</p>
        <p className="mt-4 flex items-start justify-center gap-2 text-[16px] leading-5 text-muted-foreground"><Info size={20} className="shrink-0" />Merci de lire les Conditions Générales avant de vous inscrire à une offre.</p>
      </section>
      <MenuRow icon={<WalletCards />} label="Mes offres" right="6 Enregistrée(s)" />
      <SectionLabel>Offres</SectionLabel>
      <MenuRow icon={<MapPin />} label="Offres à proximité" />
      <Offer badge="500" unit="points" category="Hôtel" title="500 points fidélité supplémentaires" note="Valable en ligne · Exp: 31/12/35" />
      <Offer badge="20€" unit="remboursés" category="Boutique" title="20 € remboursés tous les 85 € dépensés" note="Valable en magasin et en ligne" />
    </div>
  );
}

function Offer({ badge, unit, category, title, note }: { badge: string; unit: string; category: string; title: string; note: string }) {
  return <div className="mx-5 flex gap-4 border-t border-border py-5"><div className="flex h-[76px] w-[76px] shrink-0 flex-col items-center justify-center rounded-full border-2 border-primary text-primary"><strong className="text-[23px] leading-5">{badge}</strong><span className="text-xs">{unit}</span></div><div className="min-w-0 flex-1"><p className="text-muted-foreground">{category}</p><p className="text-[19px] leading-6">{title}</p><p className="mt-2 text-sm text-muted-foreground">{note}</p></div><AppButton aria-label="Ajouter l’offre" className="my-auto flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-primary"><Plus /></AppButton></div>;
}

function AccountScreen({ onMessages, onPin, onFreeze }: { onMessages: () => void; onPin: () => void; onFreeze: () => void }) {
  return <div className="min-h-full bg-card"><PageHeader title="Compte" subtitle="Carte se terminant par - 21001" onMessages={onMessages} /><SectionLabel>Votre compte</SectionLabel><MenuRow icon={<CreditCard />} label="Apple Pay" /><MenuRow icon={<CreditCard />} label="Activer et ajouter une carte" /><MenuRow icon={<UserRoundPlus />} label="Demander une Carte supplémentaire" /><MenuRow icon={<CreditCard />} label="Gérer votre code confidentiel" onClick={onPin} /><MenuRow icon={<LockKeyhole />} label="Bloquer temporairement une carte" onClick={onFreeze} /><MenuRow icon={<WalletCards />} label="Remplacer une Carte" /><SectionLabel>Vos réglages et préférences</SectionLabel><MenuRow icon={<UserRound />} label="Connexion via Face ID" /><MenuRow icon={<ShieldCheck />} label="Vérification en deux étapes" /><MenuRow icon={<Bell />} label="Notifications" onClick={onMessages} /></div>;
}

function SectionLabel({ children }: { children: ReactNode }) { return <h2 className="border-y border-border bg-muted px-5 py-3 text-[18px] font-semibold text-muted-foreground">{children}</h2>; }

function MenuRow({ icon, label, right, onClick }: { icon: ReactNode; label: string; right?: string; onClick?: () => void }) {
  return <AppButton onClick={onClick} className="mx-5 flex min-h-[75px] w-[calc(100%-40px)] items-center gap-4 border-b border-border text-left"><span className="text-primary">{icon}</span><span className="flex-1 text-[19px] leading-6">{label}</span>{right && <span className="text-sm text-muted-foreground">{right}</span>}<ChevronRight size={22} className="text-border" /></AppButton>;
}

function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return <nav className="absolute inset-x-0 bottom-0 z-20 grid h-[78px] grid-cols-4 border-t border-border bg-card/95 pb-2 backdrop-blur"><span className="sr-only">Navigation principale</span>{tabItems.map(({ id, label, icon: Icon }) => <AppButton key={id} onClick={() => onChange(id)} className={`flex flex-col items-center justify-center gap-1 text-xs ${active === id ? "text-primary" : "text-muted-foreground"}`}><Icon size={27} strokeWidth={active === id ? 2.2 : 1.8} /><span>{label}</span></AppButton>)}</nav>;
}

function DetailHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: ReactNode }) {
  return <header className="relative flex h-[90px] items-end justify-center border-b border-border bg-card px-5 pb-3"><AppButton aria-label="Retour" onClick={onBack} className="absolute bottom-3 left-3 text-primary"><ChevronLeft size={34} /></AppButton><div className="max-w-[78%] text-center"><h1 className="text-[20px] leading-6">{title}</h1>{subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}</div>{right && <span className="absolute right-4 bottom-4 text-primary">{right}</span>}</header>;
}

function TransactionDetail({ onBack }: { onBack: () => void }) { return <div className="min-h-[100dvh] bg-card"><DetailHeader title="Détails de l'opération" subtitle="Carte se terminant par - 21001" onBack={onBack} /><section className="bg-muted px-5 py-6"><strong className="block text-[23px]">RESTAURANT</strong><strong className="block text-[39px] leading-none">50,00 EUR</strong><p className="mt-4 text-[18px]">7 avril 2023</p></section><section className="m-5 flex items-center gap-4 bg-card p-5 shadow-sm"><Sparkles className="shrink-0 text-primary" size={38} /><div><p className="text-[19px]">Utilisez 10 000 points et recevez un crédit de 50,00 EUR</p><p className="mt-2 text-muted-foreground">1 000 points = 5 euros</p><p className="mt-3 text-[18px] text-primary">Utiliser mes points</p></div></section><section className="px-5"><h2 className="text-[24px] font-semibold">Détails de l'opération</h2><p className="mt-4 text-[19px]">RESTAURANT</p><p className="mt-5 text-[18px]">12345<br />FRANCE</p><div className="mt-7 flex justify-between border-y border-border py-5 text-[18px]"><span className="text-muted-foreground">Date</span><span>7 avril 2023</span></div></section></div>; }

function CardIdentity() { return <div className="flex items-center gap-3 border-b border-border bg-card px-5 py-5"><BankCard compact /><div><strong className="text-[17px]">CARTE FICTIVE</strong><p className="text-muted-foreground">Carte se terminant par - 21001</p></div></div>; }

function Notifications({ onBack }: { onBack: () => void }) { return <div className="min-h-[100dvh] bg-muted"><DetailHeader title="Notifications" onBack={onBack} /><CardIdentity /><p className="px-5 py-4 text-sm leading-4 text-muted-foreground">Programmez des notifications vous informant de l'actualité de votre compte en temps-réel.</p><SectionLabel>Paiement et relevé</SectionLabel><SettingRow label="Paiement reçu" /><SettingRow label="Alerte prélèvement" /><SectionLabel>Dépenses</SectionLabel><SettingRow label="Alerte encours" /><SettingRow label="Alerte prélèvement" /><SectionLabel>Offres</SectionLabel><SettingRow label="Offres enregistrées" /><div className="absolute inset-x-0 bottom-12 px-10 text-center text-sm text-muted-foreground"><p>Pour désactiver toutes les notifications ci-dessus sur cet appareil</p><p className="mt-5 font-semibold text-primary">Aller dans les réglages</p></div></div>; }
function SettingRow({ label }: { label: string }) { return <div className="flex h-16 items-center border-b border-border bg-card px-5 text-[17px]"><span className="flex-1">{label}</span><span>Activée</span><ChevronRight className="ml-2 text-border" size={20} /></div>; }

function PinScreen({ onBack }: { onBack: () => void }) { return <div className="min-h-[100dvh] bg-muted"><DetailHeader title="Gérer votre code confidentiel" onBack={onBack} /><CardIdentity /><div className="flex gap-10 border-b border-border bg-card px-5 py-5 text-[18px] font-semibold text-primary"><span>Consulter le code</span><span>Modifier</span></div></div>; }

function FreezeScreen({ frozen, setFrozen, onBack }: { frozen: boolean; setFrozen: (v: boolean) => void; onBack: () => void }) { return <div className="min-h-[100dvh] bg-muted"><DetailHeader title="Bloquer la carte" subtitle="Carte se terminant par - 21001" onBack={onBack} right="FAQ" /><div className="mx-auto w-[62%] py-12"><BankCard /></div><div className="flex items-center border-y border-border bg-card px-5 py-6"><span className="flex-1 text-[20px]">Bloquer temporairement la carte</span><AppButton role="switch" aria-checked={frozen} onClick={() => setFrozen(!frozen)} className={`relative h-9 w-16 rounded-full transition-colors ${frozen ? "bg-primary" : "bg-border"}`}><span className={`absolute top-1 h-7 w-7 rounded-full bg-card shadow transition-all ${frozen ? "left-8" : "left-1"}`} /></AppButton></div><div className="px-5 py-5 text-[17px] leading-6"><strong className="text-[19px]">Votre carte sera débloquée dans 7 jours.</strong><p className="mt-3">Votre carte est temporairement bloquée. Votre carte sera automatiquement débloquée 7 jours après le premier blocage et sera utilisable immédiatement après.</p><p className="mt-5">Pendant qu'elle est bloquée, votre carte ne peut plus être utilisée pour les transactions ou retraits. Les paiements automatisés ou préautorisés seront toujours traités.</p></div></div>; }

function CapacityScreen({ amount, setAmount, onBack }: { amount: string; setAmount: (v: string) => void; onBack: () => void }) {
  const formatted = `${(Number(amount || "0") / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} EUR`;
  return <div className="flex min-h-[100dvh] flex-col bg-muted"><DetailHeader title="Vérifier votre capacité de dépenses" subtitle="Carte se terminant par - 21001" onBack={onBack} right={<CircleHelp size={22} />} /><div className="flex flex-1 flex-col items-center justify-center px-5 text-center"><p className="text-[26px] leading-10">Saisir le montant<br />de la dépense envisagée</p><p className="mt-7 text-[43px] font-light text-primary">{formatted}</p></div><Keypad amount={amount} setAmount={setAmount} /></div>;
}

function Keypad({ amount, setAmount }: { amount: string; setAmount: (v: string) => void }) { const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "+*#", "0", "⌫"]; return <div className="grid grid-cols-3 gap-1 bg-border p-1 pb-7">{keys.map((key) => <AppButton key={key} onClick={() => key === "⌫" ? setAmount(amount.slice(0, -1)) : /^\d$/.test(key) && setAmount((amount + key).slice(-8))} className={`h-14 text-[28px] ${key === "+*#" || key === "⌫" ? "bg-transparent" : "rounded-md bg-card shadow-sm"}`}>{key}</AppButton>)}</div>; }