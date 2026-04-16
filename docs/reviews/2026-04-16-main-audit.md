# Code Review — `main` (Nana Studio v0.4.3)

**Date:** 2026-04-16
**Reviewer:** Claude (Opus 4.7) via parallel layer-specific reviewers
**Branch:** `main` (shipped state, pre-KIE commercialization)
**Scope:** Tauri desktop app — direct Gemini batch API from Rust, local SQLite, API key stored locally. Post-`code review cleanup` pass (commit `e15c9d5`). ~66 frontend source files, ~900 LOC Rust.

## Summary

Overall quality is high — parameterized SQL throughout, CSP locked to Gemini, token-first CSS, factory stores with encapsulated writables. But there are real security, correctness, and UX holes worth fixing before the KIE cutover overwrites this code.

## Critical — fix before next release

1. **`get_setting` leaks the Gemini API key in plaintext.** `src-tauri/src/commands/config.rs:66-78` doesn't apply `ALLOWED_SETTING_KEYS` (which gates *writes* at line 80). Any frontend code can `invoke('get_setting', { key: 'gemini_api_key' })` and receive the unmasked key — undoing all the masking in `get_config` (`config.rs:10-38`).

2. **API key stored in plaintext in SQLite.** `src-tauri/src/commands/config.rs:41-53` writes to `config.value` as bare `TEXT` inside `nanobanana.db`. No keychain, no encryption. Migrate to `keyring` crate (macOS Keychain / Windows CredMan / Secret Service) with one-time migration from DB.

3. **Mock mode is runtime-togglable in production.** `src/lib/utils/mock-mode.ts:7-28` reads `localStorage` with no `dev` guard; `enable()`/`toggle()` are always callable. Fix: `initial = browser && dev ? ... : false` plus no-op mutators outside dev.

4. **`fs:scope` allows the entire home directory.** `src-tauri/capabilities/default.json:16-21` — `"$HOME/**"` gives the webview read/write across all user files. Scope to `$APPDATA/**`, `$PICTURE/Nana Studio/**`, and the configured uploads/results roots.

## High

5. **`create_i2i_job` canonicalize mismatch breaks I2I on macOS.** `src-tauri/src/commands/jobs.rs:156` — `canonical.starts_with(&uploads_dir)` but `uploads_dir` is never canonicalized. On macOS `/var` → `/private/var`; the check fails.

6. **No transactions around multi-row inserts.** `src-tauri/src/commands/jobs.rs:91-126, 167-202` — `create_t2i_job` / `create_i2i_job` do one job INSERT + N item INSERTs without `conn.transaction()`.

7. **Poll/download/delete race.** `src-tauri/src/commands/batch.rs:217-444` + `jobs.rs:225-252` — nothing synchronizes `poll_batch`, `download_results`, and `delete_job`. Add a CAS guard: `UPDATE jobs SET status='downloading' WHERE id=? AND status='processing'`.

8. **`reqwest::Client::new()` per call + no timeouts.** `src-tauri/src/commands/batch.rs:110, 223, 261, 423, 448` — build one client in `setup()`, `app.manage(...)` it.

9. **`settings.update()` fires saves without awaiting.** `src/lib/stores/settings.ts:32-42` calls `cmd.saveSetting(...)` inside the sync `update` callback without awaiting. Failed save silently diverges store from DB.

10. **`Select` component is broken ARIA.** `src/lib/components/ui/Select.svelte:71-87` — `<div role="option" tabindex="0">` with no ArrowUp/Down, no focus mgmt, no typeahead, no `aria-activedescendant`. `bits-ui` is already a dep; use its `Select`.

11. **Tauri command errors are swallowed across submit/upload paths.** `src/routes/+page.svelte:95-97`, `JobCard.svelte:84-87`, `ImageDropZone.svelte:49, 63`, `ImageChip.svelte:16` — all `catch` → `console.error`. App has no toast primitive. Add one.

12. **No refund/retry path for partial batch failures.** `src-tauri/src/commands/batch.rs:382-388` — when `failed > 0 && completed == 0`, job marks `failed` with no retry-failed-items command.

## Medium

13. **No DB migrations.** `src-tauri/src/db.rs:21-62` — all schema is `CREATE TABLE IF NOT EXISTS`. Add `PRAGMA user_version` + a migration ladder before KIE commercialization adds columns.

14. **Gemini per-item error parsing is wrong.** `src-tauri/src/commands/batch.rs:315` — errors are `{"code": ..., "message": ...}`, but code uses `parsed["error"].as_str()`. Use `parsed["error"]["message"].as_str()`.

15. **`pollActiveJobs` has no backoff on failure.** `src/lib/stores/jobs.ts:62-65` — 2s hot loop on network outage.

16. **`any` casts on DB-loaded settings.** `src/lib/stores/settings.ts:21-22` — stale DB value crashes `calculateCost` downstream.

