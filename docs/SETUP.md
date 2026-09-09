# Setup and Cloudflare deployment

## Requirements
Node.js 24, npm, and a Cloudflare account for deployment. The main install, test, typecheck, build and deploy commands work in PowerShell and Linux. Optional legacy lint/database-generation wrappers use Bash; existing migrations do not need regeneration.

## Install and verify
```sh
npm ci
npm test
npm run typecheck
npm run build
```
If npm reports pending scripts, review the named packages before approving. For the dependencies in this lockfile:
```sh
npm approve-scripts esbuild sharp unrs-resolver workerd
npm rebuild esbuild sharp unrs-resolver workerd
```
Older npm releases may not have approve-scripts; use it only when npm reports that approval is required.

An optional domain demonstration runs with `npm run demo:workflow`. SQLite storage tests run with `python3 tests/team_storage.py` (or `python tests/team_storage.py` on Windows).

## Existing applicant deployment
Public URL: https://sitesync-coordination.keshariritik101.workers.dev

`cloudflare.config.json` contains the applicant's existing Worker name and D1 ID. These resource identifiers are not authentication credentials. They are included so the applicant can rebuild without manually editing generated configuration.

Log in and deploy from the extracted folder:
```sh
npx wrangler login
npm run deploy
```
The deploy script builds, restores the Worker name and DB binding, and deploys `dist/server/wrangler.json`. There is no need to edit generated JSON manually.

**Do not rerun the initial SQL files against the existing production database. Both were already applied.** Uploading this repository to GitHub does not deploy it.

## Another developer's deployment
1. Authenticate to your own Cloudflare account with `npx wrangler login`.
2. Create your database: `npx wrangler d1 create sitesync-db`.
3. Update `cloudflare.config.json` with your returned database ID and desired Worker name.
4. On this fresh empty database only, apply:
```sh
npx wrangler d1 execute sitesync-db --remote --file=drizzle/0000_condemned_ricochet.sql
npx wrangler d1 execute sitesync-db --remote --file=drizzle/0001_first_trish_tilby.sql
npm run deploy
```
Use your database name in these commands if different. Commands modifying remote resources run under your authenticated account and are subject to its service limits.

## Local demo
The Vite configuration supplies a development DB binding with a placeholder ID. A developer must initialize that local binding with the SQL schema before using the UI. Running npm run dev alone does not migrate storage. Local development uses a separate cookie without Secure for HTTP localhost. The full local browser/database setup has not been independently verified in this package; use the deployed prototype for evaluation and the credential-free domain tests for reproducible local checks.

## Public demo boundary
`identity()` always returns null. Team APIs reject requests, even if a visitor supplies historical identity headers. All visible role switching is confined to synthetic guest projects. No external sign-in service or API key is required for the demo.

## Repository contents
No node_modules, generated dist, local database, credentials or Git history is included. The source retains historical platform build helpers and a logical hosting manifest for compatibility; it contains no original Site project ID. The active deployment path is Wrangler.

## Final verification
Open the public URL in an incognito window, confirm no sign-in link, create a change, review and approve using the role selector, then refresh. Approval should release change holds while unfinished prerequisites continue to block dependent tasks.
