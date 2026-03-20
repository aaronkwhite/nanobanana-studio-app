# Changelog

## [0.2.0] - 2026-03-19

### Complete UI Overhaul

The entire frontend has been rebuilt from scratch with a new design system, component library, and architecture.

#### Design System
- **Moonlight Silver + Golden Hour** color palette replacing the old banana-yellow theme
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
