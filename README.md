[README.md](https://github.com/user-attachments/files/32812385/README.md)
# J.A.R.V.I.S.
### Journaled Autonomic Root-Cause & Vector Incident Solver

> An SRE incident-response agent that remembers every outage you've ever had. When a new alert fires, J.A.R.V.I.S. recalls similar past post-mortems from **Vectorize Hindsight** memory, synthesizes a root-cause diagnosis and mitigation runbook with **Google Gemini**, and walks operators through resolution from a live command-center dashboard.

---

## Table of Contents

- [Overview](#overview)
- [How It Works](#how-it-works)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Loading Post-Mortems into Hindsight](#loading-post-mortems-into-hindsight)
- [Sending Alerts](#sending-alerts)
- [API Reference](#api-reference)
- [Seed Data](#seed-data)
- [Graceful Degradation](#graceful-degradation)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)

---

## Overview

On-call engineers lose the most time at the start of an incident, figuring out whether they've seen this failure before. J.A.R.V.I.S. turns your past post-mortems into searchable long-term memory and uses it to triage new alerts in seconds.

Given an alert, it returns:

- a **triaged root cause** with a confidence score
- the **historical incidents** that informed the diagnosis
- an **immediate mitigation** action
- a step-by-step **runbook** with commands and per-step risk levels
- a **blast-radius assessment** (impact level, affected services, estimated MTTR, customer impact)
- a **prevention plan** to stop it from recurring

---

## How It Works

```
 Monitoring alert                        ┌──────────────────────────┐
 (Prometheus, curl, etc.)                │  data/post_mortems.json  │
        │                                └────────────┬─────────────┘
        ▼                                             │  ingest.py / POST /api/v1/ingest
 POST /api/v1/alert                                   ▼
        │                                ┌──────────────────────────┐
        ├──────────── recall ───────────▶│   Vectorize Hindsight    │
        │                                │      (memory bank)       │
        │                                └──────────────────────────┘
        ├── local keyword matcher (guaranteed fallback)
        │
        ▼
 Gemini synthesis (JSON output) ──▶ deterministic expert engine if unavailable
        │
        ▼
 Incident record ──▶ React command-center dashboard
   (root cause · runbook · blast radius · timeline)
```

1. **Recall.** The alert's service, message, and stack trace are sent as a query to the Hindsight memory bank.
2. **Local match.** In parallel, a keyword/service scorer searches `data/post_mortems.json` so the agent always has context, even offline.
3. **Synthesize.** Recalled memories and matches are passed to Gemini, which returns a structured JSON mitigation plan. If Gemini is missing, slow, or returns something malformed, a built-in deterministic engine produces the plan instead.
4. **Track.** The incident is stored in memory with a status timeline (`TRIAGED → MITIGATING → RESOLVED`) as runbook steps are executed.

---

## Features

- **Memory-backed triage.** Root-cause diagnosis grounded in your own historical post-mortems.
- **Structured runbooks.** Ordered steps with descriptions, commands, and `LOW` / `MEDIUM` / `HIGH` risk levels.
- **Blast-radius assessment.** Impact level, affected services, estimated MTTR, and customer impact.
- **Incident lifecycle timeline.** Automatic and manual status transitions with source attribution (`SYSTEM`, `RUNBOOK`, `OPERATOR`).
- **Four-tab dashboard:**
  - **Command** – the active incident, runbook execution, and timeline
  - **Memory** – Hindsight bank status and an interactive recall tester
  - **Post-Mortems** – browse and add entries to the knowledge base
  - **Webhook** – integration snippets for wiring in your alerting
- **Add post-mortems from the UI.** New entries are saved locally and retained in Hindsight.
- **Works with or without API keys.** Every external dependency has a fallback.

---

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, Vite, Tailwind CSS 4, Motion, Lucide |
| Backend | Node.js, Express, TypeScript (run with `tsx`) |
| Memory | [Vectorize Hindsight](https://vectorize.io) |
| LLM synthesis | Google Gemini (`@google/genai`) |
| Tooling | Python 3 scripts for ingestion and alert testing |

---

## Project Structure

```
.
├── server.ts              # Express API, Hindsight client, Gemini synthesis, Vite mount
├── src/
│   ├── App.tsx            # Dashboard UI (Command / Memory / Post-Mortems / Webhook)
│   ├── main.tsx
│   └── index.css
├── data/
│   └── post_mortems.json  # Seed knowledge base (6 incidents)
├── ingest.py              # CLI: create Hindsight bank and load post-mortems
├── test_alert.py          # CLI: fire sample alerts at a running server
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
├── requirements.txt
└── .env.example
```

---

## Getting Started

### Prerequisites

- Node.js 20+
- Python 3.9+ (only for `ingest.py` and `test_alert.py`)
- Optional: a [Hindsight](https://vectorize.io) API key and a [Gemini](https://aistudio.google.com/apikey) API key

### Install and run

```bash
# 1. Clone
git clone https://github.com/<your-username>/J.A.R.V.I.S.-Journaled-Autonomic-Root-Cause-Vector-Incident-Solver-.git
cd J.A.R.V.I.S.-Journaled-Autonomic-Root-Cause-Vector-Incident-Solver-

# 2. Install Node dependencies
npm install

# 3. Configure environment
cp .env.example .env
# then edit .env with your keys

# 4. Start the server (serves the API and the dashboard)
npm run dev
```

Open **http://localhost:3000**.

### Production build

```bash
npm run build                 # builds the frontend to dist/
NODE_ENV=production npm start # serves dist/ and the API
```

---

## Configuration

Copy `.env.example` to `.env`:

| Variable | Description | Default |
| --- | --- | --- |
| `GEMINI_API_KEY` | Enables LLM synthesis of mitigation plans. | *(empty, uses fallback engine)* |
| `HINDSIGHT_API_KEY` | Hindsight API key. Required for memory recall and retention. | *(empty, uses local matching)* |
| `HINDSIGHT_API_URL` | Hindsight base URL. | `https://api.hindsight.vectorize.io` |
| `HINDSIGHT_BANK_ID` | Memory bank to read from and write to. | `incident-response-agent` |
| `PORT` | Server port. | `3000` |

`.env` files are git-ignored; only `.env.example` is committed.

---

## Loading Post-Mortems into Hindsight

Install the small set of Python dependencies and run the ingestion script:

```bash
pip install requests python-dotenv
python ingest.py
```

This creates the memory bank (idempotent `PUT`) and retains each incident from `data/post_mortems.json`, including its symptom, root cause, resolution steps, and recommended runbook.

You can also trigger ingestion from a running server:

```bash
curl -X POST http://localhost:3000/api/v1/ingest
```

---

## Sending Alerts

### Sample alerts

With the server running:

```bash
pip install requests
python test_alert.py
```

This checks `/health`, then fires three alerts (HikariCP pool exhaustion, Redis session OOM, and CoreDNS stale cache) and prints the generated response plan for each.

### From your own monitoring

```bash
curl -X POST http://localhost:3000/api/v1/alert \
  -H "Content-Type: application/json" \
  -d '{
    "service": "payment-gateway-v2",
    "severity": "P1-CRITICAL",
    "alert_message": "504 Gateway Timeout detected on checkout endpoint",
    "stack_trace": "HikariPool-1 - Connection is not available, request timed out after 30000ms."
  }'
```

`service` and `alert_message` are required; `severity` (default `P1-CRITICAL`) and `stack_trace` are optional.

The response is a full incident record containing the root cause, confidence score, recalled memories, runbook, blast-radius assessment, prevention plan, and initial timeline.

---

## API Reference

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Service health, Hindsight connectivity, and whether Gemini is enabled. |
| `POST` | `/api/v1/alert` | Submit an alert and receive a triaged incident with a mitigation plan. |
| `GET` | `/api/v1/incidents` | List recent incidents (in-memory, latest first, capped at 50). |
| `POST` | `/api/v1/incidents/status` | Manually set an incident's status (`TRIAGED`, `MITIGATING`, `RESOLVED`). |
| `POST` | `/api/v1/runbook/execute-step` | Execute a runbook step and update the incident timeline. See [limitations](#known-limitations). |
| `GET` | `/api/v1/post-mortems` | List the post-mortem knowledge base. |
| `POST` | `/api/v1/post-mortems` | Add a post-mortem; saved locally and retained in Hindsight. |
| `POST` | `/api/v1/ingest` | Ensure the Hindsight bank exists and retain all local post-mortems. |
| `GET` | `/api/v1/hindsight/status` | Memory bank stats and configuration. |
| `POST` | `/api/v1/hindsight/recall` | Run an ad-hoc recall query against the bank. |

---

## Seed Data

`data/post_mortems.json` ships with six realistic incidents:

| Incident | Service | Severity | Failure |
| --- | --- | --- | --- |
| `INC-2024-0819-HIKARI` | payment-gateway-v2 | P1-CRITICAL | HikariCP connection pool exhaustion |
| `INC-2024-0902-REDIS` | auth-service | P2-HIGH | Redis sessions without TTL causing OOMKills |
| `INC-2024-1014-COREDNS` | notification-dispatcher | P1-CRITICAL | CoreDNS stale cache breaking SES connectivity |
| `INC-2024-1108-KAFKA` | order-fulfillment-engine | P1-CRITICAL | Kafka-related failure |
| `INC-2024-1122-PG-LOCK` | inventory-mgmt-api | P2-HIGH | PostgreSQL lock contention |
| `INC-2024-1215-INGRESS` | api-gateway-edge | P1-CRITICAL | Ingress failure |

Each entry follows this schema:

```json
{
  "incident_id": "INC-2024-0819-HIKARI",
  "service": "payment-gateway-v2",
  "severity": "P1-CRITICAL",
  "symptom": "504 Gateway Timeout detected on checkout endpoint under traffic surge",
  "root_cause": "HikariPool-1 connection pool exhaustion...",
  "resolution_steps": ["...", "..."],
  "effective_runbook": "RB-PAY-042: HikariCP Connection Pool Exhaustion & Idle Connection Purge"
}
```

Replace or extend this file with your own post-mortems to make the agent specific to your infrastructure.

---

## Graceful Degradation

J.A.R.V.I.S. is designed to keep producing useful output when dependencies are missing:

| Missing / failing | Behavior |
| --- | --- |
| `HINDSIGHT_API_KEY` | Hindsight recall is skipped; the local keyword matcher over `post_mortems.json` supplies context. |
| `GEMINI_API_KEY` | The deterministic expert engine generates the mitigation plan. |
| Gemini timeout (2.5s) or invalid JSON | Falls back to the deterministic expert engine. |

---

## Known Limitations

- **Runbook execution is simulated.** `POST /api/v1/runbook/execute-step` returns realistic, pattern-matched terminal output and marks the step complete, but it does **not** run commands against any real cluster or database. Wire it to a real executor (with approvals) before using it in production.
- **In-memory incident store.** Incidents live in process memory and reset on restart. Post-mortems persist to `data/post_mortems.json`.
- **No authentication.** The API is open. Put it behind an auth layer before exposing it beyond localhost.
- **Seeded demo incident.** The server starts with one pre-loaded incident (`INC-2026-LIVE-8821`) so the dashboard isn't empty.
- **Unused config.** `OPENAI_API_KEY` appears in `.env.example` and `openai`, `fastapi`, and `uvicorn` appear in `requirements.txt`, but the current code does not use them.

---

## Roadmap

- [ ] Real command execution with approval gates and audit logging
- [ ] Persistent incident storage
- [ ] Auto-retain resolved incidents as new post-mortems (closing the learning loop)
- [ ] Native integrations for PagerDuty, Opsgenie, and Alertmanager
- [ ] Authentication and role-based access control

---

## Contributing

Issues and pull requests are welcome. For larger changes, please open an issue first to discuss what you'd like to change.


