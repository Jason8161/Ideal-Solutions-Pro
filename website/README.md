# Ideal Solutions Pro — Marketing Website

Static marketing site for [Ideal Solutions Pro](../my-app/) built with [Astro](https://astro.build/) and Tailwind CSS.

**Production URL:** https://www.idealsolutionspro.com

## Local development

```bash
cd website
cp .env.example .env
npm install
npm run dev
```

Open http://localhost:4321

## Environment variables

| Variable | Purpose |
|----------|---------|
| `PUBLIC_SITE_URL` | Canonical / OG base URL — use `https://www.idealsolutionspro.com` in production |
| `PUBLIC_WAITLIST_FORM_ACTION` | Formspree POST URL for waitlist forms |
| `PUBLIC_CONTACT_FORM_ACTION` | Formspree POST URL for contact page (optional; falls back to waitlist URL) |
| `PUBLIC_APP_STORE_URL` | App Store link when published |
| `PUBLIC_PLAY_STORE_URL` | Google Play link when published |

Copy `.env.example` to `.env` for local builds. On Cloudflare Pages, set the same variables in the project dashboard (Production and Preview).

### Formspree setup

1. Create a free account at https://formspree.io
2. Create a form and copy its `https://formspree.io/f/xxxxx` URL
3. Set `PUBLIC_WAITLIST_FORM_ACTION` (and optionally `PUBLIC_CONTACT_FORM_ACTION`)

## Build

```bash
npm run build
npm run preview
```

Output directory: `dist/`

## Deploy on Cloudflare Pages

1. Push this repo to GitHub (or GitLab).
2. In [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Configure the build:

   | Setting | Value |
   |---------|--------|
   | Root directory | *(repo root)* |
   | Build command | `cd website && npm ci && npm run build` |
   | Build output directory | `website/dist` |
   | Node version | 22 |

4. **Environment variables** (Production):

   ```
   PUBLIC_SITE_URL=https://www.idealsolutionspro.com
   PUBLIC_WAITLIST_FORM_ACTION=https://formspree.io/f/YOUR_ID
   PUBLIC_CONTACT_FORM_ACTION=https://formspree.io/f/YOUR_ID
   ```

5. **Custom domain — www.idealsolutionspro.com**

   In the Pages project → **Custom domains** → **Set up a custom domain**:

   - Add **`www.idealsolutionspro.com`** (recommended primary).
   - Optionally add **`idealsolutionspro.com`** (apex) and redirect apex → `www`.

   **If DNS is already on Cloudflare** (same account as Pages):

   - Cloudflare usually creates the `www` CNAME to your `*.pages.dev` hostname automatically.
   - For the **apex** (`idealsolutionspro.com`), use a **CNAME flattening** record to the Pages target, or enable **Redirect rule**: `idealsolutionspro.com` → `https://www.idealsolutionspro.com` (301).

   **If DNS is at another registrar** (Namecheap, GoDaddy, etc.):

   | Type | Name | Value |
   |------|------|--------|
   | CNAME | `www` | `<your-project>.pages.dev` |
   | ALIAS/ANAME or redirect | `@` | Point apex to `www.idealsolutionspro.com` per registrar docs |

   Wait for DNS propagation (minutes to a few hours). Pages shows **Active** when SSL is ready.

6. **HTTPS** is automatic on Cloudflare once the domain is active.

### Preview deployments

Each pull request gets a preview URL. Use a separate Formspree form for Preview if you do not want test submissions in production.

## Site map

| Path | Page |
|------|------|
| `/` | Home + waitlist + promo imagery |
| `/features` | Feature sections |
| `/pricing` | Subscription tiers |
| `/about` | About |
| `/docs` | Documentation index |
| `/docs/*` | Doc articles (MDX in `src/content/docs/`) |
| `/blog` | Blog index |
| `/blog/*` | Blog posts (MDX in `src/content/blog/`) |
| `/contact` | Contact form |
| `/privacy` | Privacy policy (placeholder) |
| `/terms` | Terms of service (placeholder) |

## Brand assets

Marketing images live in `public/images/`:

| File | Source |
|------|--------|
| `hero-background.png` | Ideal solutions background |
| `brand-logo.png` | Ideal Solutions Pro logo |
| `avatar.png` | AI assistant avatar |
| `promo-ad1.png` | Ad1 promo |
| `promo-copy.png` | Copy promo |

Re-copy from your marketing folder (example paths):

```powershell
$src = "..\..\New folder (2)"   # adjust to your assets location
$dest = "website\public\images"
New-Item -ItemType Directory -Path $dest -Force
Copy-Item "$src\Ideal solutions background 2.png" "$dest\hero-background.png" -Force
Copy-Item "$src\Ideal Solutions Pro logo.png" "$dest\brand-logo.png" -Force
Copy-Item "$src\ChatGPT Image May 25, 2026, 05_53_15 AM.png" "$dest\avatar.png" -Force
Copy-Item "$src\Ad1.png" "$dest\promo-ad1.png" -Force
Copy-Item "$src\copy_7465BC73-60FE-4838-90E2-188B6980B802.PNG" "$dest\promo-copy.png" -Force
```

App tile artwork can still be synced from `my-app/assets/images/` as needed for feature pages.

## When the app goes live

1. Set `PUBLIC_APP_STORE_URL` and `PUBLIC_PLAY_STORE_URL` in Cloudflare Pages.
2. Redeploy — store buttons replace “Coming soon” labels.
3. Add App Store screenshots to `public/images/screenshots/` if desired.
