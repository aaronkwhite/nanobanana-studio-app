# Changelog

## [0.4.5] - 2026-04-16

### Fixes

- **Retry path now retries only failed items** — `retryJob` → `submit_batch` previously read every item from the job and resubmitted them, so a retry double-billed Gemini for items that had already succeeded, and `download_results` then clobbered the original success counts with the retry batch's deltas. Now `submit_batch` runs a transaction that resets failed items back to pending, zeroes out `jobs.failed_items`, and reads only `pending` items for the JSONL. `download_results` aggregates the final counts from `job_items` directly so prior successes survive the retry. Rejects retries while the job is already `processing` or `downloading`.
- **`validate_api_key` rate-limited** — process-wide 2-second minimum between calls guards against a buggy or hostile frontend brute-testing candidate keys.
- **Release-build file logging** — packaged builds now log Warn-level to `$APPDATA/logs` with a 2 MiB rotating cap. Debug builds still stream Info to stdout and the webview console.

### Refactor

- **`submitJob` / `submitAndTrack` extracted to `$lib/utils/submit`** — the mode-routing, batch dispatch, and failure-handling logic left `+page.svelte` and became unit-testable. Route component shrinks to a thin input-gathering layer.

### Tests

- **107 total tests** (30 Rust + 77 frontend) — up from 88 (24 Rust + 64 frontend)
- **Rust**: retry filter selects only pending after reset (0.4.5), count aggregate preserves prior success (0.4.5), retry bails cleanly when nothing to submit (0.4.5), validate_api_key rate-limit burst rejection and interval boundary (0.4.5)
- **Frontend**: submit routing for T2I/I2I with correct payload shape, submitAndTrack success + failure paths, JobCard retry success + toast-on-failure, JobCard delete confirm two-click flow + failure toast, JobCard copy-prompt

## [0.4.4] - 2026-04-16

### Security

- **API key exfiltration closed** — `get_setting` and `get_all_settings` now enforce `ALLOWED_SETTING_KEYS`. Previously the allowlist only gated writes, so `invoke('get_setting', { key: 'gemini_api_key' })` returned the unmasked key, undoing the masking in `get_config`.
- **Mock mode gated to dev** — production now ignores a stale or spoofed `nanobanana-mock-mode` localStorage value and no-ops `toggle`/`enable`/`disable` outside dev. Prior builds could surface fake jobs with no API calls if the flag ever got set.
- **Tauri capability surface tightened** — dropped unused `fs:default` and `fs:scope` (`$HOME/**`) permissions. The frontend never uses `tauri-plugin-fs` directly; all file I/O flows through Rust commands.

### Correctness & Reliability

- **Transactions around multi-row inserts** — `create_t2i_job`, `create_i2i_job`, and `delete_job` now wrap their multi-row writes in `conn.transaction()`. A mid-insert crash can no longer leave a job with `total_items` greater than the number of `job_items` rows.
- **I2I uploads directory check fixed on macOS** — `get_uploads_dir` now returns a canonicalized path, so the `starts_with` check in `create_i2i_job` works against canonicalized input paths (previously `/var` vs `/private/var` made every I2I job fail the uploads-directory check).
- **CAS guard on download_results** — flips `jobs.status` `processing` → `downloading` atomically at entry. Concurrent poll ticks, or a delete fired mid-download, now bail early instead of writing orphan images or racing row deletes. Startup resets any stranded `downloading` rows back to `processing` so an app kill mid-download is recoverable.
- **Shared `reqwest::Client` with timeouts** — one client on app state with a 10s connect timeout and 600s request timeout, reused across `submit_batch`, `poll_batch`, `download_results`, `cancel_batch`, and `validate_api_key`. A stalled Gemini endpoint can no longer wedge a command indefinitely.
- **Gemini per-item error parsing fixed** — Gemini returns errors as `{code, message, status}` objects, not strings. `parsed["error"].as_str()` was always `None`, so real per-item errors fell through and surfaced as "No image in response".
- **Settings persistence awaited** — `settings.update()` now awaits the DB writes and rolls back the store on failure, so the UI no longer diverges from the persisted state silently.
- **Poll failure backoff** — `pollActiveJobs` now backs off exponentially (2s → 4s → 8s → 16s → 30s cap) on consecutive failures and resets on success. A network outage no longer produces a hot 2s loop of failing IPCs.

### UI

- **Toast primitive** — new `$lib/stores/toasts` + `<Toaster />` component. Wired into submit, retry, delete, and upload flows. Previously a failed command just logged to console; the user now sees an error toast with the underlying message.

### Database

- **`PRAGMA user_version` migration ladder** — `db::run_migrations` replaces the bare `CREATE TABLE IF NOT EXISTS` batch. Groundwork for the KIE commercialization work that will add new columns.

