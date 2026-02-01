# Full-Scope OpenClaw Settings — Roadmap

The Maltbot dashboard currently exposes a subset of OpenClaw configuration. This doc maps what OpenClaw CLI offers vs what the dashboard has, for future expansion.

## Current Dashboard Coverage

| Area | Dashboard | OpenClaw CLI |
|------|-----------|--------------|
| API keys | ✅ ApiKeysPanel (ANTHROPIC, OPENAI, OPENROUTER, GROQ, ZAI, BRAVE, TELEGRAM) | `openclaw onboard`, `~/.openclaw/.env` |
| Default model | ✅ ModelPanel (primary model, fallbacks) | `openclaw models set`, `agents.defaults.model` |
| Gateway lifecycle | ✅ Start, Restart | `openclaw gateway start/restart` |

## OpenClaw CLI Options Not Yet in Dashboard

### From `openclaw onboard` / `openclaw configure`

- **Auth choices**: OAuth vs API key per provider (Anthropic setup-token, OpenAI Codex, Zai API key, etc.)
- **Channels**: Telegram, WhatsApp, Discord, Slack, etc. (tokens, webhook URLs)
- **Agent config**: Multiple agents, per-agent model/workspace
- **Hooks**: boot-md, command-logger, session-memory, custom hooks
- **Gateway**: port, lock file, discovery (Bonjour, Tailscale)
- **Web search**: BRAVE_API_KEY, search provider
- **Model failover**: fallback order, cooldown rules
- **System prompt / SOUL**: agent identity, system instructions

### From `openclaw config` / `openclaw models`

- **Model aliases**: custom names for models
- **Model params**: temperature, max_tokens, cache TTL per model
- **Auth profiles**: multiple profiles per provider (e.g. anthropic:work, anthropic:personal)

### From `openclaw agents`

- **Add/remove agents**: create agents beyond "main"
- **Per-agent config**: workspace, model, auth routing

### From `openclaw channels`

- **Channel list**: see configured channels
- **Channel enable/disable**: toggle Telegram, etc.

### From `openclaw gateway`

- **Port**: OPENCLAW_GATEWAY_PORT
- **Lock**: gateway lock file path
- **Discovery**: Bonjour, Tailscale config

### From `openclaw doctor` / `openclaw status`

- **Health check**: gateway reachable, auth status
- **Models status**: `openclaw models status --json` (auth probes, unusable profiles)

## Implementation Approach

1. **Phase 1** (current): API keys, default model, Gateway start/restart.
2. **Phase 2**: Add Channels panel (Telegram token, etc.), Hooks list, Model failover.
3. **Phase 3**: Add Agents panel (multi-agent), per-agent model/workspace.
4. **Phase 4**: Full config editor (read/write openclaw.json with validation).

## References

- [OpenClaw onboarding](https://docs.clawd.bot/cli/onboard)
- [OpenClaw configure](https://docs.clawd.bot/cli/configure)
- [Gateway configuration](https://docs.clawd.bot/gateway/configuration)
