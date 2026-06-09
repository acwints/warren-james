# ADR 0001: Kickoff Automation Boundaries

## Status

Accepted.

## Context

The case study asks for a prototype triggered when a creator moves to `Kickoff` in HubSpot and automates two to four meaningful downstream steps. The full operational workflow includes email, handoff docs, assignment tracking, calendar scheduling, Fathom parsing, Asana project creation, and Canva deck setup.

## Decision

This project implements four high-friction, high-signal steps:

1. executive kickoff email
2. Biz Dev handoff Google Doc
3. pod assignment Google Sheet row
4. Asana launch project

The application keeps business logic in `src/server/application`, integration contracts in `src/server/ports.ts`, and provider implementations in `src/server/integrations`. Mock adapters are the default runtime so the prototype can be evaluated without credentials. Live adapters are webhook-backed so real systems can be connected without changing the orchestration service.

The workflow record also stores review items, readiness signals, next actions, artifacts, and audit events. These are first-class product concepts because the strongest MVP is not only automation; it is a reliable handoff surface that makes the remaining human decisions visible.

Inbound source events are recorded separately from workflow runs and deduped by payload fingerprint. This keeps HubSpot retries from creating duplicate email/docs/sheet/Asana artifacts and gives operators an event trail to debug.

## Consequences

The prototype demonstrates real workflow compression without pretending to solve every dependency. Calendar scheduling, Fathom parsing, and Canva deck creation remain documented extension points after leadership assignment and launch-date confirmation are stable.
