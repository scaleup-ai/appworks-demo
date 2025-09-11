# Receivables Autopilot — Implementation-friendly I/P/O Spec

This document is a compact, engineer-friendly Input / Process / Output (I/P/O) specification for the Receivables Autopilot. It is intentionally pragmatic and tuned to integrate with the existing codebase (notably `src/service/xero.service.ts`, `src/repository/core-data.repo.ts`, `src/modules/db-connection.module.ts` and `sql/create-schema.sql`). Use this as the reference for wiring agents into the system.

Summary

- Goal: reduce DSO, improve cash flow, and automate collections while preserving customer relationships.
- Principle: keep the source-of-truth read-only where possible (Xero via `xero-node`), persist only what we need (tokens, small sync state, idempotency mappings, events).

Agents & Components (I / P / O)

Note: entries labelled "Agent" are intended as autonomous or scheduled processes; entries labelled as components are implementation modules or libraries. Both map to code under `src/core/agents`, `src/service`, or `src/modules` depending on scope.

1. Data Integration Agent (Xero API Reader)

- Input:
  - Xero Accounting API: invoices, contacts, payments, credit notes, tracking categories
  - Xero bank feed / unreconciled transactions
  - Optional: webhooks or polling cadence
- Process/Function:
  - Poll or subscribe to Xero changes, normalize records to canonical AR shape (invoiceId, customerId, dueDate, amount, status, lines, projectCode, tags), deduplicate by invoice number + tenant.
  - Attempt lightweight candidate matching between unreconciled bank lines and unpaid invoices (amount + date fuzzy match, reference tokens).
  - Emit normalized events/records to the internal message bus or update the local AR datastore.
- Output:
  - Clean, incremental AR datastore and event stream: invoices, customers, payment candidates, reconciliation hints.

Notes / Implementation:

- Use `XeroService` (`src/service/xero.service.ts`) as the integration layer. Persist Xero tokens (see Security section). Keep Xero reads read-only by default.
- Store minimal persistent outputs in `core_events` (event sourcing) and `core_idempotency` (idempotency mapping). Schema: `sql/create-schema.sql`.

2. Collections Reminder Agent (Invoice Monitoring)

- Input:
  - AR datastore + invoice event stream (from Data Integration Agent)
  - Reminder history (local datastore) and customer risk profile
- Process/Function:
  - Maintain a state machine per invoice: {scheduled_pre_due, due, overdue_stage_1, overdue_stage_n, escalated}
  - Schedule triggers (pre-due reminders, due-day, post-due cadence) and generate a send payload that includes invoice link, amount, payment instructions, and reconciliation metadata.
  - Call Email Copywriter Agent for message body, then route send payload to the delivery infrastructure.
  - Record outcome events (sent, delivered, bounced, clicked, payment matched).
- Output:
  - Reminder events, send payloads, updated per-invoice reminder history and state.

Notes / Implementation:

- Idempotency: before sending, check `core_idempotency` for duplicate sends or use a dedicated idempotency key. The DB-backed upsert in `core_idempotency` (see `core-data.repo.ts`) is used for durable idempotency.
- Store reminder attempt events in `core_events` for replay/diagnostics.

3. Email Copywriter Agent (Polite/Firm Communications)

- Input:
  - Reminder context (tone, stage), customer preferences/history, invoice fields
- Process/Function:
  - Generate a subject and body that follow the guardrails (professional, respectful, and firm when appropriate).
  - Provide merge fields and recommended attachments (invoice PDF, payment link).
  - Optionally produce alternate variations for A/B testing.
- Output:
  - Structured email object: {subject, bodyHtml, bodyText, attachments?, mergeFields}

Notes / Implementation:

- This agent is primarily stateless and can be implemented using templates or an LLM provider (through `LLMProviderManager`). Ensure outputs are sanitized and reviewed before automated rollout.

Implementation mapping (suggested):

- Data Integration: implement under `src/service/xero.service.ts` (Xero reads) and persist normalized events via `src/repository/core-data.repo.ts`.
- Collections Reminder: orchestration/state-machine can live under `src/core/orchestration/` or as an agent in `src/core/agents/`; reminder history and sends persist to `core_events` via `src/repository/core-data.repo.ts`.
- Email Copywriter: implement as a stateless module using the LLM provider layer (e.g., `LLMProviderManager` / `src/modules/llm/`) and expose a simple interface for templates/variants.
- Payment Reconciliation: implement reconciliation logic in a service/module that consumes Xero and bank feeds and persists matches/suggestions to `core_events` (store implementation in `src/service` or `src/core/agents/` depending on runtime model).

