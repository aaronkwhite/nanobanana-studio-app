# Nanobanana Studio — Full Overhaul Design Spec

## Overview

Full overhaul of Nanobanana Studio, a Tauri v2 desktop app for batch image generation using the Gemini 3.1 Pro Preview Batch API. Clean frontend rebuild with SvelteKit + Bits UI + new design system while keeping the existing Rust backend. Wire up the real Gemini Batch API to replace the current unfinished integration.

## Goals

- Rebuild frontend from scratch with Bits UI, proper design system, and component architecture
- Implement Moonlight Silver + Golden Hour design language with glass effects
- Wire up Gemini 3.1 Pro Preview Batch API (JSONL file-based submission)
- Eliminate code duplication between T2I and I2I forms
- Replace emoji icons with Lucide
- Add dedicated settings page
- Expand-in-place job results

## Non-Goals

- Sidebar or multi-panel layout (single column for v1)
- Unified prompt interface (keep T2I and I2I separate)
- Cloud sync, accounts, or multi-user features
- Mobile or web deployment
- Additional Gemini capabilities (text generation, video, embeddings)

## Identity

Personality in the brand, calm and focused in the UI. The name and accent color bring warmth and creative energy; the interface itself is clean, quiet, and professional. Think Linear meets a creative tool — the quirky name is just a name, but the golden warmth gives it soul.

---

## Design System

### Color Tokens

**Moonlight Silver (neutrals):**

| Weight | Hex |
|--------|-----|
| 50 | #F8FAFC |
| 100 | #F1F5F9 |
| 200 | #E2E8F0 |
| 300 | #CBD5E1 |
| 400 | #94A3B8 |
| 500 | #64748B |
| 600 | #475569 |
| 700 | #334155 |
| 800 | #1E293B |

**Golden Hour (accent):**

| Weight | Hex |
|--------|-----|
| 50 | #FEFCE8 |
| 100 | #FEF3C7 |
| 200 | #FDE68A |
| 300 | #FCD34D |
| 400 | #FBBF24 |
| 500 | #F59E0B |
| 600 | #D97706 |
| 700 | #B45309 |
| 800 | #92400E |

**Semantic colors:**
- Success: #22c55e
- Warning: #F59E0B
- Error: #ef4444

### Semantic Color Mapping

**Dark theme:**

