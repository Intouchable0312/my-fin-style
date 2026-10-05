# Application bancaire réelle avec Enable Banking

## Résultat attendu
Transformer la maquette actuelle en application privée complète, alimentée uniquement par le compte bancaire réel du propriétaire. La seule donnée fictive conservée sera l’illustration de carte remplaçable.

## Connexion et sécurité
- Ajouter une connexion privée par e-mail/mot de passe et Google, avec inscription, confirmation, déconnexion et récupération d’accès.
- Protéger tous les écrans bancaires et toutes les opérations côté serveur.
- Stocker séparément, pour le propriétaire connecté, la session Enable Banking et les comptes autorisés.
- Ne jamais envoyer la clé privée Enable Banking au navigateur ni l’enregistrer dans le code.
- Limiter l’application au compte propriétaire et isoler toutes ses données par les règles d’accès de Lovable Cloud.

## Parcours Enable Banking réel
- Afficher la liste réelle des banques françaises disponible via Enable Banking.
- Permettre de sélectionner sa banque, puis rediriger vers son parcours sécurisé d’autorisation.
- Traiter le retour Enable Banking, vérifier l’état de sécurité, créer la session et enregistrer les comptes accessibles.
- Charger les comptes, soldes et transactions réels, avec pagination et choix du compte.
- Gérer le renouvellement du consentement, la reconnexion, les erreurs bancaires et la suppression de la connexion.
- N’afficher aucune valeur financière tant qu’aucune banque n’est connectée.

## Application complète et cliquable
- Accueil : carte fictive, compte sélectionné, solde réel et dernières transactions réelles.
- Relevés : périodes calculées uniquement à partir des transactions réelles, recherche et filtres utiles.
- Comptes : liste des comptes autorisés, détails réels et changement de compte actif.
- Réglages : profil, banque connectée, actualisation, renouvellement du consentement, notifications locales et déconnexion.
- Détail complet de chaque transaction réelle.
- Retirer Offres, fidélité, PIN, Apple Pay, blocage de carte et capacité de dépenses, car Enable Banking ne fournit pas ces données ou actions.
- Chaque ligne restante ouvre un écran ou exécute réellement l’action annoncée.

## Fidélité visuelle
- Reprendre précisément la typographie Helvetica Neue, le bleu, les gris, séparateurs, tailles, espacements et densité des références.
- Remplacer les pictogrammes génériques par un jeu cohérent de pictogrammes au trait, ajustés pour correspondre aux captures.
- Conserver la structure mobile et la navigation inférieure, adaptée aux fonctions réellement disponibles : Accueil, Relevés, Comptes, Réglages.
- Vérifier chaque écran en format téléphone, y compris les états vide, chargement, erreur et consentement expiré.

## Carte remplaçable
- Conserver une seule source pour la carte fictive, réutilisée partout.
- Préparer un emplacement unique dans le projet pour le futur PNG ; son remplacement mettra à jour toutes les vues.
- Indiquer clairement, à la livraison, où déposer ce PNG.

## Mise en service
- Demander ensuite, dans le formulaire sécurisé, l’identifiant d’application Enable Banking et la clé privée RSA `.pem`.
- Dans Enable Banking, enregistrer l’URL de retour de l’application et choisir l’environnement Production en mode restreint.
- Tester le parcours complet avec le compte réel après ajout des identifiants.
