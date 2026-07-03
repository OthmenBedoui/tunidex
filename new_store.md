# New Store Architecture Plan

## Objectif

Documenter l'architecture cible du store public avant refonte complète, en partant du code actuel.
Pour cette étape, on ne change pas encore les pages: on fixe la structure, les responsabilités, les blocs partagés, et le plan de migration/suppression.

## Constat Actuel

Le store existe déjà, mais il est encore organisé comme une couche "publique" directement branchée sur des pages legacy:

- `App.tsx` joue le rôle de routeur applicatif custom, bootstrap global, store shell, auth shell et SEO shell.
- `pages/store/index.ts` ne contient pas encore de vraies pages store dédiées: il ne fait qu'exporter des pages legacy (`../Home`, `../ProductPage`, `../Cart`, etc.).
- `components/store-client/Layout.tsx` est le shell principal du store public.
- `components/store-client/StoreBootLoader.tsx` gère le loader de démarrage.
- `pages/Home.tsx`, `pages/CategoryPage.tsx`, `pages/ProductPage.tsx`, `pages/Cart.tsx`, `pages/Login.tsx`, `pages/Profile.tsx`, `pages/OrderTracking.tsx` portent déjà la majorité de l'expérience store.

Conclusion:
le store fonctionne, mais son architecture n'est pas encore isolée en module `store` propre. La refonte doit d'abord séparer clairement:

1. le shell applicatif global
2. le domaine store public
3. les blocs UI réutilisables
4. les pages legacy à retirer après migration

## Inventaire Réel Du Store Actuel

### Shell global

- `App.tsx`
  - bootstrap auth
  - bootstrap catalogue
  - gestion route custom
  - SEO/meta setup
  - navigation store/admin
  - sélection produit courant
  - loader initial

### Entrée store actuelle

- `pages/store/index.ts`
  - simple barrel file
  - ré-exporte les anciennes pages au lieu d'héberger une vraie architecture store

### Shell public store

- `components/store-client/Layout.tsx`
  - top announcement bar
  - header
  - recherche visuelle
  - switch theme
  - cart badge
  - menu profil
  - rail catégories
  - main container
  - footer
  - popup notification

- `components/store-client/StoreBootLoader.tsx`
  - splash/loading screen configurable via `siteConfig`

### Pages store publiques actuelles

- `pages/Home.tsx`
  - cover store
  - hero slider
  - promo banners
  - floating brand cards
  - collections/categories grid
  - packages rail
  - top products rail
  - gift cards rail
  - trending rail
  - discounts rail
  - trust badges
  - piloté par `siteConfig.storeSections`

- `pages/CategoryPage.tsx`
  - hero catégorie
  - rail sous-catégories
  - modal/menu sous-catégories
  - filter bar
  - recherche
  - vue grouped brands
  - vue direct listings
  - vue listings d'une marque

- `pages/ProductPage.tsx`
  - breadcrumb
  - galerie/visuel principal
  - infos clés produit
  - région / plateforme / restrictions
  - variantes
  - description
  - system requirements
  - price card sticky mobile
  - modal info

- `pages/Cart.tsx`
  - panier guest / auth
  - checkout manuel
  - formulaire client invité
  - choix paiement
  - preuve de paiement
  - success state

- `pages/Login.tsx`
  - login
  - register
  - OTP verify
  - social auth
  - version client et admin audience

- `pages/Profile.tsx`
  - profil utilisateur
  - update informations
  - update password
  - email verification
  - email change OTP
  - delete account zone

- `pages/OrderTracking.tsx`
  - lookup commande
  - progression par statuts
  - vue items
  - déverrouillage contenu de livraison

### Blocs store déjà extraits

- `components/store-client/ListingImage.tsx`
- `components/store-client/PriceDisplay.tsx`
- `components/store-client/ProductDescriptionCard.tsx`
- `components/store-client/ProductInfoModal.tsx`
- `components/store-client/ProductPriceCard.tsx`
- `components/store-client/ProductSystemRequirements.tsx`
- `components/store-client/ProductVariations.tsx`

### Configuration métier transverse

- `utils/storeSections.ts`
  - définit les sections activables du home
  - définit ordre/activation par défaut
  - fusionne avec `siteConfig`

## Problèmes d'Architecture à Corriger

### 1. Le module `pages/store` n'est pas encore un vrai module

Aujourd'hui `pages/store/index.ts` ne fait que ré-exporter des pages legacy.
Donc la couche "store" n'est pas réellement découplée.

### 2. `App.tsx` porte trop de responsabilités

`App.tsx` fait à la fois:

- routing
- bootstrap données
- auth shell
- SEO setup
- orchestration des pages
- logique store
- logique admin

Il faudra le réduire à un orchestrateur de haut niveau.

### 3. Les pages store restent trop monolithiques

Exemples:

- `Home.tsx` contient beaucoup de sections directement
- `CategoryPage.tsx` mélange navigation, filtres, agrégations et rendu
- `Cart.tsx` mélange lecture panier, checkout, guest identity et success flow

