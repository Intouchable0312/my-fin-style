type BankCardProps = {
  compact?: boolean;
};

export function BankCard({ compact = false }: BankCardProps) {
  return (
    <div
      aria-label="Carte bancaire fictive"
      className={compact ? "bank-card bank-card-compact" : "bank-card"}
    >
      <div className="bank-card-topline">
        <span>CARTE FICTIVE</span>
        <span>DEMO</span>
      </div>
      <div className="bank-card-chip" aria-hidden="true" />
      {!compact && <div className="bank-card-number">•••• •••••• 21001</div>}
      <div className="bank-card-bottomline">
        <span>VOTRE NOM</span>
        <span>VISA</span>
      </div>
    </div>
  );
}