| Token | Value |
|-------|-------|
| --bg | silver-800 (#1E293B) |
| --surface | silver-700 (#334155) |
| --border | silver-700 (#334155) |
| --text | silver-100 (#F1F5F9) |
| --muted | silver-400 (#94A3B8) |
| --accent | golden-300 (#FCD34D) |
| --accent-hover | golden-400 (#FBBF24) |
| --accent-active | golden-500 (#F59E0B) |
| --accent-text | golden-800 (#92400E) |
| --accent-subtle | rgba(252,211,77,0.1) |

**Light theme:**

| Token | Value |
|-------|-------|
| --bg | silver-50 (#F8FAFC) |
| --surface | white |
| --border | silver-200 (#E2E8F0) |
| --text | silver-800 (#1E293B) |
| --muted | silver-500 (#64748B) |
| --accent | golden-500 (#F59E0B) |
| --accent-hover | golden-600 (#D97706) |
| --accent-active | golden-700 (#B45309) |
| --accent-text | white |
| --accent-subtle | golden-50 (#FEFCE8) |

Note: Accent shifts to 500 in light mode for WCAG AA contrast on white backgrounds.

### Glass Effects

**Dark:**
```css
--glass-bg: rgba(30, 41, 59, 0.6);
--glass-border: rgba(255, 255, 255, 0.08);
--glass-blur: blur(10px) saturate(150%);
```

**Light:**
```css
--glass-bg: rgba(248, 250, 252, 0.25);
--glass-border: rgba(255, 255, 255, 0.4);
--glass-blur: blur(10px) saturate(150%);
```

**Usage:**
```css
.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}
```

### Spacing

4px base grid:
- xs: 4px
- sm: 8px
- md: 12px
- lg: 16px
- xl: 24px
- 2xl: 32px

### Border Radius

- sm: 6px
- md: 8px
- lg: 12px

### Shadows

- sm: `0 1px 2px rgba(0, 0, 0, 0.05)`
- md: `0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)`
- lg: `0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`

### Typography

- Sans: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Mono: `"SF Mono", SFMono-Regular, ui-monospace, "Cascadia Code", Menlo, Monaco, Consolas, monospace`
- Weight 500: interactive elements
- Weight 600: headings

### Transitions

- fast: 0.15s ease (hover, focus, toggle)
- base: 0.2s ease (modal, slide)
- slow: 0.25s ease (progress bars)

---

## Component Architecture

### Shared UI Components (Bits UI)

```
lib/components/ui/
  Button.svelte        — primary, secondary, ghost, danger variants
  Input.svelte         — text input with label, error state
  Textarea.svelte      — auto-resizing, character count
  Select.svelte        — dropdown with Bits UI Select primitive
  Dialog.svelte        — confirmation modals
  Tabs.svelte          — mode selector, settings sections
  Badge.svelte         — job count, status indicators
  Tooltip.svelte       — icon button labels
  Card.svelte          — glass card wrapper with expand capability
  ProgressBar.svelte   — Golden Hour fill, smooth animation
```

### Feature Components

```
lib/components/
  Header.svelte         — titlebar: logo, nav to settings, active job badge, theme toggle (Lucide icons)
  ModeSelector.svelte   — T2I/I2I tabs (uses ui/Tabs)
  PromptForm.svelte     — SHARED form shell: controls row (size, ratio, temp), cost estimate, generate button
  PromptInput.svelte    — textarea with queue behavior (Enter=add to queue, Shift+Enter=submit all)
  ImageDropZone.svelte  — drag & drop with golden glow effect
  ImageChip.svelte      — uploaded file preview with remove button
  JobCard.svelte        — status indicator, metadata, expand-in-place results
  JobList.svelte        — sorted list of JobCards
  ResultGallery.svelte  — expanded image grid inside a JobCard (download, prompt overlay)
  EmptyState.svelte     — illustration/message when no jobs exist
```

### Key Refactor: PromptForm

`PromptForm.svelte` is the shared shell that both T2I and I2I compose with. It provides:
- Controls row: output size, aspect ratio, temperature (Bits UI Select)
- Cost estimate (live calculation)
- Generate button (disabled without API key)

T2I page slots `PromptInput` (multi-prompt queue with chips) into the form.
I2I page slots `ImageDropZone` + `ImageChip` list + single prompt input into the form.

This eliminates the current 163-line and 203-line near-duplicate forms.

### Routes

```
routes/
  +layout.svelte       — app shell, theme provider, CSS import
  +layout.ts           — ssr: false (Tauri requirement)
  +page.svelte         — main creation view: ModeSelector, PromptForm, JobList
  settings/
    +page.svelte       — API key, generation defaults, appearance, about
```

### Stores

```
lib/stores/
  jobs.ts      — ported from current, stricter status typing
  config.ts    — ported, add Gemini key validation via test API call
  theme.ts     — ported, data-theme attribute approach
  settings.ts  — NEW: generation defaults (size, ratio, temp), output directory
```

### Icons

Lucide via `lucide-svelte`. Replace all emoji usage:
- ⚙️ → Settings icon
- 🗑️ → Trash2 icon
- ☀️🌙💻 → Sun, Moon, Monitor icons
- ⏳ → Loader icon (animated)
- ✅ → CheckCircle icon
- ❌ → XCircle icon
- 📋 → Copy icon
- ⚠️ → AlertTriangle icon

---

## Rust Backend Changes

### What Stays Untouched

- Database initialization (`Database::new`, SQLite + WAL mode)
- DB schema (jobs, job_items, config tables + indexes)
- File upload/validation (`commands/files.rs`)
- Settings store (`commands/settings.rs`)
- App setup (`lib.rs`)
- Tauri plugin configuration (dialog, fs, log)

### Modified Commands

**`commands/jobs.rs`:**
- `create_t2i_job` — after DB insert, calls `submit_batch` to send to Gemini
- `create_i2i_job` — same, with base64-encoded images in JSONL
- `get_jobs` / `get_job` — unchanged
- `delete_job` — add `cancel_batch` call if job is active

**`commands/config.rs`:**
- `save_config` — add optional validation: test API call to Gemini to verify key works
- `get_config` / `delete_config` — unchanged

### New Module: `commands/batch.rs`

Core Gemini Batch API integration:

**`submit_batch(job_id: String)`**
1. Read job_items from DB
2. Build JSONL file: one line per item with `{"key": "item-uuid", "request": {...}}`
3. Upload JSONL via resumable upload to Gemini File API
4. Call `POST /v1beta/models/gemini-3.1-pro-preview:batchGenerateContent` with file reference
5. Store returned `batch_name` (e.g., `batches/123456`) in job record
6. Update job status to `processing`

**`poll_batch(batch_name: String)`**
1. `GET /v1beta/{batch_name}` with API key header
2. Return job state, `batchStats` (total, completed, failed counts)
3. Frontend calls this on polling interval

**`download_results(batch_name: String, job_id: String)`**
1. Get result file name from batch response (`dest.fileName`)
2. `GET /download/v1beta/{file_name}:download?alt=media`
3. Parse JSONL response — each line has response with base64 image or error
4. Save images to `results/{uuid}.png`
5. Update job_items with `output_image_path` or `error`
6. Update job status to `completed` or `failed`

**`cancel_batch(batch_name: String)`**
1. `POST /v1beta/{batch_name}:cancel`
2. Update job status to `cancelled`

### JSONL Format

**Text-to-Image:**
```json
{"key": "item-uuid", "request": {"contents": [{"parts": [{"text": "A 4K 16:9 cyberpunk cityscape at sunset"}]}], "generation_config": {"temperature": 0.7, "responseModalities": ["TEXT", "IMAGE"]}}}
```

**Image-to-Image:**
```json
{"key": "item-uuid", "request": {"contents": [{"parts": [{"text": "Transform to watercolor style"}, {"inline_data": {"mime_type": "image/png", "data": "base64..."}}]}], "generation_config": {"temperature": 0.7, "responseModalities": ["TEXT", "IMAGE"]}}}
```

Size and aspect ratio are embedded in the prompt text (e.g., "Generate a 4K 16:9 image of...") since the Gemini Batch API does not expose dedicated dimension parameters.

### Job Lifecycle

```
User submits form
  → create_t2i_job / create_i2i_job (DB records created, status: pending)
  → submit_batch (JSONL built, uploaded, batch submitted, status: processing)
  → Frontend polls poll_batch every 2s
  → Gemini returns JOB_STATE_SUCCEEDED
  → download_results (images parsed, saved, job_items updated)
  → Job status: completed, frontend shows expand-in-place results
```

**Polling behavior:**
- Frontend polls `poll_batch` every 2s while job status is `processing`
- Polling stops when batch state is SUCCEEDED, FAILED, CANCELLED, or EXPIRED
- On SUCCEEDED: automatically calls `download_results` to fetch and save images

**Retry behavior:**
- Failed jobs can be retried via the existing `submit_batch(job_id)` — it rebuilds the JSONL from the same job_items and resubmits
- No separate retry command needed

**Image output format:**
- Save as the MIME type returned by Gemini (expected PNG, but respect the response `mimeType` field)
- File extension matches MIME type

**Error states:**
- Invalid API key → test call fails at save time, clear message
- Batch submission fails → job status: failed, error on job record
- Partial failures → individual job_items marked failed with error messages
- Job expired (>48hr) → marked failed with timeout message
- Gemini returns JOB_STATE_FAILED → job status: failed

---

## UX Flow

### Main Page — Creation View

**Header:**
- App name (text, not emoji logo)
- Nav link to Settings (Lucide Settings icon)
- Active job count badge (Golden Hour)
- Theme toggle: Sun/Moon/Monitor icons

**Mode Selection:**
- Bits UI Tabs: "Text to Image" | "Image to Image"
- Persisted to localStorage

**Text-to-Image Flow:**
1. Auto-resizing textarea for prompt input
2. Enter adds prompt to queue (shown as removable chips below input)
3. Controls row: Size select, Aspect Ratio select, Temperature select
4. Live cost estimate
5. Shift+Enter or Generate button submits batch
6. New JobCard appears at top of list

**Image-to-Image Flow:**
1. ImageDropZone with golden glow on dragover (scale 1.02 + box-shadow)
2. Or click to open file picker (Tauri dialog)
3. Validation: max 20 files, 10MB each, JPEG/PNG/WebP/GIF
4. Selected images shown as ImageChip components with thumbnail + remove
5. Single prompt textarea for transformation instruction
6. Same controls row and submit flow

**Job List:**
- Sorted by created_at DESC
- Each JobCard shows: status icon, prompt (2-line clamp), metadata line (size · ratio · temp · count)

**JobCard States:**
- **Pending:** Subtle pulse, muted Golden Hour, Loader icon
- **Processing:** ProgressBar with Golden Hour fill, percentage + "3/10 items"
- **Completed:** CheckCircle icon, click-to-expand chevron, thumbnail hint
- **Failed:** XCircle icon, error message, retry button (resubmits batch)
- **Expanded:** Smooth slide transition reveals ResultGallery — image grid, each with download button and prompt overlay on hover

### Settings Page (`/settings`)

**Sections:**
- **API Key:** Input with show/hide toggle, Test & Save button (validates via Gemini API call), masked display when saved, Remove button
- **Generation Defaults:** Default output size, aspect ratio, temperature for new jobs
- **Appearance:** Theme toggle (Light / Dark / System)
- **About:** App version, links, support info

### Micro-Interactions

- Glass cards: subtle border brightness increase on hover
- Buttons: Golden Hour 300 → 400 (hover) → 500 (active) in dark mode
- Drop zone: scale(1.02) + golden box-shadow glow on dragover
- Job cards: Svelte `transition:slide` on enter
- Progress bar: width transition 0.25s ease
- Expand/collapse: Svelte `transition:slide`
- Batch completion: canvas-confetti burst (optional, personality touch)

---

## File Structure (Frontend Rebuild)

```
src/
  app.html
  app.css                            — design tokens, themes, glass utilities
  app.d.ts
  lib/
    components/
      ui/
        Button.svelte
        Input.svelte
        Textarea.svelte
        Select.svelte
        Dialog.svelte
        Tabs.svelte
        Badge.svelte
        Tooltip.svelte
        Card.svelte
        ProgressBar.svelte
        index.ts
      Header.svelte
      ModeSelector.svelte
      PromptForm.svelte
      PromptInput.svelte
      ImageDropZone.svelte
      ImageChip.svelte
      JobCard.svelte
      JobList.svelte
      ResultGallery.svelte
      EmptyState.svelte
      index.ts
    stores/
      jobs.ts
      config.ts
      theme.ts
      settings.ts
      index.ts
    utils/
      commands.ts                    — Tauri invoke wrappers
      confetti.ts                    — canvas-confetti helper
    types/
      index.ts                       — Job, JobItem, Config, etc.
  routes/
    +layout.svelte
    +layout.ts
    +page.svelte
    settings/
      +page.svelte
  tests/
    setup.ts
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Desktop shell | Tauri | 2 |
| Frontend framework | SvelteKit | 2 |
| UI primitives | Svelte | 5 |
| Component library | Bits UI | latest |
| Styling | Tailwind CSS | 4 |
| Icons | lucide-svelte | latest |
| Celebration | canvas-confetti | latest |
| Testing | Vitest + @testing-library/svelte | latest |
| Backend | Rust | stable |
| Database | SQLite (rusqlite) | 0.32 |
| HTTP | reqwest | 0.12 |
| AI Model | Gemini 3.1 Pro Preview | Batch API v1beta |

## Resolved Decisions

- **Accent primary:** Golden Hour 300 (#FCD34D) in dark mode, 500 (#F59E0B) in light mode for contrast
- **Layout:** Single column, elevated with glass cards (sidebar deferred to future version)
- **Modes:** T2I and I2I stay separate, shared via PromptForm composition
- **Icons:** Lucide via lucide-svelte
- **Results:** Expand-in-place inside JobCard
- **Settings:** Dedicated /settings route
- **Size/Aspect Ratio:** Embedded in prompt text (Gemini API has no dedicated params)
- **Polling:** 2s interval for batch status (required by Batch API design)
- **Approach:** Clean frontend rebuild, keep Rust backend, add batch.rs module
- **Confetti:** Include canvas-confetti on batch completion (personality touch, part of brand identity)
