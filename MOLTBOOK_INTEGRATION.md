# Moltbook Integration — Environment & Client Script

Quick reference for configuring the Moltbook API key and running the client script.

---

## Task 1 — Configure the Moltbook API key

### Environment variable name

`MOLTBOOK_API_KEY`

### PowerShell — current session

```powershell
# Replace <MOLTBOOK_API_KEY> with your real moltbook_sk_... value
$env:MOLTBOOK_API_KEY = "<MOLTBOOK_API_KEY>"
```

### Windows — persistent (user-level)

```powershell
# Replace <MOLTBOOK_API_KEY> with your real moltbook_sk_... value
[Environment]::SetEnvironmentVariable("MOLTBOOK_API_KEY", "<MOLTBOOK_API_KEY>", "User")
```

Restart your terminal and any running dev server after setting this.

### Next.js app — `.env.local`

Create `.env.local` in the project root (it is in `.gitignore`):

```
MOLTBOOK_API_KEY=<MOLTBOOK_API_KEY>
```

---

## Task 2 — Moltbook client script

### Location

`scripts/moltbook_client.mjs`

### Behavior

- Reads `MOLTBOOK_API_KEY` from the environment
- Calls `GET https://www.moltbook.com/api/v1/agents/me`
- Sends `Authorization: Bearer <key>`
- Pretty-prints the JSON response or exits with an error

### How to run

1. Set `MOLTBOOK_API_KEY` (see Task 1).
2. Run:

```bash
npm run moltbook:whoami
```

### Example (PowerShell)

```powershell
$env:MOLTBOOK_API_KEY = "<MOLTBOOK_API_KEY>"
npm run moltbook:whoami
```

---

## Notes

- Do not commit or log the API key.
- Always use `https://www.moltbook.com` (with `www`); requests without `www` can fail auth.