### Polish

- Error messages for missing files no longer leak full filesystem paths (filename only).
- `<svelte:component>` replaced with the dynamic-component form — `svelte-check` now reports 0 warnings.
- `Math.random()` fallback IDs in `Input`/`Textarea` replaced with a monotonic module counter (`$lib/utils/dom-id`).
- `get_jobs` now rejects unknown `status` filters instead of silently returning all jobs.
- `setJobs` renamed to `loadMocks` and gated to dev — production can no longer hot-swap the store contents.
- `any` casts in `settings.load` replaced with `asOutputSize`/`asAspectRatio` validators.
- Unused `Dialog` component deleted.
- Idiomatic `base64` import in `files.rs`.

### Test Coverage

- **88 total tests** (24 Rust + 64 frontend) — up from 57 (15 Rust + 42 frontend)
- **Rust**: CAS semantics, crash recovery, migration idempotency + legacy upgrade, `get_all_settings` filter
- **Frontend**: mock-mode dev/prod, toasts primitive, settings rollback + literal validation, jobs polling behavior with fake timers, `loadMocks` dev-gating, `updateJob`/`removeJob` coverage

### Internal

- **Main-branch code review** — added `docs/reviews/2026-04-16-main-audit.md` with prioritized findings (Critical/High/Medium/Low). This release addresses 22 of the 23 items flagged; the keychain migration is deferred to the KIE commercialization branch where the direct-Gemini auth path is being replaced with a backend-issued bearer token.

## [0.4.3] - 2026-03-23

### Fixes
- **Svelte compiler warnings** — resolved reactivity warnings (missing `$state` rune usage) and accessibility warnings (a11y attributes)

### Documentation
- **Cross-project design system reference** — added Tauri + SvelteKit design system reference doc for consistency across projects
- **README rewritten** — rebranded to Nana Studio, updated features, testing section, project structure, design system overview

### Test Coverage
- **57 total tests** (42 frontend + 15 Rust) — up from 13 frontend / 0 Rust
- **Rust backend tests** — MIME type mapping, batch name validation (SSRF/path traversal), save_setting key allowlist (security boundary), API key masking logic
- **Frontend store tests** — settings store (load/update/reset), config store (load/save/remove/validate)
- **Frontend utility tests** — select option arrays, isActiveJob predicate
- **Frontend type tests** — OUTPUT_SIZES prices, ASPECT_RATIOS, TEMPERATURES, calculateCost

## [0.4.2] - 2026-03-23

### Code Review Cleanup

#### DRY Refactoring
- **Shared select options** — extracted `sizeOptions`, `ratioOptions`, `tempOptions` to `utils/options.ts`, eliminating duplication between PromptForm and settings page
- **Shared Tabs component** — settings page now uses the `<Tabs>` component instead of a copy-pasted 50-line tab pill implementation (-48 lines)
- **Shared Rust paths module** — extracted `get_results_dir`, `get_uploads_dir`, `get_api_key`, `mime_from_ext`, and `validate_batch_name` into `paths.rs`, eliminating duplicates across `files.rs`, `batch.rs`, and `config.rs`
- **`Job::from_row`** — extracted duplicate 14-column row mapping closures in `jobs.rs` to a shared method on the Job struct
- **`isActiveJob` predicate** — extracted `pending || processing` check used in 4+ places to `utils/jobs.ts`
- **`submitAndTrack` helper** — deduplicated identical post-submit logic in T2I and I2I branches

#### Security Fixes
- **`save_setting` key allowlist** — frontend can no longer overwrite arbitrary config keys (e.g., the API key) via the generic settings endpoint
- **I2I path validation** — now uses `get_uploads_dir()` to honor custom upload directories instead of only checking the default path
- **SSRF validation consistency** — `cancel_batch` now checks for `://` in batch names, matching `poll_batch` and `download_results`

#### Reactivity Bug Fixes
- **Stale settings snapshot** — replaced `get(settings)` one-time read with a reactive `$effect` that syncs after async load
- **Mock mode dev guard** — toggle now correctly hidden in production builds via `{#if dev}`
- **Reactive `$mockMode`** — `JobCard.canExpand` now uses `$mockMode` instead of `get(mockMode)` for proper reactive dependency tracking
- **Mock mode toggle** — replaced subscribe-then-unsubscribe anti-pattern with `get()`

#### CSS Design Tokens
- **`.titlebar-glass` utility** — replaced duplicated inline backdrop-filter styles on both titlebars
- **Neutral tint tokens** — `--neutral-tint`, `--neutral-tint-strong`, `--neutral-border`, `--neutral-border-hover` replace scattered `rgba(128,128,128,...)` magic numbers
- **`--traffic-light-offset`** — replaces hardcoded `86px` in two places
- **`--accent-glow`** — used for ImageDropZone active state instead of hardcoded rose-gold rgba

