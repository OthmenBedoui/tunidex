# Checkpoint Sprint 3

Date d'audit : 2026-07-03

Ce document decrit l'etat reel du repo TuniBots apres revue du code en place, sans supposer que les prompts precedents ont ete termines proprement.

## Verification globale

- `npm run build` : ✅ passe localement
- `npm run lint` : ❌ echoue avec 57 erreurs / 12 warnings
- `npm test` : ❌ echoue dans l'environnement audite car `DATABASE_URL_TEST` n'est pas configuree

## Sprint 0

| Point | Statut | Preuve |
| --- | --- | --- |
| `.env.example` complet | ✅ | [`.env.example`](../.env.example) documente runtime, JWT, test DB, SMTP, OAuth, WhatsApp |
| Repo propre | ⚠️ | [`.gitignore`](../.gitignore) ignore bien `dist/`, `node_modules/`, `.env*`, `*.db`, mais `git status --short` montre un worktree tres charge au moment de l'audit |
| Pas de fichiers generes trackes | ✅ | `git ls-files dist server/dev.db node_modules .env` ne remonte rien ; les patterns sont ignores dans [`.gitignore`](../.gitignore) |
| README setup a jour | ✅ | [`README.md`](../README.md) mis a jour pendant cet audit pour coller a la structure et aux scripts reels |

## Sprint 1

| Point | Statut | Preuve |
| --- | --- | --- |
| `JWT_SECRET` obligatoire | ✅ | [`server/config/env.ts`](../server/config/env.ts) impose `JWT_SECRET` min 32 caracteres |
| Expiration access token | ✅ | [`server/services/authTokenService.ts`](../server/services/authTokenService.ts) avec `ACCESS_TOKEN_TTL = '2h'` |
| Refresh token persistant + rotation | ✅ | [`server/services/authTokenService.ts`](../server/services/authTokenService.ts), modele [`RefreshToken`](../server/schema.prisma) et migration [`20260703125948_add_refresh_tokens`](../server/migrations/20260703125948_add_refresh_tokens/migration.sql) |
| CORS whitelist | ✅ | [`server/config/httpSecurity.ts`](../server/config/httpSecurity.ts) + parsing de `ALLOWED_ORIGINS` dans [`server/config/env.ts`](../server/config/env.ts) |
| `helmet` | ✅ | [`server/config/httpSecurity.ts`](../server/config/httpSecurity.ts) puis montage dans [`server/app.ts`](../server/app.ts) |
| `express-rate-limit` | ✅ | [`server/config/httpSecurity.ts`](../server/config/httpSecurity.ts) + montage auth/guest/global dans [`server/app.ts`](../server/app.ts) |
| Validation Zod sur les ecritures | ⚠️ | La plupart des routes d'ecriture passent par [`server/validation/validate.ts`](../server/validation/validate.ts) et les schemas `server/validation/*`. Petit ecart corrige pendant l'audit : params de [`server/routes/admin/authProvidersRoutes.ts`](../server/routes/admin/authProvidersRoutes.ts). Il reste des callbacks sociaux `POST /api/auth/oauth/:provider/callback` et `POST /api/auth/callback/:provider` sans validation Zod explicite dans [`server/routes/authRoutes.ts`](../server/routes/authRoutes.ts) |
| Roles unifies | ✅ | [`server/constants/roles.ts`](../server/constants/roles.ts), [`types.ts`](../types.ts) et migration [`20260703140000_normalize_legacy_user_roles`](../server/migrations/20260703140000_normalize_legacy_user_roles/migration.sql) |
| Seed uniquement via `npm run db:seed` | ✅ | Script dans [`package.json`](../package.json), entree explicite [`server/seed.ts`](../server/seed.ts), aucun seed automatique dans [`server/index.ts`](../server/index.ts) |
| Sauvegardes `deploy/backup/` | ✅ | [`deploy/backup/backup.sh`](../deploy/backup/backup.sh), [`restore.sh`](../deploy/backup/restore.sh), [`start-cron.sh`](../deploy/backup/start-cron.sh) |

## Sprint 2

| Point | Statut | Preuve |
| --- | --- | --- |
| Modele Prisma `Notification` unifie | ✅ | [`server/schema.prisma`](../server/schema.prisma) avec `recipientId`, `readAt`, `dedupeKey`, indexes et relation unique |
| `notificationService` present | ✅ | [`server/services/notificationService.ts`](../server/services/notificationService.ts) avec `notifyUser` et `notifyStaff` |
| Routes `/api/notifications*` | ✅ | [`server/routes/notificationRoutes.ts`](../server/routes/notificationRoutes.ts) + [`server/controllers/notificationController.ts`](../server/controllers/notificationController.ts) |
| Front notifications sans `localStorage` | ✅ | Aucun `localStorage` dans [`src/contexts/NotificationContext.tsx`](../src/contexts/NotificationContext.tsx) ni [`src/hooks/useNotifications.ts`](../src/hooks/useNotifications.ts) |
| Front notifications sans diffing maison | ⚠️ | L'etat source vient bien de React Query via [`src/hooks/useNotifications.ts`](../src/hooks/useNotifications.ts), mais [`src/contexts/NotificationContext.tsx`](../src/contexts/NotificationContext.tsx) garde encore une logique manuelle `previousPollAt` pour detecter les nouvelles commandes admin |
| Helper global d'erreurs / toasts | ✅ | [`utils/apiError.ts`](../utils/apiError.ts) centralise l'extraction/notification d'erreur, et [`src/contexts/UIContext.tsx`](../src/contexts/UIContext.tsx) fournit les toasts globaux |

