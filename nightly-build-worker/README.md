# Nightly Build Worker

Local agent worker daemon for The Nightly Build. Runs on any machine with Node.js + Ollama, feeds discoveries into your platform instance.

## Quick Start

```bash
# 1. Install Ollama (if not already)
curl -fsSL https://ollama.ai/install.sh | sh
ollama pull qwen2.5:7b

# 2. Set up worker
cd nightly-build-worker
cp worker.env.example .env

# 3. Edit .env:
#   PLATFORM_URL=http://localhost:3000   (or your deployed URL)
#   PAIR_ID=<your pair ID>               (from the Workers dashboard when empty)
#   WORKER_NAME=my-first-golem
#   WORKER_ASPECT=golem
#   OLLAMA_MODEL=qwen2.5:7b
#   RSS_FEEDS=https://hnrss.org/newest?points=50
#   KEYWORDS=ai agents,local models,ollama

# 4. Run
npm install
npm run dev
```

## Aspects

| Aspect | Role | Best For |
|--------|------|----------|
| **Golem** | Tireless laborer | RSS monitoring, broad scanning |
| **Prometheus** | Creative builder | Code repos, technical feeds |
| **Odin** | Strategic advisor | News, market intelligence |
| **Hermes** | Communicator | Social media, community signals |

## Model Recommendations

| Hardware | RAM | Model | Speed |
|----------|-----|-------|-------|
| Raspberry Pi 5 | 8GB | gemma:2b, tinyllama | ~2 tok/s |
| Old laptop | 8GB | qwen2.5:3b, llama3.2:3b | ~5 tok/s |
| Mac Mini M1 | 16GB | qwen2.5:7b, llama3.1:8b | ~20 tok/s |

Get your **pair ID** from the Workers dashboard (shown when no workers are connected). Use it as `PAIR_ID` in `.env`.