## [0.4.1] - 2026-03-22

### UI Polish
- **Titlebar** — consistent `h-12` height, translucent glass blur (`blur(8px)` at 30% opacity) with dedicated `--titlebar-bg` token, `z-50` to stay above settings cards
- **Default generation settings** — changed to 1K, Wide (16:9), Temperature 1
- **Temperature labels** — now show `0 (Precise)`, `0.5`, `1 (Default)`, `1.5`, `2 (Creative)`
- **Output directory** — Browse button sized to match input height
- **Light mode glass** — reduced card opacity to 40% for more depth

## [0.4.0] - 2026-03-22

### Rebrand — Nana Studio
- **Renamed from "Nanobanana Studio" to "Nana Studio"** across all user-facing strings, window title, meta tags, download filenames, and Rust backend
- **New logo** — rose-gold gradient banana wordmark SVG replaces emoji icon in About page
- **Tagline** — "Peel. Prompt. Produce."
- **About page rewritten** — explains Batch API value prop, auto-reads version from Tauri config

### Settings Overhaul
- **Consolidated tabs** — 5 tabs (API Key, Defaults, Storage, Appearance, About) merged into 2 (General, About)
- **Back arrow + title moved** above tabs instead of in the titlebar
- **Z-index fix** — dropdown menus in settings no longer render behind cards below
- **Version number** now pulled dynamically from Tauri at runtime

### Storage
- **Default output directory** changed from `~/Library/Application Support/` to `~/Pictures/Nana Studio/`
- **Uploads directory** hidden from settings UI (transient, stays in App Data)
- **New `get_default_results_dir` command** — frontend displays the actual resolved path
- **Security allowlist** updated to include Pictures directory

### Dark Mode
- **Glass card fix** — disabled backdrop blur/saturation in dark mode to eliminate blue tint amplification
- **Glass background** tuned to 40% opacity silver-700 for subtle card contrast

### Image Drop Zone
- **Tauri native drag-drop** — replaced broken browser `ondrop` with `getCurrentWebview().onDragDropEvent()` for proper Finder file drops
- **Pink accent background** on hover and drag-over states with `background-clip: padding-box` to stay inside dashed border

### Other
- **Fluid-width mode tabs** — stretch full width instead of hugging content
- **Generations section label** with active badge and HR divider above job cards
- **Expand hint** — subtle chevron on completed cards
- **lucide-svelte** upgraded to v1.0.0-rc.1

## [0.3.0] - 2026-03-21

### Design System Overhaul — Rose Gold + Apple-Native Polish

#### New Color System
- **Rose Gold accent** replaces Golden Hour yellow — premium, distinctive, and accessible
- Rose Gold scale: `#fdf2f8` (50) through `#702459` (800) with proper light/dark theme mapping
- **Harmonized semantic colors** — desaturated, warm-shifted values that complement rose gold:
  - Success: Sage Teal (`#2D9D78` light / `#5BB89A` dark)
  - Warning: Warm Amber (`#C08A2E` light / `#D4A54A` dark)
  - Error: Warm Vermillion (`#C93B3B` light / `#E06060` dark)
- Each semantic color gets `-subtle` and `-border` tokens for tinted backgrounds
- New `--accent-glow` token for interactive glow effects

#### Apple-Native UI Polish
- **Sliding pill tabs** — animated indicator slides between tabs using `translateX()` with spring easing, replacing instant accent-fill toggle. Neutral surface pill with subtle shadow, matching Linear/Raycast/macOS native segmented controls
- **Refined buttons** — lighter weight (34px height, 13px text), whisper shadows, opacity-based hover, `translateY(0.5px)` press feedback. Secondary buttons now use translucent backgrounds instead of opaque white + border
- **Theme-aware tab containers** — translucent backgrounds with 0.5px borders, proper dark mode pill visibility

#### Component Updates
- Badge success/error variants: tinted pill style instead of solid colored backgrounds
- ImageDropZone: rose gold glow on drag instead of yellow
- JobCard: uses `--error-subtle` token instead of hardcoded rgba
- Settings heart icon: uses accent color instead of error red
- Confetti: rose gold + silver particles
- API key toast: clean surface background with neutral border
- PromptForm: z-index fix for dropdown stacking over job cards

## [0.2.0] - 2026-03-19

### Complete UI Overhaul

The entire frontend has been rebuilt from scratch with a new design system, component library, and architecture.

