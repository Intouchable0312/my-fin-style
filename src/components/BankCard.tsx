// Source unique de la carte : remplacez public/ma-carte.png par votre PNG final
// (même nom de fichier) et toute l'application affichera la nouvelle carte.
export function BankCard() {
  return (
    <img
      src="/ma-carte.png"
      alt="Carte bancaire"
      className="block w-full rounded-[10px] shadow-md"
    />
  );
}

export default BankCard;