## Sprint 3

| Point | Statut | Preuve |
| --- | --- | --- |
| `react-router` en place | ✅ | [`App.tsx`](../App.tsx), [`src/routes.tsx`](../src/routes.tsx), [`main.tsx`](../main.tsx) |
| Contextes par domaine | ✅ | [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx), [`CartContext.tsx`](../src/contexts/CartContext.tsx), [`CommerceContext.tsx`](../src/contexts/CommerceContext.tsx), [`NotificationContext.tsx`](../src/contexts/NotificationContext.tsx), [`UIContext.tsx`](../src/contexts/UIContext.tsx) |
| `App.tsx` < 150 lignes | ✅ | [`App.tsx`](../App.tsx) fait 30 lignes |
| TanStack Query partout | ⚠️ | Le socle est bien la via [`src/queryClient.ts`](../src/queryClient.ts), [`src/hooks/*`](../src/hooks) et [`src/queryKeys.ts`](../src/queryKeys.ts), mais plusieurs ecrans/contexts appellent encore `api.*` directement hors hooks Query : [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx), [`src/routes.tsx`](../src/routes.tsx), [`pages/store/LoginPage.tsx`](../pages/store/LoginPage.tsx), [`pages/store/CartPage.tsx`](../pages/store/CartPage.tsx), [`pages/store/ProfilePage.tsx`](../pages/store/ProfilePage.tsx), [`pages/RegisterAuthenticationAdmin.tsx`](../pages/RegisterAuthenticationAdmin.tsx), [`pages/Dashboards.tsx`](../pages/Dashboards.tsx) |
| Controllers decoupes par domaine et < 400 lignes | ⚠️ | La decomposition par domaine progresse (`notificationController`, `orderAdminController`, `userAdminController`, `configController`, `dataController`, `statsController`), mais plusieurs controllers depassent encore le seuil : [`server/controllers/authController.ts`](../server/controllers/authController.ts) 501 lignes, [`cartController.ts`](../server/controllers/cartController.ts) 463, [`productController.ts`](../server/controllers/productController.ts) 841 |
| Tests Vitest + Supertest | ✅ | [`vite.config.ts`](../vite.config.ts), [`tests/run-vitest.ts`](../tests/run-vitest.ts), [`tests/helpers/testRuntime.ts`](../tests/helpers/testRuntime.ts), [`tests/integration/*.test.ts`](../tests/integration) |
| CI GitHub Actions | ✅ | [`.github/workflows/ci.yml`](../.github/workflows/ci.yml) lance `lint`, `build`, `test` avec service PostgreSQL |

## Petits ecarts corriges pendant cet audit

1. Ajout d'une validation Zod sur `:providerKey` pour la route admin d'update des providers OAuth.
   Preuves : [`server/validation/authProviderSchemas.ts`](../server/validation/authProviderSchemas.ts), [`server/routes/admin/authProvidersRoutes.ts`](../server/routes/admin/authProvidersRoutes.ts)
2. Mise a jour du README pour refleter les scripts, dossiers et exigences reelles.
   Preuve : [`README.md`](../README.md)

## Gros ecarts a traiter separement

1. Lint non vert.
   Preuves : erreurs dans [`pages/Dashboards.tsx`](../pages/Dashboards.tsx), [`src/contexts/NotificationContext.tsx`](../src/contexts/NotificationContext.tsx), [`src/contexts/CommerceContext.tsx`](../src/contexts/CommerceContext.tsx), [`components/shared/SocialAuthButtons.tsx`](../components/shared/SocialAuthButtons.tsx), plusieurs fichiers admin/front/back.
2. `DATABASE_URL_TEST` absente de l'environnement local audite, ce qui bloque `npm test`.
   Preuves : [`tests/run-vitest.ts`](../tests/run-vitest.ts), [`README.md`](../README.md)
3. Migration React Query incomplete.
   Preuves : appels `api.*` directs encore nombreux dans [`pages/`](../pages), [`src/routes.tsx`](../src/routes.tsx) et [`src/contexts/AuthContext.tsx`](../src/contexts/AuthContext.tsx)
4. Controllers trop volumineux pour considerer le decoupage Sprint 3 termine.
   Preuves : [`server/controllers/productController.ts`](../server/controllers/productController.ts), [`authController.ts`](../server/controllers/authController.ts), [`cartController.ts`](../server/controllers/cartController.ts)
5. Logique notification admin encore partly imperative.
   Preuve : [`src/contexts/NotificationContext.tsx`](../src/contexts/NotificationContext.tsx) avec `previousPollAt` et `blockingOrderNotification`
6. Worktree non propre, ce qui complique tout vrai checkpoint de fin de sprint.
   Preuve : `git status --short` au moment de l'audit

## Point de reprise recommande pour Sprint 4

1. Stabiliser d'abord la baseline dev.
   Faire passer `npm run lint`, definir `DATABASE_URL_TEST`, puis revalider `npm test`.
2. Terminer la migration Query / decoupage avant de parler performance.
   Sortir les appels `api.*` restants des pages, puis scinder `productController`, `authController`, `cartController`.
3. Ensuite seulement attaquer Sprint 4.
   La perf/observabilite aura une base beaucoup plus fiable une fois la CI reellement verte.