### 4. Les blocs "sectionnels" ne sont pas encore organisés par domaine

Il manque une hiérarchie claire entre:

- layout blocks
- page sections
- commerce blocks
- account blocks
- checkout blocks

### 5. Le legacy n'est pas balisé pour suppression

On a besoin d'une stratégie de migration où chaque page legacy a:

- sa future destination
- ses sous-blocs à extraire
- son moment de suppression

## Architecture Cible

Le store doit devenir un module applicatif autonome à l'intérieur du repo.

### Structure cible proposée

```text
pages/
  store/
    index.ts
    HomePage.tsx
    CategoryPage.tsx
    ProductPage.tsx
    CartPage.tsx
    LoginPage.tsx
    ProfilePage.tsx
    OrderTrackingPage.tsx
    static/
      AboutPage.tsx
      ContactPage.tsx
      PrivacyPolicyPage.tsx
      TermsPage.tsx
      DataDeletionPage.tsx

components/
  store-client/
    shell/
      StoreLayout.tsx
      StoreHeader.tsx
      StoreFooter.tsx
      StoreCategoryRail.tsx
      StoreNotificationModal.tsx
      StoreBootLoader.tsx
    home/
      StoreCoverSection.tsx
      HeroSliderSection.tsx
      FloatingBrandsSection.tsx
      CollectionsSection.tsx
      ProductRailSection.tsx
      TrustBadgesSection.tsx
    category/
      CategoryHero.tsx
      SubCategoryRail.tsx
      SubCategoryPickerModal.tsx
      CategoryFilterBar.tsx
      BrandGroupGrid.tsx
      CategoryListingGrid.tsx
    product/
      ProductBreadcrumb.tsx
      ProductHero.tsx
      ProductInfoHighlights.tsx
      ProductStickyMobileBar.tsx
    cart/
      CartItemsList.tsx
      CartSummaryCard.tsx
      CheckoutIdentityForm.tsx
      CheckoutPaymentForm.tsx
      CheckoutSuccessPanel.tsx
    account/
      AuthHeroPanel.tsx
      LoginForm.tsx
      RegisterForm.tsx
      OtpVerificationForm.tsx
      ProfileSidebar.tsx
      ProfileSecurityPanel.tsx
      ProfileForm.tsx
    order/
      OrderTrackingForm.tsx
      OrderTrackingTimeline.tsx
      OrderDeliveryPanel.tsx
    shared/
      ListingImage.tsx
      PriceDisplay.tsx
      ProductDescriptionCard.tsx
      ProductInfoModal.tsx
      ProductPriceCard.tsx
      ProductSystemRequirements.tsx
      ProductVariations.tsx
```

## Responsabilités Cibles Par Niveau

### Niveau 1: App shell

`App.tsx` doit uniquement gérer:

- bootstrap session
- bootstrap catalogue
- résolution de route
- sélection de la page à monter
- injection des props globales

Il ne doit plus contenir les détails UI du store.

### Niveau 2: Store shell

La couche shell store doit gérer:

- layout public
- header/footer
- navigation catégories
- notification store
- loader store

### Niveau 3: Pages store

Chaque page store doit uniquement:

- récupérer ses données via props
- préparer quelques vues dérivées
- composer des sections/blocs

Une page ne doit plus contenir un trop grand volume de rendu inline.

### Niveau 4: Sections / blocks

Les sections doivent encapsuler:

- UI
- interactions locales
- micro-état visuel

Elles ne doivent pas porter l'orchestration globale du store.

## Mapping De Migration Page Par Page

### 1. Home

Source actuelle:
- `pages/Home.tsx`

Cible:
- `pages/store/HomePage.tsx`

Blocs à extraire:
- `StoreCoverSection`
- `HeroSliderSection`
- `FloatingBrandsSection`
- `CollectionsSection`
- `ProductRailSection`
- `TrustBadgesSection`

Après migration:
- supprimer les gros blocs inline de `pages/Home.tsx`
- garder éventuellement une compatibilité temporaire puis retirer le fichier legacy

### 2. Category

Source actuelle:
- `pages/CategoryPage.tsx`

Cible:
- `pages/store/CategoryPage.tsx`

Blocs à extraire:
- `CategoryHero`
- `SubCategoryRail`
- `SubCategoryPickerModal`
- `CategoryFilterBar`
- `BrandGroupGrid`
- `CategoryListingGrid`

Après migration:
- supprimer logique de rendu mélangeant groupement + listing + modal dans un seul fichier

### 3. Product

Source actuelle:
- `pages/ProductPage.tsx`

Cible:
- `pages/store/ProductPage.tsx`

Blocs à extraire:
- `ProductBreadcrumb`
- `ProductHero`
- `ProductInfoHighlights`
- `ProductStickyMobileBar`

