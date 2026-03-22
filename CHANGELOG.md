# Changelog

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
