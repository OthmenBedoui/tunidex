# TuniBots

Marketplace React + Vite avec backend Express 5, Prisma 5 et PostgreSQL, deploye localement sans conteneur.

## Prerequis

- `Node.js` 20+
- `npm`
- `PostgreSQL` 14+

## Setup local

### 1. Installer

```bash
git clone <repo-url>
cd tunibots
npm install
cp .env.example .env
```

### 2. Configurer l'environnement

Variables minimales a renseigner dans `.env` :

- `DATABASE_URL`
- `JWT_SECRET` avec au moins 32 caracteres
- `AUTH_SECRET` avec au moins 32 caracteres
- `AUTH_URL`
- `ALLOWED_ORIGINS`

Le fichier [`.env.example`](.env.example) documente aussi OAuth, SMTP, WhatsApp et la base de test `DATABASE_URL_TEST`.
Il documente aussi `UPLOADS_DIR`, utilise pour stocker les images optimisees servies sous `/uploads/...`.
Il documente aussi `SENTRY_DSN` et `LOG_LEVEL` pour l'observabilite.

### 3. Preparer PostgreSQL

Exemple local :

```sql
CREATE DATABASE tunibots;
CREATE DATABASE tunibots_test;
```

Exemple d'URLs :

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tunibots
DATABASE_URL_TEST=postgresql://postgres:postgres@localhost:5432/tunibots_test
```

### 4. Prisma

```bash
npx prisma migrate deploy --schema server/schema.prisma
npx prisma generate --schema server/schema.prisma
```

Seed de dev explicite :

```bash
npm run db:seed
```

### 5. Lancer l'application

```bash
npm run dev
```

URLs utiles :

- App : `http://localhost:3000`
- Swagger : `http://localhost:3000/api-docs`
- Health : `http://localhost:3000/health`

## Tests

La suite d'integration utilise `Vitest` + `Supertest` contre l'app Express reelle.

```bash
npm test
```

Scripts utiles :

- `npm run test:watch`
- `npm run test:db:reset`
- `npm run test:db:generate`
- `npm run test:seed:orders -- 10000`
- `npm run images:audit`
- `npm run images:migrate`

Les suites remettent la base de test a zero avec `prisma migrate reset --force --skip-seed --schema server/schema.prisma`.

## Scripts principaux

- `npm run dev` : backend Express + Vite middleware en dev
- `npm run build` : `tsc` + build Vite
- `npm run lint` : ESLint front + back
- `npm test` : integration tests Vitest
- `npm run db:seed` : seed explicite
- `npm run db:migrate` : `prisma migrate deploy`
- `npm run db:generate` : `prisma generate`
- `npm run images:audit` : compte les `data:image/...` encore presents en base
- `npm run images:migrate` : extrait les images inline vers `UPLOADS_DIR` puis remplace par des URLs

## Structure reelle

```text
.
├── components/          # UI shared + store + admin
├── deploy/
│   ├── backup/          # backup.sh, restore.sh, cron
│   └── nginx/
├── docs/                # checkpoint, notes, archives
├── pages/               # pages legacy/store/admin/account
├── server/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── migrations/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── validation/
├── src/
│   ├── components/
│   ├── contexts/
│   ├── hooks/
│   └── queryClient.ts
└── tests/
    ├── helpers/
    ├── integration/
    └── setup/
```

## Notes utiles

- Le serveur ne seed pas automatiquement au demarrage. Le seed passe uniquement par `npm run db:seed`.
- Les comptes `DEFAULT_ADMIN_*` et `DEFAULT_AGENT_*` ne sont seeds qu'en developpement.
- Les notifications client/admin passent par l'API `/api/notifications*` et par React Query cote front.
- Les sauvegardes shell et restauration sont dans [`deploy/backup/`](deploy/backup).
- En production, Express sert `dist/` quand `NODE_ENV=production`.
- Les uploads images admin passent par `POST /api/uploads`, sont convertis en `webp` et exposes publiquement sous `/uploads/...`.
- L'audit detaille du stockage historique des images est dans [`docs/IMAGE_STORAGE_AUDIT.md`](docs/IMAGE_STORAGE_AUDIT.md).
- Si `SENTRY_DSN` est defini, Sentry est active cote backend et frontend.
- Le endpoint `/health` verifie Prisma avec `SELECT 1` et peut servir de probe pour Nginx ou systemd.
