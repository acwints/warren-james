# Warren James Launch Ops

Working prototype for the Head of Technology case study: when a creator moves to `Kickoff` in HubSpot, create the first launch package automatically.

## What This Automates

- Executive kickoff email from creator metadata.
- Biz Dev handoff doc from a repeatable structure.
- Pod assignment row in the team assignment sheet.
- Asana launch project seeded from the launch template.
- Human review queue for assignment, launch-date, assortment, and executive approval checkpoints.
- Integration health for HubSpot, email, Google Docs, Google Sheets, and Asana.

The app defaults to mock integrations so the workflow can be reviewed immediately. Set `INTEGRATION_MODE=live` and the provider credentials or worker webhook URLs in `.env.example` to connect real automation workers.
For live mode, HubSpot, email, and Asana have typed direct API clients. Google Docs and Sheets remain webhook-worker integrations because most teams delegate those to OAuth/service-account workers.

## Getting Started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the operator console.

## API Surface

- `POST /api/webhooks/hubspot`: receives HubSpot stage-change events and starts the kickoff flow when the stage value is `Kickoff`. If `HUBSPOT_WEBHOOK_SECRET` is configured, the route validates HubSpot v3 timestamped request signatures and preserves legacy body signature support for migration windows.
- `POST /api/demo/run`: runs a dry-run kickoff package for the selected fixture creator.
- `GET /api/dashboard`: returns metrics, workflow runs, review queue, and integration health.
- `GET /api/events`: returns received source events and idempotency status.
- `GET /api/integrations`: returns provider readiness.
- `GET /api/runs`: returns in-memory workflow run history.
- `GET /api/runs/:id`: returns a single run.
- `POST /api/runs/:id/retry`: retries a run with attempt lineage.
- `PATCH /api/runs/:id/review`: approves or blocks a human review item.

## Project Structure

- `src/domain`: creator and workflow contracts.
- `src/server/application`: orchestration and HubSpot payload handling.
- `src/server/integrations`: mock and live provider adapters.
- `src/server/repositories`: prototype run persistence.
- `src/components`: operator console UI.
- `docs/adr`: architecture decisions.
- `docs/data-architecture.md`: data model, API, and persistence notes.
- `docs/schema.sql`: production database schema sketch.
- `tests`: orchestration, idempotency, integration health, mapping, and signature tests.

## Verification

```bash
npm run lint
npm run typecheck
npm run test
npm run build
```

See `docs/case-study.md` for the product rationale and `docs/adr/0001-kickoff-automation-boundaries.md` for the architecture boundary.
