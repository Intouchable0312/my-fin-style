# Reproduction fidèle de l’application bancaire

## Objectif
Créer une première version fonctionnelle qui reprend au plus près les références fournies : interface iPhone claire, bleu bancaire, typographie sobre, séparateurs fins, grands montants et navigation inférieure fixe.

## Écrans et interactions
- Construire l’accueil avec carte fictive, solde, montant à payer et transactions groupées par date.
- Ajouter les vues Relevés, Offres et Compte dans la même expérience mobile.
- Rendre la navigation inférieure interactive et conserver exactement quatre entrées.
- Ajouter les écrans de détail utiles montrés dans les références : transaction, notifications, code confidentiel, blocage temporaire et capacité de dépenses.
- Utiliser un seul composant de carte fictive afin que son futur remplacement par un PNG s’applique partout.

## Fidélité visuelle
- Reprendre la palette blanc, gris très clair, noir et bleu vif des captures.
- Respecter les proportions, hauteurs de lignes, séparateurs, coins légèrement arrondis et hiérarchie typographique observés.
- Optimiser en priorité l’affichage mobile, tout en gardant une présentation propre sur écran large.

## Technique
- Tout reste en données fictives pour cette étape ; aucune connexion bancaire réelle n’est ajoutée.
- Les écrans seront gérés dans la page actuelle avec un état de navigation local.
- Les couleurs seront centralisées dans les styles globaux et la carte fictive dans un composant dédié.
- Vérifier visuellement les principaux écrans en format mobile et corriger les écarts visibles.
