# Dependency Audit Triage

Last reviewed: 2026-06-09

`npm audit` flags a number of advisories. This document records which were
fixed and why the remainder are accepted (not reachable in the deployed
runtime). Re-evaluate on each dependency bump.

## Fixed

| Package | Severity | Where | Fix |
|---|---|---|---|
| `multer` (2.0.2) | High | `@nestjs/platform-express` bundled an old copy; used by the admin location-import upload (`FileInterceptor`) - the one genuinely reachable runtime finding | Added `overrides: { "multer": "^2.1.1" }` in `backend/package.json` to force the patched version (same major, drop-in) |
| `next` 14.2.29 → `^14.2.35` | High | All three apps | Bumped to the latest 14.2.x, which backports the Server-Component DoS, CSP-nonce XSS, cache-poisoning, and image-optimizer advisories |
| `xlsx` | High | Backend Excel import (prototype pollution / ReDoS, no upstream fix) | Replaced with `exceljs` |

## Accepted (not reachable in production runtime)

These remain in `npm audit` output but live in dev/build/install tooling or in
transitive deps that only a major upgrade would change. None are exercised by
a deployed, attacker-reachable code path.

### Backend
- **glob, picomatch, lodash, tmp (dev)** - pulled in by `@nestjs/cli` /
  `@angular-devkit` (the build/watch toolchain) and inquirer. The advisories
  require invoking the glob CLI, feeding attacker-controlled glob patterns, or
  the interactive external-editor flow - none run in production.
- **tar** - only via `bcrypt` → `node-pre-gyp`, used at *install* time to
  unpack a prebuilt binary. Not a runtime path.
- **@nestjs/core / ajv / file-type / webpack (moderate)** - framework/build
  internals; the file-type DoS is bounded by our 5 MB upload limit and the
  admin-only import endpoint, and webpack's buildHttp SSRF requires the unused
  `HttpUriPlugin`.
- **exceljs → tmp** - resolves to `tmp@0.2.7`, which is **not** in the
  vulnerable range.

### Frontend
- **next (high)** - already on the latest 14.2.x with security backports.
  `npm audit` only offers `next@16`, a major/breaking upgrade (React 19, App
  Router changes) not justified by these advisories.
- **postcss (<8.5.10), uuid (<11.1.1 via `@measured/puck`)** - transitive
  inside `next` and the admin-only Puck editor; fixable only by the same major
  bumps. The postcss stringify XSS needs attacker-controlled CSS through the
  build (we don't), and the uuid bounds check only triggers when a `buf` arg
  is passed (Puck doesn't).

## How to re-check

```bash
# backend
cd backend && npm audit
# apps (workspaces)
npm audit
```

Treat any **new high/critical in a production runtime dependency** as
actionable; dev/build-tooling advisories can be batched with framework upgrades.
