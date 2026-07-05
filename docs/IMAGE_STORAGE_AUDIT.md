# Audit stockage images

## Etat initial confirme

- `Listing.imageUrl` et `Listing.logoUrl` sont de simples `String` Prisma, donc la base pouvait contenir soit des URLs soit des `data:image/...` sans contrainte structurelle.
  Preuve : `server/schema.prisma`
- `Category.imageUrl` est aussi un `String?` libre.
  Preuve : `server/schema.prisma`
- La configuration du site est stockee dans `SiteConfig.data` en `Json`, donc les visuels du site pouvaient etre stockes inline directement dans le JSON.
  Preuve : `server/schema.prisma`, `server/services/siteConfigService.ts`
- Le front admin produisait historiquement des `data:` cote navigateur via `FileReader` + `canvas.toDataURL(...)`.
  Preuve : `components/shared/ImageInput.tsx`
- Le backend avait explicitement des parsers JSON "large payload" pour `/api/config`, `/api/listings` et `/api/categories`, ce qui confirmait la prise en charge de payloads lourds lies aux images inline.
  Preuve : historique dans `server/config/httpSecurity.ts` et `server/app.ts`
- Le controller config journalisait deja une estimation de taille base64 pour `logoUrl` et `faviconUrl`.
  Preuve : historique dans `server/controllers/configController.ts`

## Champs concernes par la migration

- `Category.imageUrl`
- `Listing.imageUrl`
- `Listing.logoUrl`
- `Listing.gallery[]`
- `SiteConfig.logoUrl`
- `SiteConfig.faviconUrl`
- `SiteConfig.startupLoaderImageUrl`
- `SiteConfig.coverBackgroundUrl`
- `SiteConfig.seoOgImageUrl`
- `SiteConfig.heroSlides[].imageUrl`
- `SiteConfig.heroPromoBanners[].imageUrl`
- `SiteConfig.floatingBrandCards[].imageUrl`

## Nouveau fonctionnement

- Upload staff via `POST /api/uploads`
- Traitement serveur `multer` memoire -> `sharp` -> `webp` max `1600px`
- Ecriture disque dans `UPLOADS_DIR` avec valeur par defaut `/data/uploads`
- Publication publique sous `/uploads/...` avec cache `public, max-age=31536000, immutable`
- Rejet serveur des nouveaux `data:image/...` sur produits, categories et champs images de la config

## Commandes utiles

```bash
npm run images:audit
npm run images:migrate
```
