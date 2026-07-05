#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

log() {
  printf '[deploy] %s\n' "$1"
}

if ! command -v node >/dev/null 2>&1; then
  log "Node.js n'est pas installe."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  log "npm n'est pas installe."
  exit 1
fi

if ! command -v psql >/dev/null 2>&1; then
  log "PostgreSQL client n'est pas installe."
  exit 1
fi

if [ ! -f ".env" ]; then
  log "Fichier .env introuvable dans $PROJECT_DIR."
  exit 1
fi

required_vars=(
  PORT
  DATABASE_URL
  JWT_SECRET
  AUTH_SECRET
  AUTH_URL
)

for var_name in "${required_vars[@]}"; do
  if ! grep -Eq "^${var_name}=.+" .env; then
    log "Variable manquante ou vide dans .env: ${var_name}"
    exit 1
  fi
done

log "Installation des dependances npm..."
npm install

log "Build front + back..."
npm run build

log "Application des migrations Prisma..."
npx prisma migrate deploy --schema server/schema.prisma
npx prisma generate --schema server/schema.prisma

if systemctl list-unit-files | grep -q '^tunibots\.service'; then
  log "Redemarrage du service systemd tunibots..."
  sudo systemctl restart tunibots
  sudo systemctl --no-pager --full status tunibots
else
  log "Service systemd tunibots non installe. Lance l'application avec: npm start"
fi

log "Deploiement local termine."