17. **`setJobs` / mock hot-swap leaks into production store.** `src/lib/stores/jobs.ts:128-130` only used by `+page.svelte:42` for mock data. Rename to `loadMocks()` and gate with `dev`, or delete.

18. **`pollActiveJobs` uses subscribe+immediate-unsub to read state.** `src/lib/stores/jobs.ts:13-15, 68-70` — use `get(jobs)` from `svelte/store`.

19. **Thin component test coverage.** `src/lib/components/JobCard.test.ts:25-34` — no coverage of expand/delete-confirm/retry/copy. `Button.test.ts:17-22` asserts class substrings (refactor-brittle).

20. **`jobs.test.ts` leaks state + real timers.** `src/lib/stores/jobs.test.ts:37-49` — `resetModules()` doesn't re-load the singleton; `addJob` schedules real 2s setTimeout.

21. **`Dialog` component is dead code.** `src/lib/components/ui/Dialog.svelte` + export in `ui/index.ts:9` have zero consumers. Either delete or use it for inline delete-confirm in `JobCard.svelte:53-62`.

22. **`+page.svelte` is an oversized controller.** `src/routes/+page.svelte:60-100` — extract `useJobSubmit` to a utility module.

23. **`Mutex<Connection>` held across `.await` in `delete_job`.** `src-tauri/src/commands/jobs.rs:225-252` — works by accident today but is a deadlock footgun.

## Low

- `validate_api_key` (`batch.rs:447`) has no rate limiting.
- Error strings leak full filesystem paths (`files.rs:26, 79`, `batch.rs:75`).
- `tauri_plugin_log` only initializes in debug (`lib.rs:17-23`); release builds are blind.
- `base64` import style inconsistent between `files.rs:109` and `batch.rs:2`.
- `svelte:component` is deprecated in Svelte 5 (`src/routes/settings/+page.svelte:253`).
- `lucide-svelte` pinned to `^1.0.0-rc.1` — shipping on an RC.
- `Math.random()` IDs in `Input.svelte:10`, `Textarea.svelte:13` — not SSR-stable.
- Some components hardcode `rgba(128,128,128,...)` bypassing `--neutral-tint*` tokens.
- `get_jobs` silently returns all jobs for unknown `status` values (`jobs.rs:12-25`).
- `JobCard.test.ts:16` mock has `batch_temp_file: null` — field isn't in the `Job` type.

## Done well

- Every SQL statement uses `params![]`. No `format!`-built queries anywhere.
- `validate_batch_name` blocks SSRF via `://` and traversal via `..`; applied at every Gemini-facing command.
- CSP in `tauri.conf.json:30` restricts `connect-src` to the Gemini endpoint.
- `ALLOWED_SETTING_KEYS` allowlist on `save_setting` — tight gate.
- Token-first CSS layer (`app.css:7-140`) is two-pass.
- Store factory pattern correctly exposes only `subscribe` + mutators.
- `calculateCost` + literal-typed `OUTPUT_SIZES`/`ASPECT_RATIOS` give compile-time enumeration.
- `commands.ts` is a disciplined IPC wrapper — no raw `invoke` elsewhere in stores.
- `tsconfig.json` uses `strict: true` + `checkJs: true`.
- WAL mode enabled on SQLite (`db.rs:18`).
- Tauri drag regions + `no-drag` on buttons correctly placed.

## Suggested fix order

1. **Today**: Critical #1 (get_setting allowlist) — 3 lines. Blocks API key exfil.
2. **This week**: Critical #3 (mock-mode dev gate), #4 (fs:scope narrow).
3. **Before v0.5**: High #5 (I2I canonicalize), #8 (reqwest client), #9 (settings await), #11 (toast primitive).
4. **Before KIE cutover lands**: Medium #13 (migrations).
5. **Dead code pass**: High #2 → follow-up (keychain), #21 (Dialog), #17 (setJobs rename).

## Observations

Commit `e15c9d5` ("code review cleanup") landed a solid pass — token-first CSS, store factory pattern, path validation helpers, and `paths.rs` tests are attributable to it. But at least two items in this review should have been caught there: the `get_setting` allowlist hole (allowlist right below it on the same file) and the mock-mode dev gate (the commit explicitly claimed to add one). Worth a second-pass discipline review: "did the fix we claimed match what we implemented?"

## Verification notes

All four Critical findings were verified on disk before publishing:
- `get_setting` (`config.rs:67-78`) does NOT apply `ALLOWED_SETTING_KEYS` (which exists at line 80 for writes only).
- `mock-mode.ts:7` has no `dev` guard; `enable()`/`toggle()` unconditional.
- `capabilities/default.json:16-21` has `"$HOME/**"` in `fs:scope.allow`.
- `create_i2i_job` (`jobs.rs:156`) compares canonicalized input to non-canonicalized `uploads_dir`.
- `Dialog` has zero consumers outside the barrel export.
- `settings.ts:36-39` calls `saveSetting` unawaited inside sync `update` callback.
