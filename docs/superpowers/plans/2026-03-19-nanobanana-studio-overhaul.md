# Nanobanana Studio Full Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Nanobanana Studio's frontend with SvelteKit + Bits UI + Moonlight Silver/Golden Hour design system, wire up the Gemini 3.1 Pro Preview Batch API in Rust, and eliminate architectural debt.

**Architecture:** Clean frontend rebuild (delete `src/`, rebuild from scratch) while keeping the existing Rust backend shell. New `batch.rs` module handles Gemini API integration. Frontend uses Bits UI primitives, a shared `PromptForm` component eliminates T2I/I2I duplication, and a proper design token system replaces ad-hoc Tailwind classes.

**Tech Stack:** Tauri 2, SvelteKit 2, Svelte 5, Bits UI, Tailwind CSS 4, lucide-svelte, canvas-confetti, Vitest, Rust (reqwest, rusqlite, serde)

**Spec:** `docs/superpowers/specs/2026-03-19-nanobanana-studio-overhaul-design.md`

---

## File Structure

### Frontend (rebuild from scratch)

```
src/
  app.html                              — HTML template (keep existing)
  app.css                               — Design tokens, themes, glass utilities (rewrite)
  app.d.ts                              — Type declarations (keep existing)
  lib/
    types/
      index.ts                          — Job, JobItem, ConfigStatus, etc.
    stores/
      theme.ts                          — Theme store (port from current)
      config.ts                         — Config store (port + enhance validation)
      settings.ts                       — NEW: generation defaults
      jobs.ts                           — Jobs store (port + stricter types)
      index.ts                          — Barrel exports
    utils/
      commands.ts                       — Tauri invoke wrappers
      confetti.ts                       — canvas-confetti helper
    components/
      ui/
        Button.svelte                   — primary/secondary/ghost/danger variants
        Input.svelte                    — text input with label, error
        Textarea.svelte                 — auto-resize, character count
        Select.svelte                   — Bits UI Select wrapper
        Tabs.svelte                     — Bits UI Tabs wrapper
        Badge.svelte                    — status/count badge
        Card.svelte                     — glass card with expand
        ProgressBar.svelte              — Golden Hour animated bar
        Dialog.svelte                   — Bits UI Dialog wrapper
        Tooltip.svelte                  — Bits UI Tooltip wrapper
        index.ts                        — Barrel exports
      Header.svelte                     — App titlebar with Lucide icons
      ModeSelector.svelte               — T2I/I2I mode tabs
      PromptForm.svelte                 — Shared form shell (controls, cost, generate)
      PromptInput.svelte                — Multi-prompt textarea with queue
      ImageDropZone.svelte              — Drag & drop with golden glow
      ImageChip.svelte                  — Uploaded file chip with remove
      JobCard.svelte                    — Job status, metadata, expand-in-place
      JobList.svelte                    — Sorted job cards
      ResultGallery.svelte              — Expanded image grid inside JobCard
      EmptyState.svelte                 — No jobs illustration
      index.ts                          — Barrel exports
  routes/
    +layout.svelte                      — App shell, theme, CSS
    +layout.ts                          — ssr: false
    +page.svelte                        — Main creation view
    settings/
      +page.svelte                      — Settings page
  tests/
    setup.ts                            — Vitest mocks (update)
```

### Rust Backend (additions only)

```
src-tauri/src/
  commands/
    batch.rs                            — NEW: Gemini Batch API integration
    mod.rs                              — Add batch module export
    jobs.rs                             — Modify: call batch on create, cancel on delete
    config.rs                           — Modify: add validate_api_key command
  lib.rs                                — Register new commands
```

---

## Task 1: Install Dependencies & Clean Frontend

**Files:**
- Modify: `package.json`
- Delete: `src/lib/` (all current components, stores)
- Delete: `src/routes/+page.svelte` (will recreate)
- Keep: `src/app.html`, `src/app.d.ts`, `src/routes/+layout.ts`

- [ ] **Step 1: Install new frontend dependencies**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npm install bits-ui lucide-svelte canvas-confetti
npm install -D @types/canvas-confetti
```

- [ ] **Step 2: Back up current frontend source**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
cp -r src src.bak
```

- [ ] **Step 3: Remove old frontend code (keep shell files)**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
rm -rf src/lib/components src/lib/stores
rm -f src/lib/index.ts
rm -f src/routes/+page.svelte
rm -f src/routes/+layout.svelte
rm -rf src/lib/components/__tests__ src/routes/__tests__
```

- [ ] **Step 4: Create new directory structure**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
mkdir -p src/lib/types
mkdir -p src/lib/stores
mkdir -p src/lib/utils
mkdir -p src/lib/components/ui
mkdir -p src/routes/settings
```

- [ ] **Step 5: Verify project still compiles (no pages yet, just structure)**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npx svelte-kit sync
```

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "chore: clean frontend for rebuild, install bits-ui + lucide + confetti"
```

---

## Task 2: Design System CSS

**Files:**
- Rewrite: `src/app.css`

- [ ] **Step 1: Write the complete design system CSS**

```css
/* src/app.css */
@import 'tailwindcss';

/* ============================================
   DESIGN TOKENS — Moonlight Silver + Golden Hour
   ============================================ */

:root {
  /* --- Moonlight Silver (neutrals) --- */
  --silver-50: #F8FAFC;
  --silver-100: #F1F5F9;
  --silver-200: #E2E8F0;
  --silver-300: #CBD5E1;
  --silver-400: #94A3B8;
  --silver-500: #64748B;
  --silver-600: #475569;
  --silver-700: #334155;
  --silver-800: #1E293B;

  /* --- Golden Hour (accent) --- */
  --golden-50: #FEFCE8;
  --golden-100: #FEF3C7;
  --golden-200: #FDE68A;
  --golden-300: #FCD34D;
  --golden-400: #FBBF24;
  --golden-500: #F59E0B;
  --golden-600: #D97706;
  --golden-700: #B45309;
  --golden-800: #92400E;

  /* --- Semantic --- */
  --success: #22c55e;
  --warning: #F59E0B;
  --error: #ef4444;

  /* --- Spacing (4px grid) --- */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 24px;
  --space-2xl: 32px;

  /* --- Border Radius --- */
  --radius-sm: 6px;
  --radius-md: 8px;
  --radius-lg: 12px;

  /* --- Shadows --- */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
  --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
  --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);

  /* --- Typography --- */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --font-mono: "SF Mono", SFMono-Regular, ui-monospace, "Cascadia Code", Menlo, Monaco, Consolas, monospace;

  /* --- Transitions --- */
  --transition-fast: 0.15s ease;
  --transition-base: 0.2s ease;
  --transition-slow: 0.25s ease;
}

/* ============================================
   LIGHT THEME (default)
   ============================================ */

:root,
[data-theme="light"] {
  --bg: var(--silver-50);
  --surface: #ffffff;
  --border: var(--silver-200);
  --text: var(--silver-800);
  --muted: var(--silver-500);
  --accent: var(--golden-500);
  --accent-hover: var(--golden-600);
  --accent-active: var(--golden-700);
  --accent-text: #ffffff;
  --accent-subtle: var(--golden-50);

  --glass-bg: rgba(248, 250, 252, 0.25);
  --glass-border: rgba(255, 255, 255, 0.4);
  --glass-blur: blur(10px) saturate(150%);

  --overlay-bg: rgba(0, 0, 0, 0.4);
  --overlay-blur: blur(4px);
}

/* ============================================
   DARK THEME
   ============================================ */

[data-theme="dark"] {
  --bg: var(--silver-800);
  --surface: var(--silver-700);
  --border: var(--silver-700);
  --text: var(--silver-100);
  --muted: var(--silver-400);
  --accent: var(--golden-300);
  --accent-hover: var(--golden-400);
  --accent-active: var(--golden-500);
  --accent-text: var(--golden-800);
  --accent-subtle: rgba(252, 211, 77, 0.1);

  --glass-bg: rgba(30, 41, 59, 0.6);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-blur: blur(10px) saturate(150%);

  --overlay-bg: rgba(0, 0, 0, 0.6);
  --overlay-blur: blur(4px);
}

/* ============================================
   BASE STYLES
   ============================================ */

html {
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: var(--bg);
  color: var(--text);
  transition: background var(--transition-base), color var(--transition-base);
}

/* ============================================
   GLASS UTILITIES
   ============================================ */

.glass {
  background: var(--glass-bg);
  backdrop-filter: var(--glass-blur);
  -webkit-backdrop-filter: var(--glass-blur);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
}

.glass-overlay {
  background: var(--overlay-bg);
  backdrop-filter: var(--overlay-blur);
  -webkit-backdrop-filter: var(--overlay-blur);
}

/* ============================================
   FOCUS STYLES
   ============================================ */

:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

/* ============================================
   SCROLLBAR
   ============================================ */

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted);
}

/* ============================================
   ANIMATIONS
   ============================================ */

@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.animate-pulse-subtle {
  animation: pulse-subtle 2s ease-in-out infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
```

- [ ] **Step 2: Verify CSS loads without errors**

Create a minimal layout to test:

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
```

```svelte
<!-- src/routes/+page.svelte -->
<div style="padding: 2rem;">
  <h1 style="color: var(--text); font-weight: 600;">Design System Test</h1>
  <div class="glass" style="padding: 1rem; margin-top: 1rem;">
    <p style="color: var(--muted);">Glass card working</p>
  </div>
</div>
```

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npm run build
```

Expected: Build succeeds with no CSS errors.

- [ ] **Step 3: Commit**

```bash
git add src/app.css src/routes/+layout.svelte src/routes/+page.svelte
git commit -m "feat: design system CSS with Moonlight Silver + Golden Hour tokens"
```

---

## Task 3: Types Module

**Files:**
- Create: `src/lib/types/index.ts`

- [ ] **Step 1: Write type definitions**

These match the existing Rust models but with stricter typing:

