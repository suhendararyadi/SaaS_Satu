# Release — Website Sekolah Phase 2

Date: **11 September 2026 (Asia/Jakarta)**

## Production pointers

- Backend: `/home/ubuntu/deployments/SaaS_Satu/releases/5b16861-website-phase2`
- Static: `/var/www/saas-satu/releases/f142e94-website-phase2-meta`
- Backend commit: `5b1686189824aeccb54b4c28633cf835cd340307`
- Static metadata commit: `f142e947d723c041f019da84eb5a608574e5af15`
- Immediate backend rollback: `f382ad3-school-website-cms-safe`
- Immediate static rollback: `5b16861-website-phase2`

## Delivered

Phase 2 adds a controlled Landing Composer, tenant-scoped revision/audit snapshots, media-library selection for hero/cover, social links, shared public/preview rendering, and a substantial public-site redesign. The landing page is now an editorial-campus composition with strong institutional identity, quick paths, profile storytelling, program showcase, featured news, agenda, gallery, contact CTA, and an institutional footer. Empty data sections remain honest and simply do not render.

SEO now includes route-specific canonical, Open Graph and Twitter metadata, an `EducationalOrganization` JSON-LD graph on the landing page, `NewsArticle` JSON-LD for news detail, and a tenant-scoped XML sitemap. Nginx proxies only `/site/<slug>/sitemap.xml` to the backend; other public site routes remain on the existing SPA/static path.

## Migration and backups

Applied additive migration:

`20260910224500_add_school_website_phase2`

Pre-migration backup:

`/var/backups/saas-satu/saas_satu_staging-20260910T154255Z-pre-website-phase2.sql.gz`

Nginx pre-change backup:

`/etc/nginx/sites-available/sekolah.suhendararyadi.com.bak-20260910T222508Z-website-phase2`

The database reports `Database schema is up to date` after rollout. No starter seed was rerun.

## Production verification

- TypeScript: PASS
- Vitest: **76/76 PASS**
- Wasp 0.25 build with Node 24.14.1: PASS
- Vite SSR + client: PASS
- backend bundle: PASS
- full preflight + full cutover: PASS
- static metadata preflight/cutover: PASS; second cutover `idempotent: true`
- service: active
- `/auth/me`: HTTP 200
- `/site/smkn-1-rongga`: HTTP 200
- sitemap: HTTP 200, `application/xml`, invalid tenant slug 404
- unauthenticated CMS admin operation: HTTP 401
- desktop 1440×900 and iPhone 390×844: no horizontal overflow, no DEMO marker, console errors 0, request failures 0
- school-specific canonical/OG/Twitter metadata: PASS
- `EducationalOrganization` and `NewsArticle` JSON-LD: PASS

SMKN 1 RONGGA remains `PUBLISHED` with `robotsIndex=false` (`noindex,nofollow`) until the school deliberately enables indexing.

## Explicit limitation

Production file storage currently reports `enabled:false`. Direct image upload is therefore intentionally not presented as a working capability. Media library entries remain explicit public HTTPS images with required alt text, and existing media can be selected for hero/cover. Direct upload + image variants should only be enabled after a real object-storage/CDN configuration is provisioned and verified.
