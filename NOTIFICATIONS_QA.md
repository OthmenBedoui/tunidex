# Notifications QA

Ce scenario manuel valide que le serveur est bien la source de verite pour les notifications admin et client.

## Prerequis

- deux comptes staff :
  - `ADMIN A`
  - `ADMIN B` ou `AGENT`
- un compte client verifie
- un produit achetable
- le polling notifications actif dans l'application

## Scenario manuel

### A. Client passe commande

1. Se connecter avec le compte client dans le navigateur 1.
2. Ajouter un produit au panier.
3. Finaliser la commande.
4. Attendre le poll suivant cote admin.

Resultat attendu :

- le badge notifications admin augmente de `+1` pour chaque compte staff connecte
- une modale bloquante `Nouvelle commande` apparait cote admin
- la notification admin ouvre l'onglet `orders`

### B. Admin approuve le paiement

1. Se connecter avec `ADMIN A`.
2. Ouvrir la commande.
3. Cliquer sur l'action d'approbation du paiement.
4. Revenir cote client et attendre le poll suivant.

Resultat attendu :

- le client voit une notification `PAYMENT_APPROVED`
- aucun autre client ne recoit cette notification

### C. Chacun marque lu puis redemarre

1. `ADMIN A` marque la notification admin comme lue.
2. Le client marque sa notification `PAYMENT_APPROVED` comme lue.
3. Faire un `F5` sur chaque session.
4. Redemarrer completement le serveur.
5. Faire un nouveau `F5`.

Resultat attendu :

- les notifications restent lues
- les badges restent corrects apres refresh et redemarrage

### D. Tout lu puis autre navigateur

1. `ADMIN A` clique sur `Tout lu`.
2. Le client clique sur `Tout marquer lu`.
3. Verifier que les badges passent a `0`.
4. Ouvrir une nouvelle session dans un autre navigateur avec les memes comptes.

Resultat attendu :

- le badge reste a `0`
- aucune notification ne redevient non lue

### E. Deux comptes admin, etat lu independant

1. Rejouer une nouvelle commande client.
2. Laisser `ADMIN B` sans action.
3. `ADMIN A` marque la notification comme lue.
4. Comparer les deux dashboards admin.

Resultat attendu :

- `ADMIN A` voit la notification comme lue
- `ADMIN B` voit toujours sa propre notification comme non lue
- les badges staff sont independants par destinataire

### F. Commande invite

1. Passer une commande via le parcours invite.
2. Attendre le poll suivant cote admin.
3. Verifier les notifications cote client authentifie.

Resultat attendu :

- les admins et agents recoivent bien la notification `ORDER_CREATED`
- aucune notification client orpheline n'est creee pour la commande invite

## Verifications complementaires

Verifier que l'ancienne cle locale a disparu :

```bash
rg -n "tunibots_admin_notifications" App.tsx services server components pages
```

Resultat attendu :

- aucune occurrence

Verifier que l'etat lu n'est plus persiste via localStorage pour les notifications :

- marquer lu
- fermer l'onglet
- rouvrir la session
- verifier que l'etat vient bien du serveur et reste identique
