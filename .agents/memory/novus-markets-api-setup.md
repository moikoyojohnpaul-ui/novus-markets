---
name: Novus Markets API setup quirks
description: Critical wiring decisions for the Novus Markets project API client and auth
---

## Generated client already embeds /api prefix

The Orval-generated client in `lib/api-client-react/src/generated/api.ts` hard-codes `/api/...`
in every URL function (e.g. `return '/api/auth/login'`). Do NOT call `setBaseUrl('/api')` —
that will double the prefix to `/api/api/...`.

**Why:** Orval generates URLs from the OpenAPI spec server prefix. The spec defines `/api` as
the base, so all paths are already absolute.

**How to apply:** Only call `setBaseUrl(...)` if you need to point to a remote host (e.g. Expo
mobile app pointing to a deployed API). For the web artifact at root `/`, leave `setBaseUrl`
uncalled or set to null.

## custom-fetch subpath export

`@workspace/api-client-react/custom-fetch` must be explicitly exported in package.json:

```json
"exports": {
  ".": "./src/index.ts",
  "./custom-fetch": "./src/custom-fetch.ts"
}
```

Without this, Vite throws `Missing "./custom-fetch" specifier`.

## Auth token flow

Token stored in `localStorage` under key `nm_token`. The `use-auth.tsx` hook calls
`setAuthTokenGetter(() => localStorage.getItem("nm_token"))` on mount, which injects
`Authorization: Bearer <token>` into every API request automatically.

## Password hashing

Passwords are hashed with: `sha256(password + "nm_salt_2024")`. No bcrypt — keep consistent.

## Seed credentials

- Admin: `admin@novusmarkets.com` / `admin123`
- Demo trader: `james.kiprotich@email.com` / `demo123`
