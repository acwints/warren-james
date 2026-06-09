# Data Architecture

## Core Entities

- `CreatorProfile`: normalized creator data from HubSpot plus launch inputs used by downstream systems.
- `WorkflowRun`: the durable kickoff execution record. It owns step status, artifacts, audit events, review items, readiness signals, and next actions.
- `WorkflowArtifact`: the generated side-effect handle for email, Google Docs, Google Sheets, and Asana.
- `ReviewItem`: human-in-the-loop tasks that automation should surface but not silently approve.
- `IntegrationHealth`: runtime readiness for each provider surface.
- `SourceEvent`: inbound webhook or manual trigger record with idempotency fingerprint and processing status.

## Boundaries

The app uses ports in `src/server/ports.ts` so the workflow never imports vendor SDKs directly. Provider implementations live under `src/server/integrations`:

- `mock.ts`: deterministic demo adapters for local review and tests.
- `live.ts`: live adapters that prefer direct API clients where practical and fall back to webhook-backed workers.
- `hubspot-client.ts`: hydrates creator metadata from HubSpot CRM object properties when `HUBSPOT_PRIVATE_APP_TOKEN` is configured.
- `resend-client.ts`: sends executive email through Resend when email env is configured.
- `asana-client.ts`: instantiates the launch project from the Asana project template when Asana env is configured.

This keeps the case-study workflow productized without binding the prototype to credentials that may not exist in the reviewer environment.

Google Docs and Sheets are intentionally worker-backed because native Docs/Sheets writes usually require OAuth/service-account setup, Drive permissions, and template-specific formatting logic. The core app sends typed payloads to those workers and records the returned artifacts.

## Persistence Path

Current local persistence is an in-memory repository in `src/server/repositories/run-store.ts`. The repository shape is intentionally close to a database table design:

- `workflow_runs`
- `workflow_steps`
- `workflow_artifacts`
- `workflow_review_items`
- `workflow_audit_events`
- `source_events`
- `integration_checks`

For production, replace the repository implementation with Postgres/Neon or another relational store while keeping the application service contract stable.
See `docs/schema.sql` for the table layout and indexes that match the current repository contract.

## API Contracts

- `POST /api/webhooks/hubspot`: validates the HubSpot event and starts a run only for Kickoff transitions.
- `POST /api/demo/run`: starts a dry-run package from fixture creator data.
- `GET /api/dashboard`: returns metrics, runs, review queue, and integration health for the command center.
- `GET /api/events`: returns source events and duplicate/processed/ignored status.
- `GET /api/integrations`: returns provider readiness.
- `GET /api/runs`: returns run summaries and metrics.
- `GET /api/runs/:id`: returns a run.
- `POST /api/runs/:id/retry`: retries a run from its creator snapshot and records retry lineage.
- `PATCH /api/runs/:id/review`: updates a human review item status.

## Idempotency

HubSpot webhook requests are fingerprinted with a SHA-256 hash of the raw request body. If a matching event is already known, the webhook returns the existing related run instead of creating duplicate downstream artifacts. The original event keeps its processing status and increments `duplicateDeliveries`, which is visible in the command center's Events tab.

When `HUBSPOT_WEBHOOK_SECRET` is configured, webhook intake verifies HubSpot's v3 signature shape: timestamp freshness, HTTP method, decoded request URI, raw request body, and base64 HMAC. The verifier also accepts older body signatures so a production rollout can support a migration window without weakening unsigned local demo mode.

## Human Review Rules

Automation creates operational artifacts, but it does not silently approve:

- pod owner assignment
- donation mechanics
- assortment approval
- final launch date
- external-facing deck or calendar details

Those become review items, readiness signals, or next actions.