Blocs déjà réutilisables:
- `ProductVariations`
- `ProductDescriptionCard`
- `ProductSystemRequirements`
- `ProductPriceCard`
- `ProductInfoModal`

### 4. Cart / Checkout

Source actuelle:
- `pages/Cart.tsx`

Cible:
- `pages/store/CartPage.tsx`

Blocs à extraire:
- `CartItemsList`
- `CartSummaryCard`
- `CheckoutIdentityForm`
- `CheckoutPaymentForm`
- `CheckoutSuccessPanel`

Après migration:
- séparer clairement panier, checkout, succès

### 5. Auth

Source actuelle:
- `pages/Login.tsx`

Cible:
- `pages/store/LoginPage.tsx`

Blocs à extraire:
- `AuthHeroPanel`
- `LoginForm`
- `RegisterForm`
- `OtpVerificationForm`

Remarque:
- garder une variante admin si nécessaire, mais ne pas laisser le store dépendre d'un composant auth trop hybride

### 6. Profile

Source actuelle:
- `pages/Profile.tsx`

Cible:
- `pages/store/ProfilePage.tsx`

Blocs à extraire:
- `ProfileSidebar`
- `ProfileSecurityPanel`
- `ProfileForm`

### 7. Order tracking

Source actuelle:
- `pages/OrderTracking.tsx`

Cible:
- `pages/store/OrderTrackingPage.tsx`

Blocs à extraire:
- `OrderTrackingForm`
- `OrderTrackingTimeline`
- `OrderDeliveryPanel`

## Legacy À Supprimer Après Migration

Cette liste doit être traitée comme backlog de suppression, pas immédiatement.

### Fichiers legacy à remplacer

- `pages/Home.tsx`
- `pages/CategoryPage.tsx`
- `pages/ProductPage.tsx`
- `pages/Cart.tsx`
- `pages/Login.tsx`
- `pages/Profile.tsx`
- `pages/OrderTracking.tsx`

### Fichier temporaire à faire évoluer puis nettoyer

- `pages/store/index.ts`

Aujourd'hui:
- simple ré-export

Cible:
- vrai point d'entrée du module store

Après migration:
- supprimer tous les ré-exports legacy

## Ordre Recommandé Des Steps

### Phase 0. Architecture

Objectif:
- valider ce document
- figer le vocabulaire
- figer les responsabilités

Livrable:
- `new_store.md`

### Phase 1. Créer la vraie structure `pages/store`

Créer:

- `pages/store/HomePage.tsx`
- `pages/store/CategoryPage.tsx`
- `pages/store/ProductPage.tsx`
- `pages/store/CartPage.tsx`
- `pages/store/LoginPage.tsx`
- `pages/store/ProfilePage.tsx`
- `pages/store/OrderTrackingPage.tsx`

Sans suppression immédiate.

### Phase 2. Extraire le shell store

Créer ou renommer:

- `StoreLayout`
- `StoreHeader`
- `StoreFooter`
- `StoreCategoryRail`
- `StoreNotificationModal`

But:
- alléger `components/store-client/Layout.tsx`

### Phase 3. Refactor Home par sections

Commencer par la home car:

- elle est déjà sectionnée fonctionnellement
- elle dépend de `storeSections`
- elle donne le pattern pour toutes les autres pages

### Phase 4. Refactor Category

Deuxième priorité car:

- beaucoup de logique UI condensée
- bonnes opportunités d'extraction de blocs

### Phase 5. Refactor Product

Priorité suivante car:

- déjà semi-modulaire
- migration plus simple

### Phase 6. Refactor Cart / Checkout

Important pour clarifier:

- guest flow
- authenticated flow
- payment flow
- success flow

### Phase 7. Refactor Auth / Profile / Tracking

Finir les pages compte et post-achat.

### Phase 8. Nettoyage final

Quand toutes les routes store utilisent les nouvelles pages:

- supprimer les pages legacy
- nettoyer `pages/store/index.ts`
- retirer les wrappers temporaires
- retirer le code dupliqué

## Règles De Décision Pendant La Refonte

- ne jamais migrer page + suppression legacy dans la même première étape
- toujours extraire d'abord les blocs réutilisables
- conserver les props existantes tant que possible pour limiter les régressions
- ne pas déplacer la logique métier backend dans les composants UI
- garder `App.tsx` comme orchestrateur, pas comme page store
- documenter chaque bloc créé avec son rôle précis

## Première Exécution Recommandée

Quand on commencera le travail concret, l'ordre conseillé est:

1. transformer `pages/store/index.ts` en vrai barrel de nouvelles pages store
2. créer `StoreLayout`, `StoreHeader`, `StoreFooter`
3. découper `Home.tsx` en sections home
4. brancher la nouvelle `HomePage`
5. seulement ensuite continuer avec category et product

## Décision Architecture Validée Pour L'instant

Le store sera organisé comme un module dédié, avec:

- un shell public propre
- des pages store dédiées
- des sections par domaine
- une migration progressive
- une suppression finale du legacy uniquement après remplacement complet