4. Payment Reconciliation Agent (Cash Application)

- Input:
  - Xero payment records, bank feed entries, invoice ledger
  - Remittance information when provided
- Process/Function:
  - Attempt auto-matching by invoice reference, amount, and date.
  - Handle partial allocations and lump-sum payments (split suggestions returned as allocation proposals).
  - If no match is confident, create an unmatched-payment case and route to Collections for follow-up.
- Output:
  - Matched payments applied to invoices (update events), allocation suggestions, and unmatched-payment cases with next actions.

Notes / Implementation:

- Actions that update Xero should be isolated and human-approved initially. For internal state, persist application results and suggestions to `core_events` for traceability.

Project Profitability (subsystem — I/P/O)

1. Project Data Integration — Project Ledger Ingest

- Input: Xero invoices, credit notes, bills, payments with project tracking metadata
- Process: Normalize and maintain an incremental Project Ledger keyed by project code; compute revenue-to-date and costs-to-date.
- Output: Project Ledger records for reporting and cost/revenue computations.

2. Manual Time Entry — Hours Capture & Validation

- Input: UI-entered time entries
- Process: Validate, dedupe, tag with project codes, store audit trail
- Output: Time Journal used by cost engine

3. Cost & Rate Engine — Labor Costing + Direct Cost Rollup

- Input: Time Journal, role cost table, Xero bills/expenses
- Process: Compute labor costs, roll up direct costs per project, optional overhead
- Output: Project Cost Ledger

4. Revenue & Billing Alignment

- Input: Project Ledger, Time Journal, Cost Ledger
- Process: Compute invoiced revenue-to-date, flag unbilled time
- Output: Revenue-to-Date, Unbilled Time Rollup

5. Profitability Reporting

- Input: Aggregated outputs from above components
- Process: Calculate KPIs, generate dashboards & weekly digests
- Output: Dashboards, weekly reports, CSV exports

Cash Flow Management (I/P/O)

1. Treasury Data Integration

- Input: Bank feeds, Xero (unpaid invoices/bills), recurring obligations
- Process: Normalize inflow/outflow categories, tag cash flows
- Output: Unified cash ledger (real-time balances)

2. Pattern & Seasonality

- Input: Historical cash ledger
- Process: Detect recurring cycles and seasonality
- Output: Baseline patterns and confidence intervals

3. Short-Term Direct Forecast (13-week)

- Input: Open AR/AP, bank/loan data, pattern curves, collection likelihoods
- Process: Rolling 13-week forecast with probabilistic collection models
- Output: Projected balances, breach alerts

4. Scenario Builder & Stress Test

- Input: Forecasts and business levers
- Process: Run what-if scenarios and stress tests
- Output: Scenario comparisons and playbooks

5. Cash Communication & Forecast Reporting

- Input: Forecasts & scenarios
- Process: Convert to stakeholder memos and dashboards
- Output: One-page memos, dashboards, lender packs

Security, Persistence and Operational Guidance

- Persist only what you must:

  - Always persist the Xero tokenset (refresh_token is mandatory — it rotates on refresh).
  - Persist tenant_id(s) so API calls can target the right org.
  - Persist idempotency keys and event records (`core_events`, `core_idempotency`) for audit and replay.
  - Avoid persisting full external records unless required for performance or offline analysis.

- Table references (created by `sql/create-schema.sql`):

  - `core_events` — event store for durable events
  - `core_idempotency` — durable idempotency mapping
  - `xero_tokens` — minimal token store: { client_id, tenant_id, refresh_token, access_token?, expires_at?, scopes? }

- Concurrency & refresh token rotation:

  - Implement an upsert-and-read pattern when refreshing tokens. Prefer DB-level upserts or advisory locks to avoid multi-instance race conditions.

- Secrets & access control:

  - Treat refresh tokens as secrets. Prefer encrypt-at-rest or a secrets manager (Vault, AWS Secrets Manager) if available.

Integration Notes (where to wire in code)

- Xero integration: `src/service/xero.service.ts` — wire `exchangeCodeForToken()` and `refreshToken()` to persist tokenSet into `xero_tokens` via a small `XeroTokenRepository`.
- Idempotency: `src/repository/core-data.repo.ts` already attempts upserts into `core_idempotency` and falls back to event-store mapping — keep this behavior.
- DB init & schema: `src/modules/db-connection.module.ts` now applies `sql/create-schema.sql` during `initialize()` so startup is idempotent when `USE_PERSISTENT_CORE_DATA=true`.

