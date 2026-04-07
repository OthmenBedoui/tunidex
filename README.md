# Tunidex

Guide d'installation du projet en local et sur serveur.

## 1. Prérequis

Avant de commencer, installe :

- `Node.js` 20+ recommandé
- `npm`
- `PostgreSQL` 14+ recommandé
- `Git`

Vérifie les versions :

```bash
node -v
npm -v
```

## 2. Cloner le projet

```bash
git clone <URL_DU_REPO>
cd Tunidex
```

## 3. Installer les dépendances

```bash
npm install
```

## 4. Configurer les variables d'environnement

Le projet utilise le fichier [`.env`](c:\Users\Othme\OneDrive\Documents\Tunidex\.env).

Exemple minimal :

```env
NODE_ENV=development
JWT_SECRET="tunidev"
API_KEY="votre_cle_gemini_api"
DATABASE_URL="postgresql://postgres:0507@localhost:5432/tunidex"
```

Notes :

- `DATABASE_URL` doit pointer vers ta base PostgreSQL.
- `API_KEY` est utilisée pour les fonctionnalités IA.
- `JWT_SECRET` est utilisée pour l'authentification.

## 5. Préparer PostgreSQL en local

Créer la base si elle n'existe pas encore :

```sql
CREATE DATABASE tunidex;
```

Paramètres actuellement attendus :

- Base : `tunidex`
- User : `postgres`
- Mot de passe : `0507`
- Host : `localhost`
- Port : `5432`

## 6. Générer Prisma Client

```bash
npx prisma generate --schema server/schema.prisma
```

## 7. Exécuter les migrations Prisma

Si la migration existe déjà dans le projet :

```bash
npx prisma migrate deploy --schema server/schema.prisma
```

Si tu crées une nouvelle migration en développement :

```bash
npx prisma migrate dev --schema server/schema.prisma --name nom_de_la_migration
```

## 8. Lancer le projet en local

Le projet démarre le backend Express et monte Vite en middleware en mode développement.

```bash
npm run dev
```

Application :

- Site : `http://localhost:3000`
- Swagger : `http://localhost:3000/api-docs`

## 9. Seed initial de la base

Au démarrage, le projet exécute automatiquement le seeding via `server/utils/seeder.ts`.

Cela crée notamment :

- les comptes admin/agent par défaut
- les catégories
- les sous-catégories

Si tu veux simplement relancer le seed manuellement :

```bash
npx tsx -e "import { seedDatabase } from './server/utils/seeder.ts'; await seedDatabase();"
```

## 10. Vérifier Prisma

Validation du schéma :

```bash
npx prisma validate --schema server/schema.prisma
```

Voir l'état des migrations :

```bash
npx prisma migrate status --schema server/schema.prisma
```

Ouvrir Prisma Studio :

```bash
npx prisma studio --schema server/schema.prisma
```

## 11. Build pour production

Créer le build frontend :

```bash
npm run build
```

Important :

- le build Vite génère le frontend dans `dist/`
- en production, le serveur Express sert `dist/`
- le démarrage serveur se fait avec `NODE_ENV=production`

## 12. Lancer en mode production

### Option simple

Après build :

```bash
$env:NODE_ENV="production"
npx tsx server/index.ts
```

Sous Linux :

```bash
NODE_ENV=production npx tsx server/index.ts
```

## 13. Déploiement sur serveur VPS

Exemple de procédure :

### Étape 1. Installer les dépendances système

Sur Ubuntu/Debian :

```bash
sudo apt update
sudo apt install -y git curl build-essential
```

Installer Node.js :

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Installer PostgreSQL :

```bash
sudo apt install -y postgresql postgresql-contrib
```

### Étape 2. Créer la base PostgreSQL

```bash
sudo -u postgres psql
```

Puis :

```sql
CREATE DATABASE tunidex;
CREATE USER tunidex_user WITH ENCRYPTED PASSWORD 'mot_de_passe_solide';
GRANT ALL PRIVILEGES ON DATABASE tunidex TO tunidex_user;
```

### Étape 3. Cloner et installer le projet

```bash
git clone <URL_DU_REPO>
cd Tunidex
npm install
```

### Étape 4. Configurer `.env`

Exemple serveur :

```env
NODE_ENV=production
JWT_SECRET="change_ce_secret"
API_KEY="votre_cle_gemini_api"
DATABASE_URL="postgresql://tunidex_user:mot_de_passe_solide@localhost:5432/tunidex"
```

### Étape 5. Exécuter Prisma

```bash
npx prisma generate --schema server/schema.prisma
npx prisma migrate deploy --schema server/schema.prisma
```

### Étape 6. Builder l'application

```bash
npm run build
```

### Étape 7. Démarrer l'application

```bash
NODE_ENV=production npx tsx server/index.ts
```

## 14. Lancer avec PM2 sur serveur

Installer PM2 :

```bash
npm install -g pm2
```

Démarrer Tunidex :

```bash
pm2 start "npx tsx server/index.ts" --name tunidex --env production
```

Ou :

```bash
pm2 start server/index.ts --name tunidex --interpreter npx --interpreter-args tsx
```

Sauvegarder :

```bash
pm2 save
pm2 startup
```

Logs :

```bash
pm2 logs tunidex
```

## 15. Reverse proxy Nginx

Exemple de config :

```nginx
server {
    listen 80;
    server_name votre-domaine.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Puis :

```bash
sudo nginx -t
sudo systemctl reload nginx
```

## 16. SSL avec Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d votre-domaine.com
```

## 17. Commandes utiles

Installer les dépendances :

```bash
npm install
```

Démarrer en développement :

```bash
npm run dev
```

Build frontend :

```bash
npm run build
```

Générer Prisma Client :

```bash
npx prisma generate --schema server/schema.prisma
```

Appliquer les migrations :

```bash
npx prisma migrate deploy --schema server/schema.prisma
```

Créer une migration en dev :

```bash
npx prisma migrate dev --schema server/schema.prisma --name nouvelle_migration
```

Ouvrir Prisma Studio :

```bash
npx prisma studio --schema server/schema.prisma
```

## 18. Structure utile du projet

```text
Tunidex/
├── components/
├── pages/
├── services/
├── utils/
├── server/
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── migrations/
│   ├── prisma.ts
│   ├── schema.prisma
│   └── index.ts
├── .env
├── package.json
└── README.md
```

## 19. Dépannage

### Prisma ne se connecte pas

Vérifie :

- PostgreSQL est démarré
- `DATABASE_URL` est correcte
- la base `tunidex` existe
- l'utilisateur PostgreSQL a les droits

### Les tables ne sont pas créées

Relance :

```bash
npx prisma generate --schema server/schema.prisma
npx prisma migrate deploy --schema server/schema.prisma
```

### Le site ne s'affiche pas en production

Vérifie :

- `npm run build` a bien généré `dist/`
- `NODE_ENV=production` est bien défini
- le port `3000` est ouvert ou reverse-proxyé par Nginx

### Le serveur ne démarre pas

Vérifie :

- les variables `.env`
- PostgreSQL
- les logs PM2 ou la sortie console

## 20. Résumé rapide

Installation locale :

```bash
npm install
npx prisma generate --schema server/schema.prisma
npx prisma migrate deploy --schema server/schema.prisma
npm run dev
```

Installation serveur :

```bash
npm install
npx prisma generate --schema server/schema.prisma
npx prisma migrate deploy --schema server/schema.prisma
npm run build
NODE_ENV=production npx tsx server/index.ts
```
