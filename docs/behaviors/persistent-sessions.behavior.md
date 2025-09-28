Title: Persistent Sessions (Keep me signed in)

## Purpose

This document explains how the "Keep me signed in" persistent session feature works in this repository, where the code lives, and what each piece is responsible for. It's written for future maintainers who need to understand, debug, or extend the flow.

## High-level overview

- User checks a "Keep me signed in" UI control in the SPA before starting an OAuth flow (Google / Xero).
- The SPA sends the OAuth-start request with credentials included and with a header to request persistence (X-Remember-Me: 1).
- The server generates a cryptographically-random raw token, stores only its SHA-256 hash in the `remember_tokens` table, and sets an httpOnly cookie named `remember_token` containing the raw token.
- On subsequent requests the Fastify plugin inspects the cookie, validates the hash in the database, decorates the request with the remembered user id, and performs a sliding-window extension (extend expiry by 60 days on use).
- A daily cron job deletes expired tokens from the DB.

## Security model (short)

- The server stores only the SHA-256 of the token (not the raw token) in DB.
- The cookie is set with httpOnly and Secure flags and SameSite=lax to reduce CSRF risk while still allowing cross-origin OAuth starts to succeed when credentials are included.
- Sliding-window: tokens are renewed on active use up to the configured TTL (60 days). Expired tokens are removed by a scheduled cleanup.

## Where to look (code map)

- Frontend (SPA)
  - "Keep me signed in" UI: 
    - `appworks-demo/src/components/Nav.component.tsx`
    - `appworks-demo/src/pages/auth/xero/XeroAuth.page.tsx`
    - `appworks-demo/src/components/ui/settings/GoogleIntegrationCard.component.tsx`
    - The checkbox state is managed within the component and passed to the auth handler.
  - Google connect: `appworks-demo/src/components/ui/settings/GoogleIntegrationCard.component.tsx` (uses fetch POST with `credentials: 'include'` and will include `X-Remember-Me` when the checkbox is checked).
  - Xero start helper: `appworks-demo/src/apis/xero.api.ts`
    - `startXeroAuth(mode, opts?)` — when `mode === 'json'` this uses `fetch(..., { credentials: 'include' })` and will send `X-Remember-Me: 1` if `opts.remember` is true.
  - SPA handler that starts Xero auth: `appworks-demo/src/handlers/auth.handler.ts` — it now calls `startXeroAuth('json', { remember: persist })` where `persist` is a boolean passed from the UI component.

- Backend (Fastify)
  - OAuth start controllers (they create the remember token when asked):
    - Google: `src/controllers/google-auth.controller.ts` — on start, if `x-remember-me: 1` header is present the controller generates the token, persists it, and sets the cookie.
    - Xero: `src/controllers/xero.controller.ts` — same behavior in the JSON-start branch.
  - Remember token persistence: `src/repository/remember-token.repo.ts`
    - createToken(raw, userId, provider, expiresAt)
    - findByRawToken(raw)
    - touchExtend(id, extendByMs)
    - deleteExpired(before?)
    - generateRememberToken() helper
    - Also registers a cron job (daily) to delete expired rows.
  - Fastify plugin that consumes the cookie and performs sliding-window update: `src/plugins/remember-token.fastify-plugin.ts`
    - Hook: `onRequest` — reads `request.cookies.remember_token`, validates via repo, clears cookie if invalid/expired, decorates request (`request.rememberUserId`, `request.rememberTokenId`), and triggers `touchExtend(id, 60 days)`.
  - Server registration: `src/index.ts` — the plugin is registered early during server startup (`server.register(rememberTokenPlugin)`).

- DB / migrations
  - Migration creating the table: `migrations/2025-09-28-create-remember-tokens.sql`
    - Table `remember_tokens` columns: id, token_hash, user_id, provider, created_at, last_used_at, expires_at, refresh_count

## Behavioral details and edge cases

- Cookie acceptance: the SPA must send the OAuth-start request with credentials included (e.g., `fetch(url, { credentials: 'include' })`) so the browser will accept the Set-Cookie header from the server. This repository uses targeted fetch calls for OAuth starts rather than global axios.withCredentials.
- Cookie rotation and sliding-window: when the plugin sees a valid token it calls `touchExtend` to update `last_used_at` and set a new `expires_at` (current time + 60 days). This is a sliding renewal: inactive tokens will expire and be removed by cron.
- Expired tokens: the plugin will clear the cookie if the token is expired or unknown. The repo also runs a daily cleanup job to remove expired rows.
- Token lookup: server looks up the SHA-256(token) hash. If an attacker obtains the DB, they can't recover raw tokens easily. If an attacker obtains a user's browser cookie, the cookie itself is sufficient to authenticate until expiration (typical for cookie-based remember-me flows) — consider tying token to device fingerprint or storing an additional token signature if stronger protections are required.

## Testing notes / quick smoke plan

- Manual smoke steps:
  1.  In the SPA enable the "Keep me signed in" checkbox.
  2.  Start OAuth (Google/Xero) via the SPA JSON-start path (the code uses `fetch` with credentials).
  3.  Observe the server response sets a `Set-Cookie: remember_token=...; HttpOnly; Secure; SameSite=Lax; Max-Age=5184000` header (Max-Age ~= 60 days).
  4.  Make another request to any API route; the plugin should detect the cookie, and `request.rememberUserId` will be available to route handlers. DB `remember_tokens.expires_at` should be extended.

- Automated tests to add (recommended):
  - Controller test: simulate OAuth-start with `X-Remember-Me: 1` header; assert repository created a new hashed record and response includes Set-Cookie with `remember_token`.
  - Plugin test: create a test DB row with a known raw token, send a request with cookie set; assert the request is decorated and the DB `expires_at` was extended.

## Notes for maintainers

- The SPA intentionally avoids setting global axios `withCredentials` because that changes behavior across the app; instead the targeted OAuth-start calls use `fetch(..., { credentials: 'include' })` so only the relevant requests include cookies.
- If you change cookie attributes (SameSite / Secure), verify the OAuth redirect flow still works across any cross-origin redirects your environment uses.
- If you plan to rotate token format or move to JWT-based persistent sessions, update both the controllers (creation) and the plugin (validation) together and migrate existing DB rows carefully.

## Contact

If anything here is unclear, inspect the files listed above directly; they are small and documented in-place. For behavior rationale see `appworks-demo/docs/behaviors/persistent-sessions.behavior.md` (this file).