Operational checklist (short-term roadmap)

- [ ] Implement `XeroTokenRepository` with `upsertToken(clientId, tenantId, tokenSet)` and `getToken(clientId, tenantId)`.
- [ ] Wire token persistence into `XeroService.exchangeCodeForToken()` and `XeroService.refreshToken()`.
- [ ] Add small process-level mutex or DB advisory lock around token refresh to avoid race conditions in multi-instance deployments.
- [ ] Add light reconciliation UI to review unmatched payments and escalate to Collections/Escalation agents.
- [ ] Create a migration runner (or adopt a migration tool) to manage future schema changes using `schema_migrations` table.

If you want, I can implement the minimal `XeroTokenRepository` and wire it into `src/service/xero.service.ts` next (persist refresh_token + tenantId + timestamps).

---

## Implementation additions (auto-generated summary)

This section was appended by the implementation automation to summarise repository-level changes, files added, runtime notes, and recommended next steps. Nothing above was overwritten.

Summary of files added/edited

- Controllers and routes (HTTP APIs):

  - `src/controllers/xero-token.controller.ts` — POST/GET handlers to persist and fetch Xero tokens.
  - `src/routes/xero-token.routes.ts` — route registrations for token APIs.
  - `src/controllers/email-copywriter.controller.ts` and `src/routes/email-copywriter.routes.ts` — generate email drafts via `EmailCopywriter` agent.
  - `src/controllers/collections-reminder.controller.ts` and `src/routes/collections-reminder.routes.ts` — start/stop/scan/list endpoints for collections reminder.
  - `src/controllers/payment-reconciliation.controller.ts` and `src/routes/payment-reconciliation.routes.ts` — reconcile payment endpoint.

- Services and repos:

  - `src/repository/payment-reconciliation.repo.ts` — persists `PAYMENT.MATCHED` and `PAYMENT.UNMATCHED` events via `CoreDataRepository`.
  - `src/service/payment-reconciliation.service.ts` — minimal heuristic reconciliation (reference match → exact amount fallback).
  - `src/service/accounts-receivables/ar-collections-reminder.service.ts` — added public `triggerScan()` method (no behavioural overwrite; existing logic preserved).

- Agent changes:

  - `src/agents/email-copywriter.agent.ts` — already present; updated to call the typed `ILLMProvider.generate()` instead of an any-cast and supports `opts.senderName` signoff.

- Demo documentation:

  - `src/routes/demo.routes.ts` — expanded the served OpenAPI YAML to include the new Receivables Autopilot endpoints so external tools or frontends can fetch the API spec at the demo endpoint.

How to run locally (quick)

1. Set environment and start the app (Windows / cmd):

```cmd
set NODE_ENV=development
npm run dev
```

2. Recommended env vars for persistent core data and CORS (optional):

- `USE_PERSISTENT_CORE_DATA=true` — enables DB-backed `core_events` and `core_idempotency` behavior.
- `CORS_ORIGIN` — configure allowed origins for frontend access.

Quick smoke API calls (examples)

- Persist Xero token:
  - POST /api/xero/token
  - Body: { clientId, tenantId, tokenSet: { refresh_token, access_token?, expires_at?, scope? } }
- Generate email draft:
  - POST /api/email/draft
  - Body: { invoiceId, amount?, dueDate?, stage?, customerName? }
- Trigger collections scan (one-off): POST /api/collections/scan
- Reconcile a payment: POST /api/payments/reconcile { paymentId, amount, reference? }

Runtime caveats & notes

- Email drafts require a registered LLM provider (prefers `OLLAMA`) at runtime; if not available the draft endpoint may throw.
- New routes are demo / helper endpoints. They currently do not enforce authentication or RBAC — secure them before public use.
- The reconciliation service is intentionally minimal (heuristic match) and records events for human review; it does not auto-apply changes to Xero.
- Durable DLQ and hardened retry around `coreRepo.saveEvent()` were not implemented; persistent production hardening remains TODO.

Next recommended steps (short list)