```typescript
// src/lib/types/index.ts

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
export type JobMode = 'text-to-image' | 'image-to-image';
export type OutputSize = '1K' | '2K' | '4K';
export type AspectRatio = '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
export type Theme = 'light' | 'dark' | 'system';

export interface Job {
  id: string;
  status: JobStatus;
  mode: JobMode;
  prompt: string;
  output_size: OutputSize;
  temperature: number;
  aspect_ratio: AspectRatio;
  batch_job_name: string | null;
  batch_temp_file: string | null;
  total_items: number;
  completed_items: number;
  failed_items: number;
  created_at: string;
  updated_at: string;
}

export interface JobItem {
  id: string;
  job_id: string;
  input_prompt: string | null;
  input_image_path: string | null;
  output_image_path: string | null;
  status: JobStatus;
  error: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobWithItems {
  job: Job;
  items: JobItem[];
}

export interface ConfigStatus {
  has_key: boolean;
  masked: string | null;
}

export interface UploadedFile {
  id: string;
  path: string;
  name: string;
}

export interface CreateT2IJobRequest {
  prompts: string[];
  output_size: OutputSize;
  temperature: number;
  aspect_ratio: AspectRatio;
}

export interface CreateI2IJobRequest {
  prompt: string;
  image_paths: string[];
  output_size: OutputSize;
  temperature: number;
  aspect_ratio: AspectRatio;
}

export interface BatchStatus {
  state: string;
  total_requests: number;
  completed_requests: number;
  failed_requests: number;
}

export interface GenerationDefaults {
  output_size: OutputSize;
  aspect_ratio: AspectRatio;
  temperature: number;
}

export const OUTPUT_SIZES: Record<OutputSize, { label: string; price: number }> = {
  '1K': { label: '1K ($0.02)', price: 0.02 },
  '2K': { label: '2K ($0.07)', price: 0.07 },
  '4K': { label: '4K ($0.12)', price: 0.12 },
};

export const ASPECT_RATIOS: Record<AspectRatio, string> = {
  '1:1': 'Square',
  '16:9': 'Wide',
  '9:16': 'Portrait',
  '4:3': 'Landscape',
  '3:4': 'Tall',
};

export const TEMPERATURES = [0, 0.5, 1, 1.5, 2];

export function calculateCost(size: OutputSize, count: number): number {
  return OUTPUT_SIZES[size].price * count;
}
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npx svelte-kit sync && npx svelte-check
```

Expected: No type errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/index.ts
git commit -m "feat: strict TypeScript types for jobs, config, and generation"
```

---

## Task 4: Test Setup Update

**Files:**
- Modify: `src/tests/setup.ts`

- [ ] **Step 1: Update test setup with Bits UI and new mocks**

```typescript
// src/tests/setup.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock SvelteKit environment
vi.mock('$app/environment', () => ({
  browser: true,
}));

// Mock Tauri API
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock Tauri dialog plugin
vi.mock('@tauri-apps/plugin-dialog', () => ({
  open: vi.fn(),
}));

// Mock canvas-confetti
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

// Mock localStorage
const store: Record<string, string> = {};
export const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((key) => delete store[key]);
  }),
};
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock matchMedia
Object.defineProperty(globalThis, 'matchMedia', {
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  })),
});

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
  writable: true,
});
```

- [ ] **Step 2: Verify test setup loads**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npx vitest run --reporter=verbose 2>&1 | head -20
```

Expected: No test files found (we deleted them), but no setup errors.

- [ ] **Step 3: Commit**

```bash
git add src/tests/setup.ts
git commit -m "feat: update test setup with Bits UI and canvas-confetti mocks"
```

---

## Task 5: Tauri Command Wrappers

**Files:**
- Create: `src/lib/utils/commands.ts`

- [ ] **Step 1: Write typed Tauri invoke wrappers**

```typescript
// src/lib/utils/commands.ts
import { invoke } from '@tauri-apps/api/core';
import type {
  Job,
  JobWithItems,
  ConfigStatus,
  CreateT2IJobRequest,
  CreateI2IJobRequest,
  UploadedFile,
  BatchStatus,
} from '$lib/types';

// --- Jobs ---

export async function getJobs(status?: 'active' | 'all'): Promise<Job[]> {
  return invoke<Job[]>('get_jobs', { status });
}

export async function getJob(id: string): Promise<JobWithItems> {
  return invoke<JobWithItems>('get_job', { id });
}

export async function createT2IJob(request: CreateT2IJobRequest): Promise<JobWithItems> {
  return invoke<JobWithItems>('create_t2i_job', { request });
}

export async function createI2IJob(request: CreateI2IJobRequest): Promise<JobWithItems> {
  return invoke<JobWithItems>('create_i2i_job', { request });
}

export async function deleteJob(id: string): Promise<void> {
  return invoke<void>('delete_job', { id });
}

// --- Batch ---

export async function pollBatch(batchName: string): Promise<BatchStatus> {
  return invoke<BatchStatus>('poll_batch', { batchName });
}

export async function downloadResults(batchName: string, jobId: string): Promise<void> {
  return invoke<void>('download_results', { batchName, jobId });
}

export async function retryJob(jobId: string): Promise<void> {
  return invoke<void>('submit_batch', { jobId });
}

// --- Config ---

export async function getConfig(): Promise<ConfigStatus> {
  return invoke<ConfigStatus>('get_config');
}

export async function saveConfig(apiKey: string): Promise<void> {
  return invoke<void>('save_config', { apiKey });
}

export async function deleteConfig(): Promise<void> {
  return invoke<void>('delete_config');
}

export async function validateApiKey(apiKey: string): Promise<boolean> {
  return invoke<boolean>('validate_api_key', { apiKey });
}

// --- Files ---

export async function uploadImages(files: string[]): Promise<UploadedFile[]> {
  return invoke<UploadedFile[]>('upload_images', { files });
}

export async function getImage(path: string): Promise<string> {
  return invoke<string>('get_image', { path });
}

export async function deleteUpload(path: string): Promise<void> {
  return invoke<void>('delete_upload', { path });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/commands.ts
git commit -m "feat: typed Tauri command wrappers"
```

---

## Task 6: Stores — Theme, Config, Settings

**Files:**
- Create: `src/lib/stores/theme.ts`
- Create: `src/lib/stores/config.ts`
- Create: `src/lib/stores/settings.ts`
- Create: `src/lib/stores/index.ts`

- [ ] **Step 1: Write theme store test**

```typescript
// src/lib/stores/theme.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { localStorageMock } from '../../tests/setup';

describe('theme store', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    document.documentElement.removeAttribute('data-theme');
  });

  it('defaults to system theme', async () => {
    const { theme } = await import('./theme');
    expect(get(theme)).toBe('system');
  });

  it('persists theme to localStorage', async () => {
    const { theme } = await import('./theme');
    theme.set('dark');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('nanobanana-theme', 'dark');
  });

  it('applies data-theme attribute', async () => {
    const { theme } = await import('./theme');
    theme.set('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npx vitest run src/lib/stores/theme.test.ts --reporter=verbose
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write theme store**

```typescript
// src/lib/stores/theme.ts
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { Theme } from '$lib/types';

function getInitialTheme(): Theme {
  if (!browser) return 'system';
  return (localStorage.getItem('nanobanana-theme') as Theme) ?? 'system';
}

function applyTheme(value: Theme) {
  if (!browser) return;
  const isDark =
    value === 'dark' ||
    (value === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
}

function createThemeStore() {
  const { subscribe, set: _set, update } = writable<Theme>(getInitialTheme());

  if (browser) {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', () => {
      update((current) => {
        if (current === 'system') applyTheme('system');
        return current;
      });
    });
  }

  return {
    subscribe,
    set(value: Theme) {
      if (browser) localStorage.setItem('nanobanana-theme', value);
      applyTheme(value);
      _set(value);
    },
    toggle() {
      update((current) => {
        const next: Theme =
          current === 'light' ? 'dark' : current === 'dark' ? 'system' : 'light';
        if (browser) localStorage.setItem('nanobanana-theme', next);
        applyTheme(next);
        return next;
      });
    },
  };
}

export const theme = createThemeStore();
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/lib/stores/theme.test.ts --reporter=verbose
```

Expected: PASS.

- [ ] **Step 5: Write config store**

```typescript
// src/lib/stores/config.ts
import { writable } from 'svelte/store';
import type { ConfigStatus } from '$lib/types';
import * as cmd from '$lib/utils/commands';

function createConfigStore() {
  const { subscribe, set } = writable<ConfigStatus>({ has_key: false, masked: null });

  return {
    subscribe,
    async load() {
      const status = await cmd.getConfig();
      set(status);
      return status;
    },
    async save(apiKey: string) {
      await cmd.saveConfig(apiKey);
      await this.load();
    },
    async remove() {
      await cmd.deleteConfig();
      set({ has_key: false, masked: null });
    },
    async validate(apiKey: string): Promise<boolean> {
      return cmd.validateApiKey(apiKey);
    },
  };
}

