# Security Cleanup

`server/dev.db` a deja ete retire de l'arborescence de travail, mais il reste present dans l'historique Git. Il faut donc purger l'historique du depot avant toute nouvelle publication.

## Purger `server/dev.db` de l'historique Git

1. Installer `git-filter-repo` :

```bash
pip install git-filter-repo
```

2. Verifier que l'arbre de travail est propre, puis supprimer `server/dev.db` de tout l'historique :

```bash
git filter-repo --path server/dev.db --invert-paths
```

3. Forcer la mise a jour du depot distant :

```bash
git push --force origin main
```

4. Prevenir tous les collaborateurs avant le `push --force`.
   Chacun devra resynchroniser son clone local apres la recriture d'historique.

## Checklist de verification

Verifier les fichiers ajoutes dans tout l'historique :

```bash
git log --all --diff-filter=A --name-only | sort -u
```

Verifier en particulier qu'aucun de ces fichiers n'apparait dans le resultat :

- `.env`
- `.env.production`
- tout dump SQL (`*.sql`, `*.dump`)
- bases SQLite (`*.db`, `*.sqlite`)
- fichiers contenant des cles API ou secrets applicatifs

Verifier aussi les contenus sensibles avec des recherches ciblees :

```bash
git log -p --all -- . ':!package-lock.json' | rg -n "JWT_SECRET|AUTH_SECRET|API_KEY|SMTP_|DATABASE_URL|WHATSAPP_BOT_WEBHOOK_TOKEN|CLIENT_SECRET|PRIVATE_KEY"
```

## Rotation immediate des secrets

La copie historique de `server/dev.db` disponible ici est corrompue et n'a pas pu etre inspectee de maniere fiable. En l'absence d'audit complet, il faut traiter tout secret potentiellement stocke ou reutilise dans cette base comme compromis.

Secrets a faire tourner immediatement :

- `JWT_SECRET`
- `AUTH_SECRET`
- `API_KEY`
- `DATABASE_URL` si le mot de passe PostgreSQL a ete reutilise ou stocke dans des donnees de test
- `SMTP_PASS`
- `WHATSAPP_BOT_WEBHOOK_TOKEN`
- `GOOGLE_CLIENT_SECRET`
- `FACEBOOK_APP_SECRET`
- `APPLE_PRIVATE_KEY`
- `DISCORD_CLIENT_SECRET`
- `GITHUB_CLIENT_SECRET`
- `MICROSOFT_CLIENT_SECRET`
- mots de passe des comptes seed de developpement si reutilises ailleurs (`DEFAULT_ADMIN_PASSWORD`, `DEFAULT_AGENT_PASSWORD`)

Donnees applicatives a verifier et a reinitialiser si elles proviennent de `dev.db` :

- comptes admin ou agent de test
- mots de passe utilisateurs de test
- refresh tokens
- webhooks ou URLs internes de test

## Procedure de rotation recommandee

1. Generer de nouvelles valeurs pour tous les secrets listes ci-dessus.
2. Mettre a jour les variables d'environnement sur tous les environnements concernes.
3. Revoquer les sessions existantes si necessaire.
4. Changer les mots de passe des comptes de test exposes ou recreer ces comptes.
5. Redeployer l'application.
6. Verifier apres deploiement :

```bash
npm run build
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/tunibots" npx prisma validate --schema server/schema.prisma
```

## Note operationnelle

Si un collaborateur a clone le depot avant la purge, il doit nettoyer son clone local apres la recriture d'historique, par exemple en reclonant le depot ou en resynchronisant soigneusement sa branche a partir du nouveau `origin/main`.