1. Add authentication (JWT or session) and protect the new API routes.
2. Expand the OpenAPI document (`components/schemas`) and expose a JSON OpenAPI endpoint for client SDK generation.
3. Register an Ollama provider in dev or implement a safe template fallback to avoid runtime failures for `POST /api/email/draft`.
4. Wire `XeroService.exchangeCodeForToken()` and `XeroService.refreshToken()` to `xero-token.repo` if you want automatic token persistence.
5. Add small frontend client helpers (TypeScript) generated from the OpenAPI doc for React consumption.

If you want, I can implement any of the next steps directly — say which one and I will proceed.

## Implementation status (practical delta)

- [x] Collections Reminder orchestration scaffolding implemented and auto-started
  - File: `src/core/orchestration/collections-reminder.service.ts`
  - Behaviour: polls `core_events` for `XERO.INVOICE`, dedupes via `core_idempotency` helpers, emits `REMINDER.SCHEDULED` events.
  - Auto-start: wired into `src/index.ts` during bootstrap.

## Concrete next steps (implement-first list)

1. Implement `XeroTokenRepository` and wire it to `XeroService.exchangeCodeForToken()` and `XeroService.refreshToken()`

   - Persist `refresh_token`, `expires_at`, `scopes`, and `tenant_id`.
   - Use DB advisory lock or `INSERT ... ON CONFLICT` to avoid refresh races.
   - File: `src/repository/xero-token.repo.ts` (add or extend existing implementation).

2. Harden webhook persistence and DLQ

   - Around `coreRepo.saveEvent()` add retry with exponential backoff and a durable DLQ table (`core_event_dlq`) when persistent failures occur.
   - Emit diagnostic events to `core_events` for monitoring.

3. Implement Email Copywriter adapter

   - Create `src/core/agents/email-copywriter.agent.ts` that calls `LLMProviderManager` or templating engine.
   - Ensure outputs are sanitized and provide minimal test harness.

4. Expand Collections Reminder state machine

   - Move from single-stage PRE_DUE scheduling to proper state progression and configurable cadence.
   - Store reminder history in `core_events` and reflect current state by reading the event stream for the invoice.

5. Add unit + integration tests

   - Tests for `collections-reminder.service.scanOnce()` and idempotency mapping.
   - Tests for `xero-token.repo` upsert behaviour (advisory lock / concurrency).

## Small contracts (inputs/outputs)

- CollectionsReminderService.scanOnce(repo)

  - Input: `repo: ICoreDataRepository` with methods: `getEvents(sessionId?, eventType?)`, `saveEvent({ session_id, event_type, payload })`, optional `mapIdempotencyKeyToInstance`, `getInstanceIdByIdempotencyKey`.
  - Output: persists `REMINDER.SCHEDULED` events for eligible invoices. Error mode: log and continue.

- XeroTokenRepository

  - upsertToken(clientId: string, tenantId: string, tokenSet: { refresh_token: string; access_token?: string; expires_at?: string; scopes?: string[] }): Promise `<void>`
  - getToken(clientId: string, tenantId: string): Promise<{ refresh_token: string; access_token?: string; expires_at?: string; scopes?: string[] } | undefined>

- EmailCopywriter

  - input: { stage: string; invoice: Record<string, unknown>; customer: Record<string, unknown>; tone?: 'polite'|'firm' }
  - output: { subject: string; bodyHtml: string; bodyText: string; mergeFields?: Record<string, string> }

## Edge cases & operational notes

- Duplicate deliveries: always derive an explicit idempotency key (prefer external event id when provided). Use `core_idempotency` to dedupe before any side-effect (sending email, updating Xero).
- Partial payments & splits: reconciliation agent should record allocation suggestions, not auto-apply until human approved.
- Secret handling: refresh tokens are secrets — prefer envelope encryption or a secrets manager for production.

## How to run & verify locally (quick)

1. Start the app (Windows/cmd example):

```powershell
set NODE_ENV=development
npm run dev
```

2. Confirm Collections Reminder started by checking logs for:

- "CollectionsReminderService.started"
- "CollectionsReminderService.reminder.scheduled"

3. To test end-to-end: emit a `XERO.INVOICE` event into the event store (via repo or test helper) and confirm a `REMINDER.SCHEDULED` event is persisted.

## Completion summary

I added a small, idempotent Collections Reminder orchestration and wired it to auto-start on bootstrap; the doc above is now extended with explicit tasks, contracts, and next steps so I can continue implementing the remaining items without asking for choices. If you want, I'll implement the `XeroTokenRepository` next and wire token persistence into `src/service/xero.service.ts` immediately.
