# Receivables Autopilot — Implementation-ready I/P/O Spec (Updated)

This document replaces the older spec and focuses on what's implemented today and the next engineering work needed to support sending invoice reminder emails using Google sign-in (OAuth) and the Gmail REST API. It assumes existing Xero integration and the EmailCopywriter agent (LLM-backed or template fallback) already generate drafts; this spec covers wiring Google OAuth, storing tokens, sending via Gmail, frontend sign-in UX, and acceptance criteria.

Summary

- Goal: enable users to connect their Google account and send invoice reminder emails through their Gmail (user's address) while preserving idempotency, auditability, and secure token handling.
- Principle: Keep third-party writes explicit and auditable. Persist minimal token metadata (`refresh_token` required), use DB-level upserts for concurrency, and prefer encrypted storage for refresh tokens.

Scope (this spec)

- Add backend OAuth endpoints to start/complete Google OAuth (server-side code exchange) and persist tokens.
- Implement `GoogleTokenRepository` for durable token storage and safe refresh logic.
- Implement a `GmailDeliveryService` to send an EmailDraft via Gmail REST API using the user's access token (auto-refresh via refresh_token when needed).
- Frontend: add Google connect UI and an OAuth callback page that routes to backend start/callback endpoints (PKCE optional; server-side exchange recommended).
- Wire `EmailCopywriter`/CollectionsReminder flows to optionally send drafts through connected Google accounts.

Design overview

- OAuth flow (recommended, server-side exchange):
  - Frontend: user clicks "Connect Google" → calls backend `POST /api/google/auth/start` to get an OAuth URL (includes state). Backend returns the URL. Frontend navigates the browser to that URL.
  - Google redirects back to a frontend callback route (e.g., `/auth/google/callback?code=...&state=...`) OR directly to backend callback depending on chosen approach. We recommend frontend callback that calls backend `POST /api/google/auth/complete` with the `code` and `state` to finish exchange.
  - Backend exchanges `code` for tokens at `https://oauth2.googleapis.com/token` using `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, receives `access_token`, `refresh_token`, `expires_in`, `scope`, `id_token`.
  - Backend persists tokens via `GoogleTokenRepository.upsertToken(clientId, userId, tokenSet)` where `userId` is the Google user email or sub from `id_token`.

- Token storage:
  - Table: `google_tokens` (see SQL below). Store `client_id`, `user_id` (Google email), `refresh_token` (encrypted at rest if possible), `access_token` (nullable), `expires_at` (timestamp), `scopes` (text[] or JSON), `created_at`, `updated_at`.
  - Use `INSERT ... ON CONFLICT (client_id, user_id) DO UPDATE SET ...` for upserts. Put advisory lock or short DB transaction around refresh operations to avoid concurrent refresh races.

- Sending email (Gmail REST API):
  - `GmailDeliveryService.sendEmail(draft, userId)` should: ensure a valid access token for `userId` (refresh if expired via `refresh_token`), construct a RFC 2822 / base64url encoded message, call `POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send` with `Authorization: Bearer <access_token>`.
  - Record delivery events to `core_events` for audit: `EMAIL.SENT`, `EMAIL.FAILURE` with idempotency key and message id.

Integration points in codebase (recommended files)

- Backend repositories/services:
  - `src/repository/google-token.repo.ts` — Token persistence + read/refresh helpers.
  - `src/service/google-oauth.service.ts` — Handles startUrl(state), exchangeCode(code), and refreshTokenFlow.
  - `src/service/mail/gmail-delivery.service.ts` — Sends email via Gmail API using tokens from `GoogleTokenRepository`.

- Controllers & routes:
  - `src/controllers/google-auth.controller.ts` — `startAuth`, `completeAuth`, `revoke` endpoints.
  - `src/routes/google-auth.routes.ts` — register endpoints under `/api/google`.

- Frontend pages/components:
  - `appworks-demo/src/pages/auth/google/GoogleAuth.page.tsx` — "Connect Google" UI; calls backend start endpoint.
  - `appworks-demo/src/pages/auth/google/GoogleCallback.page.tsx` — callback handler that reads query params and calls backend complete endpoint.
  - Minor store/saga updates to persist connected account status in Redux (or local state) and show user email.

- Email pipeline changes:
  - Add optional `sendViaGoogleUser(userEmail)` flag to `MailDeliveryService` consumer paths. The `CollectionsReminderService` should read tenant or operator preference: if operator connected Google account and `useUserGmail === true`, attempt send via Gmail, else fallback to existing `mailDeliveryService` adapter (which currently logs).

DB schema (migration SQL example)

```sql
CREATE TABLE IF NOT EXISTS google_tokens (
  id BIGSERIAL PRIMARY KEY,
  client_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  access_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  scopes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (client_id, user_id)
);
-- Consider adding `core_event` audit entries when tokens are added/rotated.
```

Security & operational notes

- Environment variables required: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_OAUTH_REDIRECT_URI` (frontend callback URL), optionally `GOOGLE_OAUTH_SCOPES` (default to `https://www.googleapis.com/auth/gmail.send email profile openid`).
- Refresh tokens are sensitive — recommend encrypting `refresh_token` at rest (application-level envelope encryption) or using a secrets manager.
- Use `state` parameter to prevent CSRF and validate at callback.
- Limit scopes to `gmail.send` + `email` + `openid` for minimal access.
- Provide a UI for operators to revoke connection which calls Google's revoke endpoint and clears `refresh_token` from DB.

Acceptance criteria

- Backend exposes `POST /api/google/auth/start` that returns an OAuth URL (200) and stores server-side state (nonce) for validation.
- Frontend can call start endpoint, navigate user to Google consent screen, and complete the flow via `POST /api/google/auth/complete` to persist tokens.
- A connected account shows in the frontend (email address and status).
- `GmailDeliveryService.sendEmail()` successfully sends a mail (manual test) through the user's Gmail account when configured.
- A `EMAIL.SENT` event is persisted to `core_events` with messageId and idempotency key; failures persist `EMAIL.FAILURE` with error details.

Implementation plan (high-level tasks)

1.  Draft updated spec and create todos (this file) — DONE.
2.  Implement `GoogleTokenRepository` (repo + SQL migration). (see TODOs)
3.  Implement backend OAuth endpoints and `google-oauth.service` to exchange code and refresh.
4.  Implement `gmail-delivery.service.ts` that uses tokens from repo and sends messages.
5.  Frontend connect UI + callback page; update store and show connected account.
6.  Wire CollectionsReminder/EmailCopywriter to optionally call `gmail-delivery` when operator chooses "Send from my Google account". Keep idempotency.
7.  Tests, logging, and runbook updates.

Minimal developer run steps (dev)

- Set these env vars locally (Windows / cmd):

```cmd
set NODE_ENV=development
set GOOGLE_CLIENT_ID=your-google-client-id
set GOOGLE_CLIENT_SECRET=your-google-client-secret
set GOOGLE_OAUTH_REDIRECT_URI=http://localhost:5173/auth/google/callback
npm run dev
```

- In the frontend, click "Connect Google" and complete the consent screen. Confirm the backend saved a `google_tokens` row.

Quick implementation notes & snippets

- Use Google's token endpoint for server-side exchange and refresh:

  POST https://oauth2.googleapis.com/token
  Content-Type: application/x-www-form-urlencoded
  grant_type=authorization_code&code=<code>&client_id=...&client_secret=...&redirect_uri=...

- For refresh:

  grant_type=refresh_token&refresh_token=<refresh_token>&client_id=...&client_secret=...

- Construct Gmail send body by base64url encoding a raw RFC 2822 message and POST to:

  POST https://gmail.googleapis.com/gmail/v1/users/me/messages/send
  Authorization: Bearer <access_token>
  { raw: '<base64url>' }

Next recommended step

- I can implement `src/repository/google-token.repo.ts` and the migration SQL, then wire it into a minimal `src/service/google-oauth.service.ts` (server-side exchange + refresh). Pick "implement repo + service" if you want me to continue now.