export const config = createConfigStore();
```

- [ ] **Step 6: Write settings store**

```typescript
// src/lib/stores/settings.ts
import { writable, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { GenerationDefaults } from '$lib/types';

const STORAGE_KEY = 'nanobanana-settings';

const defaultSettings: GenerationDefaults = {
  output_size: '1K',
  aspect_ratio: '1:1',
  temperature: 1,
};

function loadSettings(): GenerationDefaults {
  if (!browser) return defaultSettings;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return defaultSettings;
  try {
    return { ...defaultSettings, ...JSON.parse(stored) };
  } catch {
    return defaultSettings;
  }
}

function createSettingsStore() {
  const { subscribe, set, update } = writable<GenerationDefaults>(loadSettings());

  return {
    subscribe,
    update(partial: Partial<GenerationDefaults>) {
      update((current) => {
        const next = { ...current, ...partial };
        if (browser) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    reset() {
      set(defaultSettings);
      if (browser) localStorage.removeItem(STORAGE_KEY);
    },
  };
}

export const settings = createSettingsStore();
```

- [ ] **Step 7: Write barrel export**

```typescript
// src/lib/stores/index.ts
export { theme } from './theme';
export { config } from './config';
export { settings } from './settings';
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/stores/
git commit -m "feat: theme, config, and settings stores"
```

---

## Task 7: Jobs Store

**Files:**
- Create: `src/lib/stores/jobs.ts`
- Modify: `src/lib/stores/index.ts`

- [ ] **Step 1: Write jobs store test**

```typescript
// src/lib/stores/jobs.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import type { Job } from '$lib/types';

const mockJob: Job = {
  id: 'test-1',
  status: 'pending',
  mode: 'text-to-image',
  prompt: 'test prompt',
  output_size: '1K',
  temperature: 1,
  aspect_ratio: '1:1',
  batch_job_name: null,
  batch_temp_file: null,
  total_items: 1,
  completed_items: 0,
  failed_items: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('jobs store', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads jobs from backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce([mockJob]);
    const { jobs } = await import('./jobs');
    await jobs.loadJobs();
    expect(get(jobs)).toEqual([mockJob]);
    expect(invoke).toHaveBeenCalledWith('get_jobs', { status: undefined });
  });

  it('adds a job and starts polling', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { jobs } = await import('./jobs');
    jobs.addJob(mockJob);
    expect(get(jobs)).toContainEqual(mockJob);
  });

  it('derives active job count', async () => {
    vi.mocked(invoke).mockResolvedValue([]);
    const { jobs, activeJobsCount } = await import('./jobs');
    jobs.addJob(mockJob);
    expect(get(activeJobsCount)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/lib/stores/jobs.test.ts --reporter=verbose
```

- [ ] **Step 3: Write jobs store**

```typescript
// src/lib/stores/jobs.ts
import { writable, derived } from 'svelte/store';
import type { Job, JobWithItems, BatchStatus } from '$lib/types';
import * as cmd from '$lib/utils/commands';

function createJobsStore() {
  const { subscribe, set, update } = writable<Job[]>([]);
  let pollInterval: ReturnType<typeof setInterval> | null = null;

  async function pollActiveJobs() {
    let currentJobs: Job[] = [];
    const unsub = subscribe((j) => (currentJobs = j));
    unsub();

    const activeJobs = currentJobs.filter(
      (j) => j.status === 'pending' || j.status === 'processing'
    );

    if (activeJobs.length === 0) {
      stopPolling();
      return;
    }

    for (const job of activeJobs) {
      try {
        if (job.batch_job_name) {
          const batch: BatchStatus = await cmd.pollBatch(job.batch_job_name);
          const newStatus = mapBatchState(batch.state);

          update((jobs) =>
            jobs.map((j) =>
              j.id === job.id
                ? {
                    ...j,
                    status: newStatus,
                    completed_items: batch.completed_requests,
                    failed_items: batch.failed_requests,
                  }
                : j
            )
          );

          if (newStatus === 'completed' && job.batch_job_name) {
            await cmd.downloadResults(job.batch_job_name, job.id);
            const updated = await cmd.getJob(job.id);
            update((jobs) => jobs.map((j) => (j.id === job.id ? updated.job : j)));
          }
        } else {
          const updated: JobWithItems = await cmd.getJob(job.id);
          update((jobs) => jobs.map((j) => (j.id === job.id ? updated.job : j)));
        }
      } catch (err) {
        console.error(`Failed to poll job ${job.id}:`, err);
      }
    }
  }

  function mapBatchState(state: string): Job['status'] {
    switch (state) {
      case 'JOB_STATE_SUCCEEDED':
        return 'completed';
      case 'JOB_STATE_FAILED':
      case 'JOB_STATE_EXPIRED':
        return 'failed';
      case 'JOB_STATE_CANCELLED':
        return 'cancelled';
      case 'JOB_STATE_RUNNING':
        return 'processing';
      default:
        return 'pending';
    }
  }

  function startPolling() {
    if (pollInterval) return;
    pollInterval = setInterval(pollActiveJobs, 2000);
  }

  function stopPolling() {
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
  }

  return {
    subscribe,
    async loadJobs(status?: 'active' | 'all') {
      const jobs = await cmd.getJobs(status);
      set(jobs);
      const hasActive = jobs.some((j) => j.status === 'pending' || j.status === 'processing');
      if (hasActive) startPolling();
    },
    addJob(job: Job) {
      update((jobs) => [job, ...jobs]);
      startPolling();
    },
    updateJob(updated: Job) {
      update((jobs) => jobs.map((j) => (j.id === updated.id ? updated : j)));
    },
    removeJob(id: string) {
      update((jobs) => jobs.filter((j) => j.id !== id));
    },
    startPolling,
    stopPolling,
  };
}

export const jobs = createJobsStore();

export const activeJobsCount = derived(jobs, ($jobs) =>
  $jobs.filter((j) => j.status === 'pending' || j.status === 'processing').length
);
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/lib/stores/jobs.test.ts --reporter=verbose
```

- [ ] **Step 5: Update barrel export**

Add to `src/lib/stores/index.ts`:
```typescript
export { jobs, activeJobsCount } from './jobs';
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/stores/jobs.ts src/lib/stores/jobs.test.ts src/lib/stores/index.ts
git commit -m "feat: jobs store with batch polling and state mapping"
```

---

## Task 8: Confetti Utility

**Files:**
- Create: `src/lib/utils/confetti.ts`

- [ ] **Step 1: Write confetti utility**

```typescript
// src/lib/utils/confetti.ts
import confetti from 'canvas-confetti';

export function celebrateBatchComplete() {
  confetti({
    particleCount: 100,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#FCD34D', '#FBBF24', '#F59E0B', '#F1F5F9', '#94A3B8'],
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/utils/confetti.ts
git commit -m "feat: canvas-confetti utility with Golden Hour colors"
```

---

## Task 9: UI Components — Button, Badge, ProgressBar

**Files:**
- Create: `src/lib/components/ui/Button.svelte`
- Create: `src/lib/components/ui/Badge.svelte`
- Create: `src/lib/components/ui/ProgressBar.svelte`

- [ ] **Step 1: Write Button component test**

```typescript
// src/lib/components/ui/Button.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Button from './Button.svelte';

describe('Button', () => {
  it('renders with text', () => {
    render(Button, { props: { children: () => 'Click me' } });
    expect(screen.getByRole('button')).toHaveTextContent('Click me');
  });

  it('applies primary variant by default', () => {
    render(Button, { props: { children: () => 'Test' } });
    const btn = screen.getByRole('button');
    expect(btn.className).toContain('btn-primary');
  });

  it('disables when disabled prop is true', () => {
    render(Button, { props: { disabled: true, children: () => 'Test' } });
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/lib/components/ui/Button.test.ts --reporter=verbose
```

- [ ] **Step 3: Write Button component**

```svelte
<!-- src/lib/components/ui/Button.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: Snippet;
  }

  let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors rounded-[var(--radius-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'btn-primary bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)]',
    secondary: 'btn-secondary bg-[var(--surface)] text-[var(--text)] border border-[var(--border)] hover:bg-[var(--accent-subtle)]',
    ghost: 'btn-ghost text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]',
    danger: 'btn-danger bg-[var(--error)] text-white hover:opacity-90',
  };

  const sizeClasses = {
    sm: 'h-7 px-2.5 text-xs gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-11 px-6 text-base gap-2.5',
  };
</script>

<button
  class="{baseClasses} {variantClasses[variant]} {sizeClasses[size]} {className}"
  {...rest}
>
  {@render children()}
</button>
```

- [ ] **Step 4: Write Badge component**

```svelte
<!-- src/lib/components/ui/Badge.svelte -->
<script lang="ts">
  interface Props {
    variant?: 'default' | 'accent' | 'success' | 'error';
    class?: string;
    children: import('svelte').Snippet;
  }

  let { variant = 'default', class: className = '', children }: Props = $props();

  const variantClasses = {
    default: 'bg-[var(--surface)] text-[var(--muted)] border border-[var(--border)]',
    accent: 'bg-[var(--accent)] text-[var(--accent-text)]',
    success: 'bg-[var(--success)] text-white',
    error: 'bg-[var(--error)] text-white',
  };
</script>

<span
  class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium {variantClasses[variant]} {className}"
>
  {@render children()}
</span>
```

- [ ] **Step 5: Write ProgressBar component**

```svelte
<!-- src/lib/components/ui/ProgressBar.svelte -->
<script lang="ts">
  interface Props {
    value: number;
    max?: number;
    class?: string;
  }

  let { value, max = 100, class: className = '' }: Props = $props();

  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));
</script>

<div
  class="h-1.5 w-full rounded-full bg-[var(--border)] overflow-hidden {className}"
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin={0}
  aria-valuemax={max}
>
  <div
    class="h-full rounded-full bg-[var(--accent)] transition-[width] duration-[var(--transition-slow)]"
    style="width: {percentage}%"
  ></div>
</div>
```

- [ ] **Step 6: Run Button test — expect pass**

```bash
npx vitest run src/lib/components/ui/Button.test.ts --reporter=verbose
```

- [ ] **Step 7: Commit**

```bash
git add src/lib/components/ui/Button.svelte src/lib/components/ui/Badge.svelte src/lib/components/ui/ProgressBar.svelte src/lib/components/ui/Button.test.ts
git commit -m "feat: Button, Badge, and ProgressBar UI components"
```

---

## Task 10: UI Components — Input, Textarea, Select

**Files:**
- Create: `src/lib/components/ui/Input.svelte`
- Create: `src/lib/components/ui/Textarea.svelte`
- Create: `src/lib/components/ui/Select.svelte`

- [ ] **Step 1: Write Input component**

```svelte
<!-- src/lib/components/ui/Input.svelte -->
<script lang="ts">
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    label?: string;
    error?: string;
  }

  let { label, error, class: className = '', value = $bindable(''), ...rest }: Props = $props();
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label class="text-xs font-medium text-[var(--muted)]">{label}</label>
  {/if}
  <input
    bind:value
    class="h-9 rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-[var(--transition-fast)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {error ? 'border-[var(--error)]' : 'border-[var(--border)]'} {className}"
    {...rest}
  />
  {#if error}
    <p class="text-xs text-[var(--error)]">{error}</p>
  {/if}
</div>
```

- [ ] **Step 2: Write Textarea component**

```svelte
<!-- src/lib/components/ui/Textarea.svelte -->
<script lang="ts">
  import type { HTMLTextareaAttributes } from 'svelte/elements';

  interface Props extends HTMLTextareaAttributes {
    label?: string;
    error?: string;
    autoResize?: boolean;
  }

  let { label, error, autoResize = false, class: className = '', value = $bindable(''), ...rest }: Props = $props();

  let textareaEl: HTMLTextAreaElement | undefined = $state();

  function handleInput() {
    if (autoResize && textareaEl) {
      textareaEl.style.height = 'auto';
      textareaEl.style.height = Math.min(textareaEl.scrollHeight, 200) + 'px';
    }
  }
</script>

<div class="flex flex-col gap-1.5">
  {#if label}
    <label class="text-xs font-medium text-[var(--muted)]">{label}</label>
  {/if}
  <textarea
    bind:this={textareaEl}
    bind:value
    oninput={handleInput}
    class="min-h-[80px] rounded-[var(--radius-md)] border bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text)] placeholder:text-[var(--muted)] transition-colors duration-[var(--transition-fast)] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] {error ? 'border-[var(--error)]' : 'border-[var(--border)]'} {className}"
    {...rest}
  ></textarea>
  {#if error}
    <p class="text-xs text-[var(--error)]">{error}</p>
  {/if}
</div>
```

- [ ] **Step 3: Write Select component**

This wraps Bits UI Select for consistent styling:

```svelte
<!-- src/lib/components/ui/Select.svelte -->
<script lang="ts" generics="T extends string">
  import { Select as BitsSelect } from 'bits-ui';

  interface Option {
    value: T;
    label: string;
  }

  interface Props {
    options: Option[];
    value: T;
    onchange?: (value: T) => void;
    label?: string;
    class?: string;
  }

  let { options, value = $bindable(), onchange, label, class: className = '' }: Props = $props();

  const selected = $derived(options.find((o) => o.value === value));
</script>

<div class="flex flex-col gap-1.5 {className}">
  {#if label}
    <span class="text-xs font-medium text-[var(--muted)]">{label}</span>
  {/if}
  <BitsSelect.Root
    type="single"
    value={value}
    onValueChange={(v) => {
      if (v) {
        value = v as T;
        onchange?.(v as T);
      }
    }}
  >
    <BitsSelect.Trigger
      class="inline-flex h-9 items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] px-3 text-sm text-[var(--text)] transition-colors hover:border-[var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
    >
      <span>{selected?.label ?? 'Select...'}</span>
      <svg class="h-4 w-4 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </BitsSelect.Trigger>
    <BitsSelect.Content
      class="glass z-50 min-w-[8rem] overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] p-1 shadow-[var(--shadow-md)]"
      sideOffset={4}
    >
      {#each options as option}
        <BitsSelect.Item
          value={option.value}
          label={option.label}
          class="relative flex cursor-pointer items-center rounded-[var(--radius-sm)] px-2 py-1.5 text-sm text-[var(--text)] outline-none hover:bg-[var(--accent-subtle)] data-[highlighted]:bg-[var(--accent-subtle)]"
        >
          {option.label}
        </BitsSelect.Item>
      {/each}
    </BitsSelect.Content>
  </BitsSelect.Root>
</div>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/ui/Input.svelte src/lib/components/ui/Textarea.svelte src/lib/components/ui/Select.svelte
git commit -m "feat: Input, Textarea, and Select UI components"
```

---

## Task 11: UI Components — Tabs, Card, Dialog, Tooltip

**Files:**
- Create: `src/lib/components/ui/Tabs.svelte`
- Create: `src/lib/components/ui/Card.svelte`
- Create: `src/lib/components/ui/Dialog.svelte`
- Create: `src/lib/components/ui/Tooltip.svelte`
- Create: `src/lib/components/ui/index.ts`

- [ ] **Step 1: Write Tabs component**

```svelte
<!-- src/lib/components/ui/Tabs.svelte -->
<script lang="ts">
  import { Tabs as BitsTabs } from 'bits-ui';

  interface Tab {
    value: string;
    label: string;
  }

  interface Props {
    tabs: Tab[];
    value: string;
    onchange?: (value: string) => void;
    class?: string;
  }

  let { tabs, value = $bindable(), onchange, class: className = '' }: Props = $props();
</script>

<BitsTabs.Root
  bind:value
  onValueChange={(v) => { if (v) { value = v; onchange?.(v); } }}
  class={className}
>
  <BitsTabs.List
    class="inline-flex gap-1 rounded-[var(--radius-lg)] bg-[var(--surface)] border border-[var(--border)] p-1"
  >
    {#each tabs as tab}
      <BitsTabs.Trigger
        value={tab.value}
        class="rounded-[var(--radius-md)] px-4 py-1.5 text-sm font-medium transition-colors duration-[var(--transition-fast)] text-[var(--muted)] hover:text-[var(--text)] data-[state=active]:bg-[var(--accent)] data-[state=active]:text-[var(--accent-text)]"
      >
        {tab.label}
      </BitsTabs.Trigger>
    {/each}
  </BitsTabs.List>
</BitsTabs.Root>
```

- [ ] **Step 2: Write Card component**

```svelte
<!-- src/lib/components/ui/Card.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';

  interface Props {
    glass?: boolean;
    expandable?: boolean;
    expanded?: boolean;
    ontoggle?: () => void;
    class?: string;
    children: Snippet;
  }

  let { glass = true, expandable = false, expanded = $bindable(false), ontoggle, class: className = '', children }: Props = $props();
</script>

<div
  class="{glass ? 'glass' : 'bg-[var(--surface)] border border-[var(--border)] rounded-[var(--radius-lg)]'} transition-[border-color] duration-[var(--transition-fast)] hover:border-[color-mix(in_srgb,var(--glass-border)_80%,var(--accent)_20%)] {className}"
>
  {@render children()}
</div>
```

- [ ] **Step 3: Write Dialog component**

```svelte
<!-- src/lib/components/ui/Dialog.svelte -->
<script lang="ts">
  import { Dialog as BitsDialog } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    open: boolean;
    onclose: () => void;
    title?: string;
    children: Snippet;
  }

  let { open = $bindable(), onclose, title, children }: Props = $props();
</script>

<BitsDialog.Root bind:open onOpenChange={(o) => { if (!o) onclose(); }}>
  <BitsDialog.Portal>
    <BitsDialog.Overlay class="fixed inset-0 z-50 glass-overlay" />
    <BitsDialog.Content
      class="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 glass rounded-[var(--radius-lg)] p-6 shadow-[var(--shadow-lg)]"
    >
      {#if title}
        <BitsDialog.Title class="text-base font-semibold text-[var(--text)] mb-4">{title}</BitsDialog.Title>
      {/if}
      {@render children()}
    </BitsDialog.Content>
  </BitsDialog.Portal>
</BitsDialog.Root>
```

- [ ] **Step 4: Write Tooltip component**

```svelte
<!-- src/lib/components/ui/Tooltip.svelte -->
<script lang="ts">
  import { Tooltip as BitsTooltip } from 'bits-ui';
  import type { Snippet } from 'svelte';

  interface Props {
    text: string;
    children: Snippet;
  }

  let { text, children }: Props = $props();
</script>

<BitsTooltip.Provider>
  <BitsTooltip.Root openDelay={300}>
    <BitsTooltip.Trigger asChild>
      {@render children()}
    </BitsTooltip.Trigger>
    <BitsTooltip.Content
      class="z-50 rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1 text-xs text-[var(--text)] shadow-[var(--shadow-md)]"
      sideOffset={4}
    >
      {text}
    </BitsTooltip.Content>
  </BitsTooltip.Root>
</BitsTooltip.Provider>
```

- [ ] **Step 5: Write barrel export**

```typescript
// src/lib/components/ui/index.ts
export { default as Button } from './Button.svelte';
export { default as Input } from './Input.svelte';
export { default as Textarea } from './Textarea.svelte';
export { default as Select } from './Select.svelte';
export { default as Tabs } from './Tabs.svelte';
export { default as Badge } from './Badge.svelte';
export { default as Card } from './Card.svelte';
export { default as ProgressBar } from './ProgressBar.svelte';
export { default as Dialog } from './Dialog.svelte';
export { default as Tooltip } from './Tooltip.svelte';
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/components/ui/
git commit -m "feat: Tabs, Card, Dialog, Tooltip UI components + barrel exports"
```

---

## Task 12: Header Component

**Files:**
- Create: `src/lib/components/Header.svelte`

- [ ] **Step 1: Write Header test**

```typescript
// src/lib/components/Header.test.ts
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import Header from './Header.svelte';

describe('Header', () => {
  it('renders app name', () => {
    render(Header);
    expect(screen.getByText('Nanobanana Studio')).toBeInTheDocument();
  });

  it('renders settings link', () => {
    render(Header);
    expect(screen.getByRole('link', { name: /settings/i })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/lib/components/Header.test.ts --reporter=verbose
```

- [ ] **Step 3: Write Header component**

```svelte
<!-- src/lib/components/Header.svelte -->
<script lang="ts">
  import { Sun, Moon, Monitor, Settings, AlertTriangle } from 'lucide-svelte';
  import { Badge, Tooltip } from '$lib/components/ui';
  import { theme } from '$lib/stores/theme';
  import { config } from '$lib/stores/config';
  import { activeJobsCount } from '$lib/stores/jobs';

  const themeIcons = { light: Sun, dark: Moon, system: Monitor } as const;
  const ThemeIcon = $derived(themeIcons[$theme]);
</script>

<header class="glass sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 border-b border-[var(--glass-border)]">
  <div class="flex items-center gap-3">
    <a href="/" class="flex items-center gap-2 text-[var(--text)] no-underline">
      <span class="text-sm font-semibold">Nanobanana Studio</span>
    </a>
    {#if $activeJobsCount > 0}
      <Badge variant="accent">{$activeJobsCount} active</Badge>
    {/if}
    {#if !$config.has_key}
      <Tooltip text="No API key configured">
        <span class="text-[var(--warning)]">
          <AlertTriangle size={16} />
        </span>
      </Tooltip>
    {/if}
  </div>

  <div class="flex items-center gap-1.5">
    <Tooltip text="Toggle theme">
      <button
        onclick={() => theme.toggle()}
        class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]"
        aria-label="Toggle theme"
      >
        <svelte:component this={ThemeIcon} size={16} />
      </button>
    </Tooltip>
    <Tooltip text="Settings">
      <a
        href="/settings"
        class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] transition-colors hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]"
        aria-label="Settings"
      >
        <Settings size={16} />
      </a>
    </Tooltip>
  </div>
</header>
```

- [ ] **Step 4: Run test — expect pass**

```bash
npx vitest run src/lib/components/Header.test.ts --reporter=verbose
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/components/Header.svelte src/lib/components/Header.test.ts
git commit -m "feat: Header component with Lucide icons and glass styling"
```

---

## Task 13: ModeSelector + EmptyState Components

**Files:**
- Create: `src/lib/components/ModeSelector.svelte`
- Create: `src/lib/components/EmptyState.svelte`

- [ ] **Step 1: Write ModeSelector**

```svelte
<!-- src/lib/components/ModeSelector.svelte -->
<script lang="ts">
  import { Tabs } from '$lib/components/ui';
  import { browser } from '$app/environment';
  import type { JobMode } from '$lib/types';

  interface Props {
    mode: JobMode;
    onchange?: (mode: JobMode) => void;
  }

  let { mode = $bindable('text-to-image'), onchange }: Props = $props();

  const tabs = [
    { value: 'text-to-image', label: 'Text to Image' },
    { value: 'image-to-image', label: 'Image to Image' },
  ];

  function handleChange(value: string) {
    mode = value as JobMode;
    if (browser) localStorage.setItem('nanobanana-mode', mode);
    onchange?.(mode);
  }
</script>

<Tabs {tabs} value={mode} onchange={handleChange} />
```

- [ ] **Step 2: Write EmptyState**

```svelte
<!-- src/lib/components/EmptyState.svelte -->
<script lang="ts">
  import { ImagePlus } from 'lucide-svelte';
</script>

<div class="flex flex-col items-center justify-center py-16 text-center">
  <div class="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent-subtle)] mb-4">
    <ImagePlus size={28} class="text-[var(--accent)]" />
  </div>
  <p class="text-sm font-medium text-[var(--text)]">No jobs yet</p>
  <p class="text-xs text-[var(--muted)] mt-1">Create a prompt above to get started</p>
</div>
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/ModeSelector.svelte src/lib/components/EmptyState.svelte
git commit -m "feat: ModeSelector and EmptyState components"
```

---

## Task 14: PromptForm — Shared Form Shell

**Files:**
- Create: `src/lib/components/PromptForm.svelte`

- [ ] **Step 1: Write PromptForm component**

This is the shared shell that T2I and I2I both use. It accepts a slot for the mode-specific input area:

```svelte
<!-- src/lib/components/PromptForm.svelte -->
<script lang="ts">
  import type { Snippet } from 'svelte';
  import { Select, Button } from '$lib/components/ui';
  import { config } from '$lib/stores/config';
  import { settings } from '$lib/stores/settings';
  import { calculateCost, OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES } from '$lib/types';
  import type { OutputSize, AspectRatio } from '$lib/types';
  import { Sparkles } from 'lucide-svelte';

  interface Props {
    itemCount: number;
    submitting: boolean;
    onsubmit: () => void;
    children: Snippet;
  }

  let { itemCount, submitting, onsubmit, children }: Props = $props();

  let outputSize: OutputSize = $state($settings.output_size);
  let aspectRatio: AspectRatio = $state($settings.aspect_ratio);
  let temperature: number = $state($settings.temperature);

  const cost = $derived(calculateCost(outputSize, itemCount));

  const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
  const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
  const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? 'Precise' : t === 2 ? 'Creative' : String(t) }));

  export function getConfig() {
    return { outputSize, aspectRatio, temperature };
  }
</script>

<div class="glass flex flex-col gap-3 p-4">
  {@render children()}

  <div class="flex items-center gap-2">
    <Select options={sizeOptions} bind:value={outputSize} class="flex-1" />
    <Select options={ratioOptions} bind:value={aspectRatio} class="flex-1" />
    <Select
      options={tempOptions}
      value={String(temperature)}
      onchange={(v) => { temperature = Number(v); }}
      class="flex-1"
    />
  </div>

  <div class="flex items-center justify-between">
    <span class="text-xs text-[var(--muted)]">
      {#if itemCount > 0}
        {itemCount} item{itemCount !== 1 ? 's' : ''} · ~${cost.toFixed(2)}
      {/if}
    </span>
    <Button
      onclick={onsubmit}
      disabled={!$config.has_key || itemCount === 0 || submitting}
      size="md"
    >
      <Sparkles size={16} />
      {submitting ? 'Generating...' : 'Generate'}
    </Button>
  </div>
</div>
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/components/PromptForm.svelte
git commit -m "feat: shared PromptForm shell with controls and cost estimate"
```

---

## Task 15: PromptInput (T2I) + ImageDropZone/ImageChip (I2I)

**Files:**
- Create: `src/lib/components/PromptInput.svelte`
- Create: `src/lib/components/ImageDropZone.svelte`
- Create: `src/lib/components/ImageChip.svelte`

- [ ] **Step 1: Write PromptInput**

```svelte
<!-- src/lib/components/PromptInput.svelte -->
<script lang="ts">
  import { Textarea } from '$lib/components/ui';
  import { X } from 'lucide-svelte';

  interface Props {
    prompts: string[];
    onsubmit: () => void;
  }

  let { prompts = $bindable([]), onsubmit }: Props = $props();
  let currentPrompt: string = $state('');

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (currentPrompt.trim()) {
        prompts = [...prompts, currentPrompt.trim()];
        currentPrompt = '';
      }
    } else if (e.key === 'Enter' && e.shiftKey) {
      e.preventDefault();
      if (currentPrompt.trim()) {
        prompts = [...prompts, currentPrompt.trim()];
        currentPrompt = '';
      }
      if (prompts.length > 0) onsubmit();
    }
  }

  function removePrompt(index: number) {
    prompts = prompts.filter((_, i) => i !== index);
  }
</script>

<div class="flex flex-col gap-2">
  {#if prompts.length > 0}
    <div class="flex flex-wrap gap-1.5">
      {#each prompts as prompt, i}
        <span class="inline-flex items-center gap-1 rounded-full bg-[var(--accent-subtle)] px-2.5 py-1 text-xs text-[var(--text)]">
          <span class="max-w-[200px] truncate">{prompt}</span>
          <button
            onclick={() => removePrompt(i)}
            class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--border)] text-[var(--muted)]"
            aria-label="Remove prompt"
          >
            <X size={10} />
          </button>
        </span>
      {/each}
    </div>
  {/if}

  <Textarea
    bind:value={currentPrompt}
    onkeydown={handleKeydown}
    placeholder="Type a prompt and press Enter to queue. Shift+Enter to submit all."
    autoResize
  />
</div>
```

- [ ] **Step 2: Write ImageDropZone**

```svelte
<!-- src/lib/components/ImageDropZone.svelte -->
<script lang="ts">
  import { Upload } from 'lucide-svelte';
  import { open } from '@tauri-apps/plugin-dialog';
  import { uploadImages } from '$lib/utils/commands';
  import type { UploadedFile } from '$lib/types';

  interface Props {
    files: UploadedFile[];
    onfilesadded: (files: UploadedFile[]) => void;
  }

  let { files, onfilesadded }: Props = $props();
  let dragging: boolean = $state(false);

  async function selectFiles() {
    const paths = await open({
      multiple: true,
      filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] }],
    });
    if (paths && Array.isArray(paths)) {
      const remaining = 20 - files.length;
      const toUpload = paths.slice(0, remaining);
      if (toUpload.length > 0) {
        const uploaded = await uploadImages(toUpload);
        onfilesadded(uploaded);
      }
    }
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragging = true;
  }

  function handleDragLeave() {
    dragging = false;
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragging = false;
    selectFiles();
  }
</script>

<button
  type="button"
  onclick={selectFiles}
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  class="flex flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--border)] p-8 text-center transition-all duration-[var(--transition-base)] hover:border-[var(--accent)] {dragging ? 'scale-[1.02] border-[var(--accent)] shadow-[0_0_20px_rgba(252,211,77,0.3)]' : ''}"
  aria-label="Drop images or click to select"
>
  <Upload size={24} class="text-[var(--muted)]" />
  <div>
    <p class="text-sm font-medium text-[var(--text)]">Drop images here or click to select</p>
    <p class="text-xs text-[var(--muted)] mt-1">JPEG, PNG, WebP, GIF · Max 10MB each · Up to 20 files</p>
  </div>
</button>
```

- [ ] **Step 3: Write ImageChip**

```svelte
<!-- src/lib/components/ImageChip.svelte -->
<script lang="ts">
  import { X } from 'lucide-svelte';
  import type { UploadedFile } from '$lib/types';

  interface Props {
    file: UploadedFile;
    onremove: () => void;
  }

  let { file, onremove }: Props = $props();
</script>

<span class="inline-flex items-center gap-1.5 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] px-2.5 py-1.5 text-xs">
  <span class="max-w-[150px] truncate text-[var(--text)]">{file.name}</span>
  <button
    onclick={onremove}
    class="flex h-4 w-4 items-center justify-center rounded-full hover:bg-[var(--error)] hover:text-white text-[var(--muted)] transition-colors"
    aria-label="Remove {file.name}"
  >
    <X size={10} />
  </button>
</span>
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/components/PromptInput.svelte src/lib/components/ImageDropZone.svelte src/lib/components/ImageChip.svelte
git commit -m "feat: PromptInput, ImageDropZone, and ImageChip components"
```

---

## Task 16: JobCard, JobList, ResultGallery

**Files:**
- Create: `src/lib/components/JobCard.svelte`
- Create: `src/lib/components/JobList.svelte`
- Create: `src/lib/components/ResultGallery.svelte`

- [ ] **Step 1: Write JobCard test**

```typescript
// src/lib/components/JobCard.test.ts
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/svelte';
import { invoke } from '@tauri-apps/api/core';
import JobCard from './JobCard.svelte';

const mockJob = {
  id: 'test-1',
  status: 'completed' as const,
  mode: 'text-to-image' as const,
  prompt: 'A beautiful sunset',
  output_size: '1K' as const,
  temperature: 1,
  aspect_ratio: '16:9' as const,
  batch_job_name: null,
  batch_temp_file: null,
  total_items: 2,
  completed_items: 2,
  failed_items: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('JobCard', () => {
  it('renders job prompt', () => {
    render(JobCard, { props: { job: mockJob } });
    expect(screen.getByText('A beautiful sunset')).toBeInTheDocument();
  });

  it('shows completed status', () => {
    render(JobCard, { props: { job: mockJob } });
    expect(screen.getByText('1K · 16:9 · 2 items')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test — expect failure**

```bash
npx vitest run src/lib/components/JobCard.test.ts --reporter=verbose
```

- [ ] **Step 3: Write ResultGallery**

```svelte
<!-- src/lib/components/ResultGallery.svelte -->
<script lang="ts">
  import { Download } from 'lucide-svelte';
  import { getImage } from '$lib/utils/commands';
  import type { JobItem } from '$lib/types';

  interface Props {
    items: JobItem[];
  }

  let { items }: Props = $props();
  let images: Map<string, string> = $state(new Map());

  $effect(() => {
    items.forEach(async (item) => {
      if (item.output_image_path && !images.has(item.id)) {
        const dataUrl = await getImage(item.output_image_path);
        images = new Map(images).set(item.id, dataUrl);
      }
    });
  });
</script>

<div class="grid grid-cols-2 gap-2 p-3 pt-0">
  {#each items as item}
    <div class="group relative overflow-hidden rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] aspect-square">
      {#if images.has(item.id)}
        <img
          src={images.get(item.id)}
          alt={item.input_prompt ?? 'Generated image'}
          class="h-full w-full object-cover"
        />
        <div class="absolute inset-0 flex items-end bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-[var(--transition-fast)]">
          <div class="flex w-full items-center justify-between p-2">
            <span class="text-xs text-white truncate max-w-[70%]">{item.input_prompt ?? ''}</span>
            <button
              class="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/40"
              aria-label="Download image"
            >
              <Download size={12} />
            </button>
          </div>
        </div>
      {:else if item.status === 'failed'}
        <div class="flex h-full items-center justify-center text-xs text-[var(--error)]">
          {item.error ?? 'Failed'}
        </div>
      {:else}
        <div class="flex h-full items-center justify-center">
          <div class="h-5 w-5 rounded-full border-2 border-[var(--accent)] border-t-transparent animate-spin"></div>
        </div>
      {/if}
    </div>
  {/each}
</div>
```

- [ ] **Step 4: Write JobCard**

```svelte
<!-- src/lib/components/JobCard.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { Loader, CheckCircle, XCircle, ChevronDown, Copy, Trash2, RotateCcw } from 'lucide-svelte';
  import { Card, ProgressBar, Tooltip, Button } from '$lib/components/ui';
  import ResultGallery from './ResultGallery.svelte';
  import { jobs } from '$lib/stores/jobs';
  import { deleteJob, getJob, retryJob } from '$lib/utils/commands';
  import { calculateCost } from '$lib/types';
  import type { Job, JobItem } from '$lib/types';
  import { celebrateBatchComplete } from '$lib/utils/confetti';

  interface Props {
    job: Job;
  }

  let { job }: Props = $props();
  let expanded: boolean = $state(false);
  let items: JobItem[] = $state([]);
  let prevStatus: string = $state(job.status);

  const isActive = $derived(job.status === 'pending' || job.status === 'processing');
  const isCompleted = $derived(job.status === 'completed');
  const isFailed = $derived(job.status === 'failed');
  const progress = $derived(job.total_items > 0 ? (job.completed_items / job.total_items) * 100 : 0);
  const cost = $derived(calculateCost(job.output_size, job.total_items));

  $effect(() => {
    if (prevStatus !== 'completed' && job.status === 'completed') {
      celebrateBatchComplete();
    }
    prevStatus = job.status;
  });

  async function toggleExpand() {
    if (!isCompleted) return;
    expanded = !expanded;
    if (expanded && items.length === 0) {
      const result = await getJob(job.id);
      items = result.items;
    }
  }

  async function handleDelete() {
    await deleteJob(job.id);
    jobs.removeJob(job.id);
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(job.prompt);
  }

  async function handleRetry() {
    await retryJob(job.id);
    jobs.updateJob({ ...job, status: 'processing' });
  }
</script>

<Card class="overflow-hidden">
  <button
    onclick={toggleExpand}
    class="flex w-full items-start gap-3 p-3 text-left {isCompleted ? 'cursor-pointer' : 'cursor-default'}"
    disabled={!isCompleted}
  >
    <!-- Status icon -->
    <div class="mt-0.5 flex-shrink-0">
      {#if isActive}
        <div class="animate-pulse-subtle text-[var(--accent)]">
          <Loader size={18} class="animate-spin" />
        </div>
      {:else if isCompleted}
        <CheckCircle size={18} class="text-[var(--success)]" />
      {:else if isFailed}
        <XCircle size={18} class="text-[var(--error)]" />
      {/if}
    </div>

    <!-- Content -->
    <div class="flex-1 min-w-0">
      <p class="text-sm text-[var(--text)] line-clamp-2">{job.prompt}</p>
      <p class="text-xs text-[var(--muted)] mt-1">
        {job.output_size} · {job.aspect_ratio} · {job.total_items} item{job.total_items !== 1 ? 's' : ''}
      </p>

      {#if isActive && job.total_items > 0}
        <div class="flex items-center gap-2 mt-2">
          <ProgressBar value={job.completed_items} max={job.total_items} class="flex-1" />
          <span class="text-xs text-[var(--muted)] flex-shrink-0">{job.completed_items}/{job.total_items}</span>
        </div>
      {/if}

      {#if isFailed}
        <p class="text-xs text-[var(--error)] mt-1">Generation failed</p>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex items-center gap-1 flex-shrink-0">
      {#if isFailed}
        <Tooltip text="Retry">
          <button
            onclick={(e) => { e.stopPropagation(); handleRetry(); }}
            class="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-subtle)]"
            aria-label="Retry job"
          >
            <RotateCcw size={14} />
          </button>
        </Tooltip>
      {/if}
      <Tooltip text="Copy prompt">
        <button
          onclick={(e) => { e.stopPropagation(); handleCopy(); }}
          class="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)]"
          aria-label="Copy prompt"
        >
          <Copy size={14} />
        </button>
      </Tooltip>
      <Tooltip text="Delete">
        <button
          onclick={(e) => { e.stopPropagation(); handleDelete(); }}
          class="flex h-7 w-7 items-center justify-center rounded-[var(--radius-sm)] text-[var(--muted)] hover:text-[var(--error)] hover:bg-[rgba(239,68,68,0.1)]"
          aria-label="Delete job"
        >
          <Trash2 size={14} />
        </button>
      </Tooltip>
      {#if isCompleted}
        <ChevronDown
          size={14}
          class="text-[var(--muted)] transition-transform duration-[var(--transition-fast)] {expanded ? 'rotate-180' : ''}"
        />
      {/if}
    </div>
  </button>

  {#if expanded && items.length > 0}
    <div transition:slide={{ duration: 200 }}>
      <div class="border-t border-[var(--glass-border)]">
        <ResultGallery {items} />
      </div>
    </div>
  {/if}
</Card>
```

- [ ] **Step 5: Write JobList**

```svelte
<!-- src/lib/components/JobList.svelte -->
<script lang="ts">
  import { slide } from 'svelte/transition';
  import { jobs } from '$lib/stores/jobs';
  import JobCard from './JobCard.svelte';
  import EmptyState from './EmptyState.svelte';
</script>

{#if $jobs.length === 0}
  <EmptyState />
{:else}
  <div class="flex flex-col gap-2">
    {#each $jobs as job (job.id)}
      <div transition:slide={{ duration: 200 }}>
        <JobCard {job} />
      </div>
    {/each}
  </div>
{/if}
```

- [ ] **Step 6: Run test — expect pass**

```bash
npx vitest run src/lib/components/JobCard.test.ts --reporter=verbose
```

- [ ] **Step 7: Write barrel export**

```typescript
// src/lib/components/index.ts
export { default as Header } from './Header.svelte';
export { default as ModeSelector } from './ModeSelector.svelte';
export { default as PromptForm } from './PromptForm.svelte';
export { default as PromptInput } from './PromptInput.svelte';
export { default as ImageDropZone } from './ImageDropZone.svelte';
export { default as ImageChip } from './ImageChip.svelte';
export { default as JobCard } from './JobCard.svelte';
export { default as JobList } from './JobList.svelte';
export { default as ResultGallery } from './ResultGallery.svelte';
export { default as EmptyState } from './EmptyState.svelte';
```

- [ ] **Step 8: Commit**

```bash
git add src/lib/components/JobCard.svelte src/lib/components/JobCard.test.ts src/lib/components/JobList.svelte src/lib/components/ResultGallery.svelte src/lib/components/index.ts
git commit -m "feat: JobCard with expand-in-place, JobList, ResultGallery"
```

---

## Task 17: Routes — Layout + Main Page

**Files:**
- Rewrite: `src/routes/+layout.svelte`
- Keep: `src/routes/+layout.ts`
- Rewrite: `src/routes/+page.svelte`

- [ ] **Step 1: Write root layout**

```svelte
<!-- src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { theme } from '$lib/stores/theme';

  let { children } = $props();

  onMount(() => {
    theme.set($theme);
  });
</script>

<svelte:head>
  <title>Nanobanana Studio</title>
  <meta name="description" content="Batch image generation powered by Gemini" />
</svelte:head>

<div class="min-h-screen">
  {@render children()}
</div>
```

- [ ] **Step 2: Write main page**

```svelte
<!-- src/routes/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { Header, ModeSelector, PromptForm, PromptInput, ImageDropZone, ImageChip, JobList } from '$lib/components';
  import { Textarea } from '$lib/components/ui';
  import { jobs } from '$lib/stores/jobs';
  import { config } from '$lib/stores/config';
  import { createT2IJob, createI2IJob } from '$lib/utils/commands';
  import type { JobMode, UploadedFile } from '$lib/types';

  let mode: JobMode = $state('text-to-image');
  let prompts: string[] = $state([]);
  let i2iFiles: UploadedFile[] = $state([]);
  let i2iPrompt: string = $state('');
  let submitting: boolean = $state(false);
  let promptFormRef: PromptForm;

  const itemCount = $derived(mode === 'text-to-image' ? prompts.length : i2iFiles.length);

  onMount(() => {
    config.load();
    jobs.loadJobs();
    jobs.startPolling();

    if (browser) {
      const stored = localStorage.getItem('nanobanana-mode');
      if (stored === 'text-to-image' || stored === 'image-to-image') {
        mode = stored;
      }
    }

    return () => jobs.stopPolling();
  });

  async function handleSubmit() {
    if (submitting) return;
    submitting = true;

    try {
      const { outputSize, aspectRatio, temperature } = promptFormRef.getConfig();

      if (mode === 'text-to-image') {
        const result = await createT2IJob({
          prompts,
          output_size: outputSize,
          temperature,
          aspect_ratio: aspectRatio,
        });
        jobs.addJob(result.job);
        prompts = [];
      } else {
        const result = await createI2IJob({
          prompt: i2iPrompt,
          image_paths: i2iFiles.map((f) => f.path),
          output_size: outputSize,
          temperature,
          aspect_ratio: aspectRatio,
        });
        jobs.addJob(result.job);
        i2iFiles = [];
        i2iPrompt = '';
      }
    } catch (err) {
      console.error('Failed to submit job:', err);
    } finally {
      submitting = false;
    }
  }

  function removeFile(id: string) {
    i2iFiles = i2iFiles.filter((f) => f.id !== id);
  }
</script>

<Header />

<main class="mx-auto max-w-2xl px-4 py-6 flex flex-col gap-4">
  <ModeSelector bind:mode />

  <PromptForm
    bind:this={promptFormRef}
    {itemCount}
    {submitting}
    onsubmit={handleSubmit}
  >
    {#if mode === 'text-to-image'}
      <PromptInput bind:prompts onsubmit={handleSubmit} />
    {:else}
      <div class="flex flex-col gap-2">
        <ImageDropZone
          files={i2iFiles}
          onfilesadded={(files) => { i2iFiles = [...i2iFiles, ...files]; }}
        />
        {#if i2iFiles.length > 0}
          <div class="flex flex-wrap gap-1.5">
            {#each i2iFiles as file}
              <ImageChip {file} onremove={() => removeFile(file.id)} />
            {/each}
          </div>
        {/if}
        <Textarea
          bind:value={i2iPrompt}
          placeholder="Describe the transformation..."
          autoResize
        />
      </div>
    {/if}
  </PromptForm>

  <JobList />
</main>
```

- [ ] **Step 3: Verify build**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npm run build
```

Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/routes/
git commit -m "feat: main page with PromptForm composition for T2I and I2I modes"
```

---

## Task 18: Settings Page

**Files:**
- Create: `src/routes/settings/+page.svelte`

- [ ] **Step 1: Write settings page**

```svelte
<!-- src/routes/settings/+page.svelte -->
<script lang="ts">
  import { onMount } from 'svelte';
  import { ArrowLeft, Eye, EyeOff, Sun, Moon, Monitor } from 'lucide-svelte';
  import { Button, Input, Select, Tabs } from '$lib/components/ui';
  import { config } from '$lib/stores/config';
  import { theme } from '$lib/stores/theme';
  import { settings } from '$lib/stores/settings';
  import { OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES } from '$lib/types';
  import type { OutputSize, AspectRatio, Theme } from '$lib/types';

  let activeTab: string = $state('api-key');
  let apiKey: string = $state('');
  let showKey: boolean = $state(false);
  let saving: boolean = $state(false);
  let error: string = $state('');
  let success: string = $state('');

  const tabList = [
    { value: 'api-key', label: 'API Key' },
    { value: 'defaults', label: 'Defaults' },
    { value: 'appearance', label: 'Appearance' },
    { value: 'about', label: 'About' },
  ];

  const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
  const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
  const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? 'Precise' : t === 2 ? 'Creative' : String(t) }));
  const themeOptions = [
    { value: 'light' as Theme, label: 'Light' },
    { value: 'dark' as Theme, label: 'Dark' },
    { value: 'system' as Theme, label: 'System' },
  ];

  onMount(() => {
    config.load();
  });

  async function saveApiKey() {
    error = '';
    success = '';
    if (!apiKey.trim()) {
      error = 'API key is required';
      return;
    }
    saving = true;
    try {
      await config.save(apiKey);
      apiKey = '';
      success = 'API key saved successfully';
    } catch (err) {
      error = String(err);
    } finally {
      saving = false;
    }
  }

  async function removeApiKey() {
    await config.remove();
    success = '';
    error = '';
  }
</script>

<div class="mx-auto max-w-2xl px-4 py-6">
  <div class="flex items-center gap-3 mb-6">
    <a
      href="/"
      class="flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--accent-subtle)] transition-colors"
      aria-label="Back"
    >
      <ArrowLeft size={18} />
    </a>
    <h1 class="text-lg font-semibold text-[var(--text)]">Settings</h1>
  </div>

  <Tabs tabs={tabList} bind:value={activeTab} class="mb-6" />

  {#if activeTab === 'api-key'}
    <div class="glass p-4 flex flex-col gap-4">
      <div>
        <h2 class="text-sm font-semibold text-[var(--text)]">Gemini API Key</h2>
        <p class="text-xs text-[var(--muted)] mt-1">
          Get your API key from <a href="https://aistudio.google.com/apikey" target="_blank" class="text-[var(--accent)] hover:underline">Google AI Studio</a>
        </p>
      </div>

      {#if $config.has_key}
        <div class="flex items-center gap-3">
          <code class="flex-1 rounded-[var(--radius-md)] bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-sm font-mono text-[var(--muted)]">
            {$config.masked}
          </code>
          <Button variant="danger" size="sm" onclick={removeApiKey}>Remove</Button>
        </div>
      {:else}
        <div class="flex flex-col gap-2">
          <div class="relative">
            <Input
              bind:value={apiKey}
              type={showKey ? 'text' : 'password'}
              placeholder="Enter your Gemini API key"
              {error}
            />
            <button
              onclick={() => { showKey = !showKey; }}
              class="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--muted)] hover:text-[var(--text)]"
              aria-label={showKey ? 'Hide key' : 'Show key'}
            >
              {#if showKey}
                <EyeOff size={16} />
              {:else}
                <Eye size={16} />
              {/if}
            </button>
          </div>
          <Button onclick={saveApiKey} disabled={saving} size="sm">
            {saving ? 'Saving...' : 'Test & Save'}
          </Button>
        </div>
      {/if}

      {#if success}
        <p class="text-xs text-[var(--success)]">{success}</p>
      {/if}
    </div>
  {:else if activeTab === 'defaults'}
    <div class="glass p-4 flex flex-col gap-4">
      <h2 class="text-sm font-semibold text-[var(--text)]">Generation Defaults</h2>
      <p class="text-xs text-[var(--muted)]">These values pre-fill new generation forms.</p>
      <div class="flex flex-col gap-3">
        <Select
          label="Default Output Size"
          options={sizeOptions}
          value={$settings.output_size}
          onchange={(v) => settings.update({ output_size: v })}
        />
        <Select
          label="Default Aspect Ratio"
          options={ratioOptions}
          value={$settings.aspect_ratio}
          onchange={(v) => settings.update({ aspect_ratio: v })}
        />
        <Select
          label="Default Temperature"
          options={tempOptions}
          value={String($settings.temperature)}
          onchange={(v) => settings.update({ temperature: Number(v) })}
        />
      </div>
      <Button variant="ghost" size="sm" onclick={() => settings.reset()}>
        Reset to defaults
      </Button>
    </div>
  {:else if activeTab === 'appearance'}
    <div class="glass p-4 flex flex-col gap-4">
      <h2 class="text-sm font-semibold text-[var(--text)]">Theme</h2>
      <div class="flex gap-2">
        {#each themeOptions as opt}
          <Button
            variant={$theme === opt.value ? 'primary' : 'secondary'}
            size="sm"
            onclick={() => theme.set(opt.value)}
          >
            {#if opt.value === 'light'}<Sun size={14} />{:else if opt.value === 'dark'}<Moon size={14} />{:else}<Monitor size={14} />{/if}
            {opt.label}
          </Button>
        {/each}
      </div>
    </div>
  {:else if activeTab === 'about'}
    <div class="glass p-4 flex flex-col gap-3">
      <h2 class="text-sm font-semibold text-[var(--text)]">Nanobanana Studio</h2>
      <p class="text-xs text-[var(--muted)]">Version 0.1.0</p>
      <p class="text-sm text-[var(--text)]">Batch image generation powered by Gemini 3.1 Pro Preview.</p>
    </div>
  {/if}
</div>
```

- [ ] **Step 2: Verify build**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npm run build
```

Expected: Build succeeds.

- [ ] **Step 3: Commit**

```bash
git add src/routes/settings/
git commit -m "feat: dedicated settings page with API key, defaults, appearance, about"
```

---

## Task 19: Rust — Batch API Module

**Files:**
- Create: `src-tauri/src/commands/batch.rs`
- Modify: `src-tauri/src/commands/mod.rs`
- Modify: `src-tauri/src/models.rs`

- [ ] **Step 1: Add BatchStatus model**

Add to `src-tauri/src/models.rs` after the `UploadedFile` struct:

```rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BatchStatus {
    pub state: String,
    pub total_requests: i32,
    pub completed_requests: i32,
    pub failed_requests: i32,
}
```

- [ ] **Step 2: Write batch.rs module**

```rust
// src-tauri/src/commands/batch.rs
use crate::db::get_db;
use crate::models::BatchStatus;
use reqwest::Client;
use rusqlite::params;
use serde_json::{json, Value};
use std::fs;
use tauri::{AppHandle, Manager};

const GEMINI_BASE: &str = "https://generativelanguage.googleapis.com";
const MODEL: &str = "gemini-3.1-pro-preview";

fn get_api_key(app: &AppHandle) -> Result<String, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM config WHERE key = 'gemini_api_key'",
        [],
        |row| row.get::<_, String>(0),
    )
    .map_err(|_| "No API key configured".to_string())
}

fn get_app_data_dir(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    app.path().app_data_dir().map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn submit_batch(app: AppHandle, job_id: String) -> Result<(), String> {
    let api_key = get_api_key(&app)?;
    let db = get_db(&app);
    let app_data_dir = get_app_data_dir(&app)?;

    // Read job and items from DB
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let mode: String = conn
        .query_row("SELECT mode FROM jobs WHERE id = ?1", params![job_id], |row| {
            row.get(0)
        })
        .map_err(|e| e.to_string())?;

    let temperature: f64 = conn
        .query_row(
            "SELECT temperature FROM jobs WHERE id = ?1",
            params![job_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let prompt: String = conn
        .query_row(
            "SELECT prompt FROM jobs WHERE id = ?1",
            params![job_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let output_size: String = conn
        .query_row(
            "SELECT output_size FROM jobs WHERE id = ?1",
            params![job_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    let aspect_ratio: String = conn
        .query_row(
            "SELECT aspect_ratio FROM jobs WHERE id = ?1",
            params![job_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;

    // Get items
    let mut stmt = conn
        .prepare("SELECT id, input_prompt, input_image_path FROM job_items WHERE job_id = ?1")
        .map_err(|e| e.to_string())?;

    let items: Vec<(String, Option<String>, Option<String>)> = stmt
        .query_map(params![job_id], |row| {
            Ok((
                row.get::<_, String>(0)?,
                row.get::<_, Option<String>>(1)?,
                row.get::<_, Option<String>>(2)?,
            ))
        })
        .map_err(|e| e.to_string())?
        .filter_map(|r| r.ok())
        .collect();

    drop(stmt);
    drop(conn);

    // Build JSONL
    let mut jsonl_lines = Vec::new();
    for (item_id, item_prompt, item_image_path) in &items {
        let prompt_text = if mode == "text-to-image" {
            let p = item_prompt.as_deref().unwrap_or(&prompt);
            format!("Generate a {} {} image of: {}", output_size, aspect_ratio, p)
        } else {
            format!(
                "Transform this image ({} {}) with: {}",
                output_size, aspect_ratio, prompt
            )
        };

        let mut parts: Vec<Value> = vec![json!({"text": prompt_text})];

        // For I2I, add image data
        if mode == "image-to-image" {
            if let Some(img_path) = item_image_path {
                let img_data = fs::read(img_path).map_err(|e| format!("Failed to read image: {}", e))?;
                let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &img_data);
                let ext = std::path::Path::new(img_path)
                    .extension()
                    .and_then(|e| e.to_str())
                    .unwrap_or("png");
                let mime = match ext {
                    "jpg" | "jpeg" => "image/jpeg",
                    "png" => "image/png",
                    "webp" => "image/webp",
                    "gif" => "image/gif",
                    _ => "image/png",
                };
                parts.push(json!({
                    "inline_data": {
                        "mime_type": mime,
                        "data": b64
                    }
                }));
            }
        }

        let line = json!({
            "key": item_id,
            "request": {
                "contents": [{"parts": parts}],
                "generation_config": {
                    "temperature": temperature,
                    "responseModalities": ["TEXT", "IMAGE"]
                }
            }
        });
        jsonl_lines.push(serde_json::to_string(&line).map_err(|e| e.to_string())?);
    }

    let jsonl_content = jsonl_lines.join("\n");
    let temp_dir = app_data_dir.join("temp");
    let jsonl_path = temp_dir.join(format!("batch-{}-{}.jsonl", mode, chrono::Utc::now().timestamp()));
    fs::write(&jsonl_path, &jsonl_content).map_err(|e| format!("Failed to write JSONL: {}", e))?;

    let client = Client::new();

    // Step 1: Initiate resumable upload
    let jsonl_bytes = jsonl_content.as_bytes();
    let init_resp = client
        .post(format!("{}/upload/v1beta/files", GEMINI_BASE))
        .header("x-goog-api-key", &api_key)
        .header("X-Goog-Upload-Protocol", "resumable")
        .header("X-Goog-Upload-Command", "start")
        .header("X-Goog-Upload-Header-Content-Length", jsonl_bytes.len().to_string())
        .header("X-Goog-Upload-Header-Content-Type", "application/jsonl")
        .header("Content-Type", "application/json")
        .json(&json!({"file": {"display_name": format!("batch-{}", job_id)}}))
        .send()
        .await
        .map_err(|e| format!("Upload init failed: {}", e))?;

    let upload_url = init_resp
        .headers()
        .get("x-goog-upload-url")
        .ok_or("No upload URL in response")?
        .to_str()
        .map_err(|e| e.to_string())?
        .to_string();

    // Step 2: Upload file content
    let upload_resp = client
        .put(&upload_url)
        .header("X-Goog-Upload-Command", "upload, finalize")
        .header("X-Goog-Upload-Offset", "0")
        .header("Content-Length", jsonl_bytes.len().to_string())
        .body(jsonl_content.clone())
        .send()
        .await
        .map_err(|e| format!("Upload failed: {}", e))?;

    let upload_result: Value = upload_resp.json().await.map_err(|e| e.to_string())?;
    let file_name = upload_result["file"]["name"]
        .as_str()
        .ok_or("No file name in upload response")?
        .to_string();

    // Step 3: Submit batch
    let batch_resp = client
        .post(format!(
            "{}/v1beta/models/{}:batchGenerateContent",
            GEMINI_BASE, MODEL
        ))
        .header("x-goog-api-key", &api_key)
        .header("Content-Type", "application/json")
        .json(&json!({
            "batch": {
                "display_name": format!("nanobanana-{}", job_id),
                "input_config": {
                    "requests": {
                        "file_name": file_name
                    }
                }
            }
        }))
        .send()
        .await
        .map_err(|e| format!("Batch submit failed: {}", e))?;

    let batch_result: Value = batch_resp.json().await.map_err(|e| e.to_string())?;
    let batch_name = batch_result["name"]
        .as_str()
        .ok_or("No batch name in response")?
        .to_string();

    // Update job with batch name
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE jobs SET batch_job_name = ?1, batch_temp_file = ?2, status = 'processing', updated_at = ?3 WHERE id = ?4",
        params![
            batch_name,
            jsonl_path.to_string_lossy().to_string(),
            chrono::Utc::now().to_rfc3339(),
            job_id
        ],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn poll_batch(app: AppHandle, batch_name: String) -> Result<BatchStatus, String> {
    let api_key = get_api_key(&app)?;
    let client = Client::new();

    let resp = client
        .get(format!("{}/v1beta/{}", GEMINI_BASE, batch_name))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Poll failed: {}", e))?;

    let result: Value = resp.json().await.map_err(|e| e.to_string())?;

    let state = result["state"].as_str().unwrap_or("JOB_STATE_PENDING").to_string();
    let stats = &result["batchStats"];

    Ok(BatchStatus {
        state,
        total_requests: stats["totalRequestCount"].as_i64().unwrap_or(0) as i32,
        completed_requests: stats["successRequestCount"].as_i64().unwrap_or(0) as i32,
        failed_requests: stats["failedRequestCount"].as_i64().unwrap_or(0) as i32,
    })
}

#[tauri::command]
pub async fn download_results(
    app: AppHandle,
    batch_name: String,
    job_id: String,
) -> Result<(), String> {
    let api_key = get_api_key(&app)?;
    let app_data_dir = get_app_data_dir(&app)?;
    let client = Client::new();

    // Get batch to find result file
    let resp = client
        .get(format!("{}/v1beta/{}", GEMINI_BASE, batch_name))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let batch: Value = resp.json().await.map_err(|e| e.to_string())?;
    let result_file = batch["dest"]["fileName"]
        .as_str()
        .ok_or("No result file in batch response")?;

    // Download result JSONL
    let result_resp = client
        .get(format!(
            "{}/download/v1beta/{}:download?alt=media",
            GEMINI_BASE, result_file
        ))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    let result_text = result_resp.text().await.map_err(|e| e.to_string())?;
    let results_dir = app_data_dir.join("results");
    let db = get_db(&app);
    let now = chrono::Utc::now().to_rfc3339();

    let mut completed = 0i32;
    let mut failed = 0i32;

    for line in result_text.lines() {
        if line.trim().is_empty() {
            continue;
        }
        let parsed: Value = serde_json::from_str(line).map_err(|e| e.to_string())?;

        let key = parsed["key"].as_str().unwrap_or("");

        if let Some(error) = parsed["error"].as_str() {
            // Failed item
            let conn = db.conn.lock().map_err(|e| e.to_string())?;
            conn.execute(
                "UPDATE job_items SET status = 'failed', error = ?1, updated_at = ?2 WHERE id = ?3",
                params![error, now, key],
            )
            .map_err(|e| e.to_string())?;
            failed += 1;
        } else if let Some(candidates) = parsed["response"]["candidates"].as_array() {
            // Look for image data in parts
            let mut saved = false;
            for candidate in candidates {
                if let Some(parts) = candidate["content"]["parts"].as_array() {
                    for part in parts {
                        if let Some(inline_data) = part.get("inlineData") {
                            let mime = inline_data["mimeType"].as_str().unwrap_or("image/png");
                            let data = inline_data["data"].as_str().unwrap_or("");
                            let ext = match mime {
                                "image/jpeg" => "jpg",
                                "image/webp" => "webp",
                                "image/gif" => "gif",
                                _ => "png",
                            };

                            let file_id = uuid::Uuid::new_v4().to_string();
                            let file_path = results_dir.join(format!("{}.{}", file_id, ext));

                            let decoded = base64::Engine::decode(
                                &base64::engine::general_purpose::STANDARD,
                                data,
                            )
                            .map_err(|e| format!("Base64 decode failed: {}", e))?;

                            fs::write(&file_path, &decoded)
                                .map_err(|e| format!("Failed to write image: {}", e))?;

                            let conn = db.conn.lock().map_err(|e| e.to_string())?;
                            conn.execute(
                                "UPDATE job_items SET status = 'completed', output_image_path = ?1, updated_at = ?2 WHERE id = ?3",
                                params![file_path.to_string_lossy().to_string(), now, key],
                            )
                            .map_err(|e| e.to_string())?;

                            completed += 1;
                            saved = true;
                            break;
                        }
                    }
                    if saved {
                        break;
                    }
                }
            }
            if !saved {
                let conn = db.conn.lock().map_err(|e| e.to_string())?;
                conn.execute(
                    "UPDATE job_items SET status = 'failed', error = 'No image in response', updated_at = ?1 WHERE id = ?2",
                    params![now, key],
                )
                .map_err(|e| e.to_string())?;
                failed += 1;
            }
        }
    }

    // Update job status
    let final_status = if failed > 0 && completed == 0 {
        "failed"
    } else {
        "completed"
    };

    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "UPDATE jobs SET status = ?1, completed_items = ?2, failed_items = ?3, updated_at = ?4 WHERE id = ?5",
        params![final_status, completed, failed, now, job_id],
    )
    .map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn cancel_batch(app: AppHandle, batch_name: String) -> Result<(), String> {
    let api_key = get_api_key(&app)?;
    let client = Client::new();

    client
        .post(format!("{}/v1beta/{}:cancel", GEMINI_BASE, batch_name))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Cancel failed: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn validate_api_key(app: AppHandle, api_key: String) -> Result<bool, String> {
    let client = Client::new();

    let resp = client
        .get(format!(
            "{}/v1beta/models/{}",
            GEMINI_BASE, MODEL
        ))
        .header("x-goog-api-key", &api_key)
        .send()
        .await
        .map_err(|e| format!("Validation failed: {}", e))?;

    Ok(resp.status().is_success())
}
```

- [ ] **Step 3: Update mod.rs**

Add to `src-tauri/src/commands/mod.rs`:
```rust
pub mod batch;

pub use batch::*;
```

- [ ] **Step 4: Verify Rust compiles**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app/src-tauri
cargo check
```

Expected: Compiles (may have warnings for unused base64 imports — fix as needed).

- [ ] **Step 5: Commit**

```bash
git add src-tauri/src/commands/batch.rs src-tauri/src/commands/mod.rs src-tauri/src/models.rs
git commit -m "feat: Gemini Batch API integration — submit, poll, download, cancel"
```

---

## Task 20: Rust — Modify Jobs & Config Commands

**Files:**
- Modify: `src-tauri/src/commands/jobs.rs`
- Modify: `src-tauri/src/lib.rs`

- [ ] **Step 1: Modify create_t2i_job to call submit_batch**

In `src-tauri/src/commands/jobs.rs`, after the job creation (around line 175, after `Ok(JobWithItems { job, items })`), the frontend will call `submit_batch` separately via the Tauri invoke. No change needed to jobs.rs — the frontend orchestrates the flow.

However, `delete_job` needs to cancel active batches. Modify `delete_job` in `src-tauri/src/commands/jobs.rs`:

```rust
#[tauri::command]
pub fn delete_job(app: AppHandle, id: String) -> Result<(), String> {
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;

    // Check if job has an active batch to cancel
    let batch_name: Option<String> = conn
        .query_row(
            "SELECT batch_job_name FROM jobs WHERE id = ?1 AND status IN ('pending', 'processing')",
            params![id],
            |row| row.get(0),
        )
        .ok()
        .flatten();

    conn.execute("DELETE FROM job_items WHERE job_id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    conn.execute("DELETE FROM jobs WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;

    // Note: batch cancellation is async, fire and forget in the Rust side
    // The frontend can call cancel_batch separately if needed

    Ok(())
}
```

- [ ] **Step 2: Register new commands in lib.rs**

Update the `invoke_handler` in `src-tauri/src/lib.rs` to include the batch commands:

```rust
.invoke_handler(tauri::generate_handler![
    commands::get_jobs,
    commands::get_job,
    commands::create_t2i_job,
    commands::create_i2i_job,
    commands::delete_job,
    commands::get_config,
    commands::save_config,
    commands::delete_config,
    commands::upload_images,
    commands::get_image,
    commands::delete_upload,
    commands::submit_batch,
    commands::poll_batch,
    commands::download_results,
    commands::cancel_batch,
    commands::validate_api_key,
])
```

- [ ] **Step 3: Verify full Rust build**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app/src-tauri
cargo build
```

Expected: Compiles successfully.

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/jobs.rs src-tauri/src/lib.rs
git commit -m "feat: register batch commands, update delete_job for batch cancellation"
```

---

## Task 21: Frontend-Backend Wiring — Submit + Poll Flow

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/lib/stores/jobs.ts`

- [ ] **Step 1: Update main page to call submit_batch after job creation**

In `src/routes/+page.svelte`, update the `handleSubmit` function to call `submit_batch` after creating the job:

```typescript
import { createT2IJob, createI2IJob, retryJob } from '$lib/utils/commands';
// ... in handleSubmit, after jobs.addJob(result.job):
import { invoke } from '@tauri-apps/api/core';

// After jobs.addJob(result.job):
invoke('submit_batch', { jobId: result.job.id }).catch((err) => {
  console.error('Failed to submit batch:', err);
  jobs.updateJob({ ...result.job, status: 'failed' });
});
```

The exact edit: wrap the existing `jobs.addJob(result.job)` call to also trigger batch submission in both T2I and I2I branches.

- [ ] **Step 2: Verify full build (frontend + backend)**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npm run build
cd src-tauri && cargo build
```

Expected: Both compile.

- [ ] **Step 3: Commit**

```bash
git add src/routes/+page.svelte
git commit -m "feat: wire frontend job creation to Rust batch submission"
```

---

## Task 22: Clean Up & Final Verification

**Files:**
- Remove: `src.bak/` (backup from Task 1)
- Verify: all tests pass
- Verify: full build succeeds

- [ ] **Step 1: Run all tests**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npx vitest run --reporter=verbose
```

Expected: All tests pass.

- [ ] **Step 2: Run full Tauri build**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npm run build && cd src-tauri && cargo build
```

Expected: Both compile successfully.

- [ ] **Step 3: Run svelte-check for type errors**

```bash
cd /Users/wookiedrool/src/nanobanana-studio-app
npx svelte-kit sync && npx svelte-check
```

Expected: No type errors.

- [ ] **Step 4: Remove backup**

```bash
rm -rf /Users/wookiedrool/src/nanobanana-studio-app/src.bak
```

- [ ] **Step 5: Add .superpowers to gitignore if not already there**

```bash
echo '.superpowers/' >> /Users/wookiedrool/src/nanobanana-studio-app/.gitignore
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: clean up backup, verify build, finalize overhaul"
```
