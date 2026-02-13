# Deploy The Nightly Build to Vercel via GitHub

Step-by-step guide to deploy this project to Vercel using your GitHub repository.

---

## Prerequisites

- A **GitHub** account with this repo pushed (e.g. `ianmxaof/maltbot-skill-decide-inbox` or your fork).
- A **Vercel** account (free at [vercel.com](https://vercel.com)).
- **Google OAuth** credentials for sign-in (see Step 4).

---

## Step 1: Push your code to GitHub

If the project is not yet on GitHub:

1. Create a new repository on [github.com](https://github.com/new) (e.g. `context-hub` or `nightly-build`).
2. In your project folder, add the remote and push:

   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git branch -M main
   git push -u origin main
   ```

   If you already use a different branch (e.g. `feature/readme-nightly-build-integrations`), you can deploy that branch in Vercel.

---

## Step 2: Sign in to Vercel and import the project

1. Go to [vercel.com](https://vercel.com) and sign in (or create an account).
2. Click **Add New…** → **Project**.
3. Under **Import Git Repository**, connect GitHub if you haven’t:
   - Click **Continue with GitHub** and authorize Vercel.
4. Find your repository in the list and click **Import** next to it.

---

## Step 3: Configure the project (Vercel import screen)

1. **Project Name**: Keep the default or set one (e.g. `nightly-build`).
2. **Framework Preset**: Should be **Next.js** (auto-detected).
3. **Root Directory**: Leave as **./** unless the app lives in a subfolder.
4. **Build Command**: Leave default (`next build`).
5. **Output Directory**: Leave default (`.next`).
6. **Install Command**: Leave default (`npm install`).
7. Do **not** click Deploy yet — add environment variables first (Step 4).

---

## Step 4: Add environment variables

Before the first deploy, add at least the **required** variables. Optional ones can be added later.

### Required (must set for production)

| Variable | Where to get it | Notes |
|----------|------------------|--------|
| `AUTH_SECRET` | Generate a random string | e.g. `openssl rand -base64 32` or [generate](https://generate-secret.vercel.app/32). Used for NextAuth JWT signing. |
| `NEXTAUTH_URL` | Your production URL | After first deploy: `https://your-project.vercel.app`. Update after adding a custom domain. |
| `AUTH_GOOGLE_ID` | Google Cloud Console | From OAuth 2.0 Client (Web). |
| `AUTH_GOOGLE_SECRET` | Google Cloud Console | From same OAuth client. |

**Google OAuth setup (for AUTH_GOOGLE_*):**

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**.
2. **Create Credentials** → **OAuth client ID**.
3. Application type: **Web application**.
4. **Authorized redirect URIs** add:
   - `https://your-project.vercel.app/api/auth/callback/google`  
   (Replace with your actual Vercel URL; you can add a custom domain later.)
5. Copy **Client ID** → `AUTH_GOOGLE_ID`, **Client secret** → `AUTH_GOOGLE_SECRET`.

### Required for production data (Vercel has no persistent disk)

Use **one** of the following. Supabase is recommended (no CLI; works on Windows without WSL).

**Option 1 — Supabase (recommended)**

1. Sign up or sign in at [supabase.com](https://supabase.com) and open your project (or create one).
2. In the dashboard: **Project Settings** (gear) → **API**. Copy:
   - **Project URL** → `SUPABASE_URL` in Vercel (e.g. `https://xxxx.supabase.co`).
   - **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_ROLE_KEY` in Vercel. Keep this secret.
3. Run the schema once: **SQL Editor** → New query → paste the contents of **`docs/supabase-schema.sql`** → Run.
4. In Vercel, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. No other DB env vars needed.

| Variable | Where to get it |
|----------|------------------|
| `SUPABASE_URL` | Supabase Dashboard → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Same page → Project API keys → **service_role** (secret) |

**Option 2 — Turso (libSQL)**

Turso requires the Turso CLI; on Windows the CLI is only available inside WSL (and your WSL may lack `curl`/`sudo`). If you prefer Turso:

| Variable | Where to get it |
|----------|------------------|
| `TURSO_DATABASE_URL` | [Turso](https://turso.tech) — create a DB, copy the libSQL URL. |
| `TURSO_AUTH_TOKEN` | Turso dashboard → your DB → **Tokens** → Create token. |

CLI setup: on **macOS/Linux** (or WSL with `curl` installed), run `curl -sSfL https://get.tur.so/install.sh | bash`, then `turso auth login`, `turso db create nightly-build --region nrt`, `turso db show nightly-build --url`, and `turso db tokens create nightly-build`. Use the URL and token as the env vars above.

### Optional but recommended

| Variable | Purpose |
|----------|---------|
| `MOLTBOOK_API_KEY` | Moltbook integration (feed, execute actions). |
| `WORKER_API_SECRET` | Auth for worker API; set the same value in worker `.env`. |

### Optional (features)

| Variable | Purpose |
|----------|---------|
| `RESEND_API_KEY` | Morning briefing emails. |
| `DIGEST_FROM_EMAIL` | Sender for digest (e.g. `nightly@yourdomain.com`). |
| `VAULT_MASTER_PASSWORD` | Credential vault (min 16 chars). |
| `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, etc. | Command Center / consensus. |
| `AUDIT_WEBHOOK_URL` | Forward immutable audit log. |

**How to add in Vercel:**

1. On the import screen, open **Environment Variables**.
2. For each variable: **Key** = name, **Value** = secret, **Environment** = Production (and Preview if you want).
3. Add **NEXTAUTH_URL** after the first deploy (use the Vercel deployment URL), then redeploy so NextAuth uses it.

---

## Step 5: First deploy

1. Click **Deploy**.
2. Wait for the build to finish. If it fails, check the build logs (often a missing env or TypeScript error).
3. When done, Vercel shows a URL like `https://your-project-xxx.vercel.app`.

---

## Step 6: Set NEXTAUTH_URL and Google redirect

1. In Vercel: **Project** → **Settings** → **Environment Variables**.
2. Add or edit:
   - **NEXTAUTH_URL** = `https://your-project-xxx.vercel.app` (your actual deployment URL).
3. In Google Cloud Console, add this exact redirect URI:
   - `https://your-project-xxx.vercel.app/api/auth/callback/google`
4. **Redeploy**: **Deployments** → … on latest → **Redeploy**.

---

## Step 7: Cron jobs (optional)

The repo’s `vercel.json` defines crons. Schedules are set to **once per day** so they work on the **Hobby** plan (Vercel only allows daily crons on Hobby):

- Digest email: 8 AM UTC  
- Moltbook heartbeat: 9 AM UTC  
- Network cron (fast): 10 AM UTC  
- Network cron (heavy): 11 AM UTC  

On **Vercel Pro** you can change these to hourly or every 15 minutes in `vercel.json` if you want fresher data.

To protect cron routes, set **CRON_SECRET** in env and send it in the request (e.g. `Authorization: Bearer <CRON_SECRET>`); you’d then add that check in the cron route handlers.

---

## Step 8: Custom domain (optional)

1. **Project** → **Settings** → **Domains**.
2. Add your domain and follow DNS instructions (CNAME or A record).
3. After the domain is active, set **NEXTAUTH_URL** and Google redirect URI to the new domain (e.g. `https://nightly.yourdomain.com`) and redeploy.

---

## Step 9: Verify the deployment

1. Open your Vercel URL — you should see the **landing page**.
2. Click **Get Started** / **Sign in** — you should get the Google sign-in flow.
3. After sign-in, complete onboarding (sources, profile, etc.).
4. Check **Home** and **Decide Inbox**; create a pair and make sure data appears (Supabase or Turso is used when those env vars are set).

---

## Troubleshooting

| Issue | What to check |
|-------|----------------|
| **Redirect loop or auth error** | `NEXTAUTH_URL` matches the URL in the browser (no trailing slash). Google redirect URI exactly matches `{NEXTAUTH_URL}/api/auth/callback/google`. |
| **Data not persisting** | Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or `TURSO_*`) in Vercel and run the Supabase schema SQL once. Redeploy after adding env. |
| **Build fails** | Run `npm run build` locally; fix TypeScript or lint errors. Ensure all env vars used at build time (e.g. `NEXT_PUBLIC_*`) are set. |
| **500 on API routes** | Check **Functions** logs in Vercel dashboard; often missing env (e.g. Supabase/Turso or Auth). |

---

## Summary checklist

- [ ] Repo pushed to GitHub  
- [ ] Vercel project imported from GitHub  
- [ ] `AUTH_SECRET` set (random, 32+ chars)  
- [ ] `NEXTAUTH_URL` set to your Vercel URL (after first deploy)  
- [ ] `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` set  
- [ ] Google redirect URI = `https://YOUR_VERCEL_URL/api/auth/callback/google`  
- [ ] Database: either `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (and schema SQL run once) or `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`  
- [ ] Redeploy after setting `NEXTAUTH_URL`  
- [ ] Sign in and onboarding work; data persists  

After that, the app is deployed and usable in production.
