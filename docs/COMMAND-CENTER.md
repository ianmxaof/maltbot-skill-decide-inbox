# Command Center

Command Center is a unified dashboard for Society of Minds, Overnight Research, Skill Forge, and Agent Fleet. It appears as a tab in the dashboard (after Moltbook Hub, before Settings).

## Tabs

1. **Society of Minds** — Multi-model consensus (Claude, GPT, Gemini, Grok). Submit a task; models debate and a synthesis is returned. Use **Start Debate** or (optionally) the live stream endpoint for round-by-round updates.
2. **Overnight Research** — Queue a research task with deliverables and email; the engine runs phases (planning → data collection → analysis → synthesis → report → delivery) and can notify by email (and optionally Moltbook).
3. **Skill Forge** — View and manage accumulated skills (templates + learn-from-task). Skills are listed from `GET /api/skills`; new skills can be learned via `POST /api/skills`.
4. **Agent Fleet** — List and spawn agent instances (mock in-memory for dev; production should use a DB or external store). **Spawn New Instance** calls `POST /api/fleet`.

## API routes

- `POST /api/consensus` — Run consensus (body: `task`, optional `context`, `maxRounds`). Returns `result.consensus`, `result.agreement`, `result.recommendations`.
- `GET /api/consensus/stream?task=...` — Server-Sent Events stream of round-by-round consensus updates (optional `context`, `maxRounds`). Send a final `done` event with consensus and agreement.
- `POST /api/research` — Create research task (body: `title`, `notifyEmail`, optional `deliverables`, `deadlineHours`, `notifyMoltbook`). Starts task in background.
- `GET /api/research` — List research tasks with progress.
- `GET /api/skills` — List Skill Forge skills (query: `category`, `status`).
- `POST /api/skills` — Learn a new skill (body: `description`, `inputs`, `steps`, `output`).
- `POST /api/skills/[id]/execute` — Execute a skill (body: `inputs`).
- `GET /api/fleet` — List fleet instances.
- `POST /api/fleet` — Spawn a new instance (body: `provider`, optional `region`, `name`).

## Environment variables

- **Consensus (at least one required for Society of Minds):** `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GOOGLE_API_KEY`, `XAI_API_KEY`. Missing keys disable that model with a console warning; if none are set, consensus will fail.
- **Optional (voice, fleet, notifications):** `ELEVENLABS_API_KEY`, `TWILIO_*`, `DIGITALOCEAN_TOKEN`, `RESEND_API_KEY`, `NOTIFICATION_EMAIL`. See `.env.example`.

## Persistence and serverless

- **Fleet** — In-memory list for dev/demo. Production should use a database or external store.
- **Research tasks** — Optional file-based persistence in dev (`.research-tasks.json` in project root). In serverless, long overnight research may time out; prefer running research on a fleet VPS (spawn an agent to run overnight research).
- **Skills** — In-memory Skill Forge singleton; production may want persistent skill storage.

## Live consensus stream

To show round-by-round updates in the UI, use `EventSource` with `/api/consensus/stream?task=...`. On each `message`, parse `e.data` and update model status, agreement bar, and synthesis. When you receive an event with `type: 'done'`, display the final consensus and close the stream. Fall back to `POST /api/consensus` if SSE is not used.