#### Design System
- **Moonlight Silver + Golden Hour** color palette (superseded by Rose Gold in 0.3.0)
- **Glass morphism** effects on cards, headers, and surfaces (backdrop-filter blur + translucent backgrounds)
- **Light and dark themes** with proper WCAG contrast — Golden Hour 300 primary in dark mode, 500 in light mode
- **Design tokens** for colors, spacing (4px grid), border radius, shadows, typography, and transitions
- **SF Pro system font stack** with weight 500 for interactive elements, 600 for headings

#### Component Library (Bits UI)
- 10 shared UI primitives: Button, Input, Textarea, Select, Tabs, Badge, Card, ProgressBar, Dialog, Tooltip
- All components use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`)
- Custom dropdown selects with check icons, keyboard support, and proper dark mode styling
- Accessible labels, focus states, and ARIA attributes throughout

#### New Features
- **Dedicated settings page** (`/settings`) with four tabs: API Key, Defaults, Appearance, About
- **Expand-in-place job results** — click a completed job card to reveal generated images inline
- **Canvas confetti** celebration on batch completion
- **Mock data mode** — toggle between live and mock mode for UI development without API costs
- **Generation defaults** — set preferred output size, aspect ratio, and temperature in settings
- **API key validation** — "Test & Save" validates your key against Gemini before storing
- **Buy Me a Coffee** support link in About
- **Legal disclaimer** with Google/Gemini trademark attribution

#### Icons
- Replaced all emoji icons with **Lucide** icon library (lucide-svelte)
- Settings, Trash, Sun/Moon/Monitor, Loader, CheckCircle, XCircle, Copy, AlertTriangle, and more

#### Architecture
- **Shared PromptForm** component eliminates duplication between Text-to-Image and Image-to-Image forms
- **Typed Tauri command wrappers** (`src/lib/utils/commands.ts`) for all IPC calls
- **Strict TypeScript types** for all models, matching Rust structs exactly
- **Stores refactored** — theme, config, settings, and jobs stores with proper lifecycle management

### Gemini Batch API Integration

- **New `batch.rs` module** — submit, poll, download results, cancel, validate API key
- **JSONL file-based batch submission** with resumable upload to Gemini File API
- **Batch state mapping** — Gemini job states mapped to app status (pending, processing, completed, failed, cancelled)
- **Result parsing** — downloads result JSONL, decodes base64 images, saves to disk with correct MIME types
- **Temp file cleanup** — JSONL files cleaned up after batch completion
- **Retry support** — failed jobs can be resubmitted

### Native Desktop Experience

- **Custom titlebar** with overlay style, hidden native title, and positioned traffic lights
- **Window dragging** via `-webkit-app-region: drag` with no-drag zones on interactive elements
- **No scrollbars** — hidden for native feel
- **No rubber-banding** — overscroll behavior disabled
- **Responsive layout** — full-width content, 800x700 default window, 480x500 minimum
- **External links** open in default browser via Tauri shell plugin

### Security Hardening

- **Content Security Policy** enabled — restricts script/style/connect sources
- **Path validation** on `get_image` — canonicalized paths must be within uploads/results directories
- **SSRF protection** — batch_name validated against expected format before URL interpolation
- **HTTP status checking** — all 6 Gemini API calls verify response status before parsing
- **Symlink protection** on `delete_upload` — uses canonicalized path comparison
- **File count validation** moved before processing (prevents disk exhaustion)
- **Image path validation** in I2I jobs — paths must be within uploads directory
- **Narrowed fs:scope** — removed `$TEMP/**`, only `$APPDATA/**` allowed
- **Delete job cancels batch** — active batches cancelled on job deletion
- **Cancel batch updates DB** — job status properly set to cancelled

### Bug Fixes

- Fixed polling race condition — replaced `setInterval` with recursive `setTimeout`
- Fixed premature completed status — waits for `downloadResults` before marking done
- Fixed Tooltip Provider — single instance at root instead of per-tooltip
- Fixed Input/Textarea label accessibility — proper `for`/`id` association
- Fixed copy button — fallback for Tauri webview clipboard restrictions with visual feedback
- Removed dead Card component props (`expandable`, `expanded`, `ontoggle`)
- Added cancelled status icon (Ban) to JobCard
- Added temperature to job metadata display
- Removed hardcoded "AI" prefix API key validation

## [0.1.0] - 2026-03-19

### Initial Release
- Tauri v2 + SvelteKit 2 + Svelte 5 desktop app scaffolding
- SQLite database with jobs, job_items, and config tables
- Text-to-Image and Image-to-Image form interfaces
- Job queue with 2-second polling
- File upload with validation (type, size, count)
- Dark/light/system theme support
- Settings modal with API key management
- Basic test suite (125 tests)
