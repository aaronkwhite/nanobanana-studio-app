# Code Review Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Address critical and important findings from the frontend, backend, and CSS code reviews — eliminate DRY violations, fix bugs, and improve security.

**Architecture:** Extract shared utilities (options, paths, predicates, CSS tokens), replace duplicated implementations with shared components, fix security gaps in save_setting and SSRF validation, and fix Svelte reactivity bugs.

**Tech Stack:** SvelteKit 2, Svelte 5 (runes), Tauri v2, Rust, TypeScript, Vitest

---

## File Structure

### New files:
- `src/lib/utils/options.ts` — shared select option arrays (sizeOptions, ratioOptions, tempOptions)
- `src/lib/utils/jobs.ts` — `isActiveJob()` predicate utility
- `src-tauri/src/paths.rs` — shared `get_results_dir`, `get_uploads_dir` path resolution

### Modified files:
- `src/lib/components/PromptForm.svelte` — import shared options
- `src/routes/settings/+page.svelte` — use `<Tabs>` component, import shared options, remove duplicated tab logic/styles
- `src/routes/+page.svelte` — fix mock toggle dev guard, fix stale settings snapshot, deduplicate submit handler
- `src/lib/components/JobCard.svelte` — fix `get(mockMode)` in `$derived`
- `src/lib/stores/jobs.ts` — use `isActiveJob()` predicate
- `src/lib/utils/mock-mode.ts` — fix toggle to use `get()`
- `src/lib/components/Header.svelte` — extract titlebar inline style to CSS utility
- `src/app.css` — add `.titlebar-glass` utility, add neutral tint tokens, add `--traffic-light-offset`
- `src-tauri/src/commands/batch.rs` — use shared paths module, fix SSRF validation, remove duplicate `get_api_key`
- `src-tauri/src/commands/files.rs` — use shared paths module
- `src-tauri/src/commands/config.rs` — add `save_setting` key allowlist, remove `#[allow(dead_code)]` from `get_api_key`
- `src-tauri/src/commands/jobs.rs` — extract `Job::from_row`, fix I2I path validation
- `src-tauri/src/lib.rs` — add `pub mod paths`

---

### Task 1: Extract shared select option arrays (Frontend DRY)

**Files:**
- Create: `src/lib/utils/options.ts`
- Modify: `src/lib/components/PromptForm.svelte:6,24-26`
- Modify: `src/routes/settings/+page.svelte:18,57-59`

- [ ] **Step 1: Create shared options module**

```typescript
// src/lib/utils/options.ts
import { OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES } from '$lib/types';
import type { OutputSize, AspectRatio } from '$lib/types';

export const sizeOptions = Object.entries(OUTPUT_SIZES).map(([value, { label }]) => ({ value: value as OutputSize, label }));
export const ratioOptions = Object.entries(ASPECT_RATIOS).map(([value, label]) => ({ value: value as AspectRatio, label }));
export const tempOptions = TEMPERATURES.map((t) => ({ value: String(t), label: t === 0 ? '0 (Precise)' : t === 1 ? '1 (Default)' : t === 2 ? '2 (Creative)' : String(t) }));
```

- [ ] **Step 2: Update PromptForm.svelte to import shared options**

Replace lines 6, 24-26: remove `OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES` from types import, remove the three `const` lines, add `import { sizeOptions, ratioOptions, tempOptions } from '$lib/utils/options';`

- [ ] **Step 3: Update settings/+page.svelte to import shared options**

Replace lines 18, 57-59: remove `OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES` from types import, remove the three `const` lines, add `import { sizeOptions, ratioOptions, tempOptions } from '$lib/utils/options';`

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run`
Expected: All 13 tests pass

- [ ] **Step 5: Commit**

```bash
git add src/lib/utils/options.ts src/lib/components/PromptForm.svelte src/routes/settings/+page.svelte
git commit -m "refactor: extract shared select option arrays to utils/options.ts"
```

---

### Task 2: Replace settings tab pill with Tabs component (Frontend DRY)

**Files:**
- Modify: `src/routes/settings/+page.svelte:2,29-45,52-55,120-139,363-383`

- [ ] **Step 1: Replace settings tab implementation with `<Tabs>` component**

**Note:** The Tabs component uses `text-[13px]` and `px-4` while the settings tabs used `text-xs` and `px-3`. The Tabs component styling is the canonical style — accept the minor size difference. The Tabs component already has `flex-1 text-center` which matches the settings intent.

In settings/+page.svelte:
- Remove `tick` import (line 2)
- Remove `settingsTabEls`, `settingsPillEl`, `settingsPillStyle` state declarations (lines 29-31)
- Remove `updateSettingsPill()` function and its `$effect` (lines 34-45)
- Import `Tabs` from `$lib/components/ui`
- Replace the entire tab navigation markup (lines 120-139) with:
  ```svelte
  <Tabs tabs={tabs} bind:value={activeTab} />
  ```
- Remove the entire `<style>` block for `.settings-tabs` and `.settings-pill` (lines 363-383) — keep only `.titlebar` rule

- [ ] **Step 2: Run tests and manually verify tabs still animate**

Run: `npx vitest run`
Expected: All tests pass. Visually verify the settings tabs still have the sliding pill animation.

- [ ] **Step 3: Commit**

```bash
git add src/routes/settings/+page.svelte
git commit -m "refactor: replace duplicated settings tab pill with Tabs component"
```

---

### Task 3: Extract shared Rust paths module (Backend DRY)

**Files:**
- Create: `src-tauri/src/paths.rs`
- Modify: `src-tauri/src/lib.rs:1`
- Modify: `src-tauri/src/commands/files.rs:10-60`
- Modify: `src-tauri/src/commands/batch.rs:14-53`
- Modify: `src-tauri/src/commands/config.rs:109-127`

- [ ] **Step 1: Create shared paths module**

```rust
// src-tauri/src/paths.rs
use crate::db::get_db;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

pub fn get_uploads_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let custom: Option<String> = conn
        .query_row(
            "SELECT value FROM config WHERE key = 'uploads_dir'",
            [],
            |row| row.get(0),
        )
        .ok();
    if let Some(dir) = custom {
        if !dir.is_empty() {
            let path = PathBuf::from(dir);
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
            return Ok(path);
        }
    }
    let default = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("uploads");
    std::fs::create_dir_all(&default).map_err(|e| e.to_string())?;
    Ok(default)
}

pub fn get_results_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    let custom: Option<String> = conn
        .query_row(
            "SELECT value FROM config WHERE key = 'results_dir'",
            [],
            |row| row.get(0),
        )
        .ok();
    if let Some(dir) = custom {
        if !dir.is_empty() {
            let path = PathBuf::from(dir);
            std::fs::create_dir_all(&path).map_err(|e| e.to_string())?;
            return Ok(path);
        }
    }
    let default = app
        .path()
        .picture_dir()
        .map_err(|e| e.to_string())?
        .join("Nana Studio");
    std::fs::create_dir_all(&default).map_err(|e| e.to_string())?;
    Ok(default)
}

pub fn get_api_key(app: &AppHandle) -> Result<String, String> {
    let db = get_db(app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.query_row(
        "SELECT value FROM config WHERE key = 'gemini_api_key'",
        [],
        |row| row.get::<_, String>(0),
    )
    .map_err(|_| "API key not configured".to_string())
}

/// MIME type from file extension. Default is `image/png` to match Gemini API expectations.
pub fn mime_from_ext(ext: &str) -> &'static str {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/png",
    }
}

pub fn validate_batch_name(name: &str) -> Result<(), String> {
    if !name.starts_with("batches/") || name.contains("..") || name.contains("://") {
        return Err("Invalid batch name format".to_string());
    }
    Ok(())
}
```

- [ ] **Step 2: Add `mod paths` to lib.rs**

Add `mod paths;` after the existing `mod models;` line and make it `pub`.

- [ ] **Step 3: Update files.rs to use shared paths**

Remove the local `get_uploads_dir` and `get_results_dir` functions (lines 10-60). Replace with `use crate::paths::{get_uploads_dir, get_results_dir, mime_from_ext};`. Update `get_image` MIME match to use `mime_from_ext`.

- [ ] **Step 4: Update batch.rs to use shared paths**

Remove the local `get_api_key` (lines 14-23) and `get_results_dir` (lines 29-53). Keep `get_app_data_dir` (lines 25-27) — it's trivial and only used locally in `submit_batch`. Replace with `use crate::paths::{get_api_key, get_results_dir, mime_from_ext, validate_batch_name};`. Update all three batch validation blocks (`poll_batch`, `download_results`, and `cancel_batch`) to use `validate_batch_name()`. This adds the `://` check to `cancel_batch` which previously lacked it. Update MIME matches to use `mime_from_ext`.

- [ ] **Step 5: Update config.rs**

Remove the `#[allow(dead_code)]` `get_api_key` function (lines 117-127). It's now in paths.rs. Remove the unused `Manager` import if no longer needed.

- [ ] **Step 6: Run cargo check**

Run: `cargo check` in `src-tauri/`
Expected: Compiles clean with no errors

- [ ] **Step 7: Commit**

```bash
git add src-tauri/src/paths.rs src-tauri/src/lib.rs src-tauri/src/commands/
git commit -m "refactor: extract shared paths, API key, MIME, and batch validation to paths.rs"
```

---

### Task 4: Security — save_setting key allowlist + I2I path validation

**Files:**
- Modify: `src-tauri/src/commands/config.rs:81-90`
- Modify: `src-tauri/src/commands/jobs.rs:184-193`

- [ ] **Step 1: Add key allowlist to save_setting**

```rust
const ALLOWED_SETTING_KEYS: &[&str] = &[
    "default_output_size",
    "default_aspect_ratio",
    "default_temperature",
    "results_dir",
    "uploads_dir",
];

#[tauri::command]
pub fn save_setting(app: AppHandle, key: String, value: String) -> Result<(), String> {
    if !ALLOWED_SETTING_KEYS.contains(&key.as_str()) {
        return Err(format!("Setting key '{}' is not allowed", key));
    }
    let db = get_db(&app);
    let conn = db.conn.lock().map_err(|e| e.to_string())?;
    conn.execute(
        "INSERT INTO config (key, value) VALUES (?1, ?2) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}
```

- [ ] **Step 2: Fix I2I path validation to use get_uploads_dir**

In `jobs.rs` line 185, replace:
```rust
let uploads_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("uploads");
```
with:
```rust
let uploads_dir = crate::paths::get_uploads_dir(&app)?;
```

- [ ] **Step 3: Run cargo check**

Run: `cargo check` in `src-tauri/`
Expected: Compiles clean

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/commands/config.rs src-tauri/src/commands/jobs.rs
git commit -m "fix: add save_setting key allowlist and fix I2I path validation"
```

---

### Task 5: Fix Svelte reactivity bugs

**Files:**
- Modify: `src/routes/+page.svelte:11,24,32,139-147`
- Modify: `src/lib/components/JobCard.svelte:14,28,43`
- Modify: `src/lib/utils/mock-mode.ts:13-21`

- [ ] **Step 1: Fix stale settings snapshot in +page.svelte**

Replace the `get(settings)` snapshot (line 24) with reactive defaults. Change:
```typescript
const defaults = get(settings);
let outputSize: OutputSize = $state(defaults.output_size);
let aspectRatio: AspectRatio = $state(defaults.aspect_ratio);
let temperature: number = $state(defaults.temperature);
```
to:
```typescript
let outputSize: OutputSize = $state('1K');
let aspectRatio: AspectRatio = $state('16:9');
let temperature: number = $state(1);
```
And add a one-time `$effect` to sync when settings load (use a guard so it only runs once, preventing overwrites if settings change on the settings page while this page is mounted):
```typescript
let settingsLoaded = false;
$effect(() => {
  const s = $settings;
  if (!settingsLoaded && s.output_size) {
    outputSize = s.output_size;
    aspectRatio = s.aspect_ratio;
    temperature = s.temperature;
    settingsLoaded = true;
  }
});
```
Remove the `get` import from `svelte/store` (line 16) if no longer used elsewhere. Check if `get(mockMode)` on line 32 can use `$mockMode` instead.

- [ ] **Step 2: Fix mock mode toggle dev guard**

Wrap the mock mode toggle (lines 139-147) in `{#if dev}...{/if}` to match the original intent from commit `ef5cb50`.

- [ ] **Step 3: Fix get(mockMode) in JobCard $derived**

In JobCard.svelte line 28, replace:
```typescript
const canExpand = $derived(isCompleted || (isFailed && get(mockMode)));
```
with:
```typescript
const canExpand = $derived(isCompleted || (isFailed && $mockMode));
```
Update line 43 similarly. Remove the `get` import from `svelte/store`. Add `$mockMode` auto-subscription (already works with `$` prefix on imported store).

- [ ] **Step 4: Fix mock-mode.ts toggle anti-pattern**

Replace the subscribe-then-unsubscribe pattern with `get()`:
```typescript
import { get } from 'svelte/store';
// ...
toggle() {
  const current = get({ subscribe });
  const next = !current;
  if (browser) localStorage.setItem(STORAGE_KEY, String(next));
  set(next);
}
```

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/routes/+page.svelte src/lib/components/JobCard.svelte src/lib/utils/mock-mode.ts
git commit -m "fix: stale settings snapshot, mock mode dev guard, and reactive mockMode in JobCard"
```

---

### Task 6: Extract isActiveJob predicate and deduplicate submit handler

**Files:**
- Create: `src/lib/utils/jobs.ts`
- Modify: `src/lib/stores/jobs.ts:16-18,72-74,141-143`
- Modify: `src/lib/components/JobCard.svelte:25`
- Modify: `src/routes/+page.svelte:52-92`

- [ ] **Step 1: Create isActiveJob utility**

```typescript
// src/lib/utils/jobs.ts
import type { Job } from '$lib/types';

export function isActiveJob(job: Job): boolean {
  return job.status === 'pending' || job.status === 'processing';
}
```

- [ ] **Step 2: Update jobs.ts store to use isActiveJob**

Import and replace the 3 occurrences of `j.status === 'pending' || j.status === 'processing'` with `isActiveJob(j)`.

- [ ] **Step 3: Update JobCard.svelte**

Replace line 25:
```typescript
const isActive = $derived(job.status === 'pending' || job.status === 'processing');
```
with:
```typescript
import { isActiveJob } from '$lib/utils/jobs';
const isActive = $derived(isActiveJob(job));
```

- [ ] **Step 4: Deduplicate submit handler in +page.svelte**

Extract the shared post-submit logic into a local helper:
```typescript
async function submitAndTrack(result: { job: Job }) {
  jobs.addJob(result.job);
  invoke('submit_batch', { jobId: result.job.id }).catch((err) => {
    console.error('Failed to submit batch:', err);
    jobs.updateJob({ ...result.job, status: 'failed' });
  });
}
```
Then call `await submitAndTrack(result)` in both the T2I and I2I branches.

- [ ] **Step 5: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 6: Commit**

```bash
git add src/lib/utils/jobs.ts src/lib/stores/jobs.ts src/lib/components/JobCard.svelte src/routes/+page.svelte
git commit -m "refactor: extract isActiveJob predicate and deduplicate submit handler"
```

---

### Task 7: Extract Job::from_row in Rust (Backend DRY)

**Files:**
- Modify: `src-tauri/src/models.rs`
- Modify: `src-tauri/src/commands/jobs.rs:29-46,66-82`

- [ ] **Step 1: Add from_row method to Job struct**

In `models.rs`, add `use rusqlite;` at the top (crate is already a dependency), then add:
```rust
impl Job {
    pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Job> {
        Ok(Job {
            id: row.get(0)?,
            status: row.get(1)?,
            mode: row.get(2)?,
            prompt: row.get(3)?,
            output_size: row.get(4)?,
            temperature: row.get(5)?,
            aspect_ratio: row.get(6)?,
            batch_job_name: row.get(7)?,
            batch_temp_file: row.get(8)?,
            total_items: row.get(9)?,
            completed_items: row.get(10)?,
            failed_items: row.get(11)?,
            created_at: row.get(12)?,
            updated_at: row.get(13)?,
        })
    }
}
```

- [ ] **Step 2: Update jobs.rs to use Job::from_row**

Replace the two identical closures in `get_jobs` (lines 29-46) and `get_job` (lines 66-82) with `Job::from_row`.

- [ ] **Step 3: Run cargo check**

Run: `cargo check` in `src-tauri/`
Expected: Compiles clean

- [ ] **Step 4: Commit**

```bash
git add src-tauri/src/models.rs src-tauri/src/commands/jobs.rs
git commit -m "refactor: extract Job::from_row to eliminate duplicate row mapping"
```

---

### Task 8: CSS token cleanup — titlebar glass utility and neutral tints

**Files:**
- Modify: `src/app.css`
- Modify: `src/lib/components/Header.svelte:13-14`
- Modify: `src/routes/settings/+page.svelte:102-103`
- Modify: `src/lib/components/ui/Button.svelte`
- Modify: `src/lib/components/ui/Select.svelte`
- Modify: `src/lib/components/ImageDropZone.svelte`

- [ ] **Step 1: Add CSS tokens and titlebar-glass utility to app.css**

Add to `:root`:
```css
--traffic-light-offset: 86px;
--neutral-tint: rgba(128, 128, 128, 0.06);
--neutral-tint-strong: rgba(128, 128, 128, 0.08);
--neutral-border: rgba(128, 128, 128, 0.12);
--neutral-border-hover: rgba(128, 128, 128, 0.2);
```

Add utility after `.glass`:
```css
.titlebar-glass {
  background: var(--titlebar-bg, var(--glass-bg));
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  border-bottom: 1px solid var(--glass-border);
}
```

- [ ] **Step 2: Update Header.svelte and settings titlebar**

Replace inline `style` attributes with the `.titlebar-glass` class on both titlebars. Replace `style="width: 86px;"` and `style="padding-left: 86px;"` with `style="width: var(--traffic-light-offset);"` and `style="padding-left: var(--traffic-light-offset);"`.

- [ ] **Step 3: Replace hardcoded rgba values in components**

In Button.svelte, Select.svelte — replace `rgba(128,128,128,...)` values only (NOT `rgba(0,0,0,...)` values which serve a different purpose):
- `rgba(128,128,128,0.06)` → `var(--neutral-tint)`
- `rgba(128,128,128,0.08)` → `var(--neutral-tint-strong)`
- `rgba(128,128,128,0.12)` → `var(--neutral-border)`
- `rgba(128,128,128,0.2)` → `var(--neutral-border-hover)`

Leave `rgba(0,0,0,0.06)` in Button.svelte secondary border unchanged — it uses black for a subtly different effect.

In ImageDropZone.svelte — replace `rgba(237, 100, 166, 0.15)` with `var(--accent-glow)` or a new `--accent-tint-active` token.

- [ ] **Step 4: Run tests and visually verify**

Run: `npx vitest run`
Expected: All tests pass. Visual appearance should be unchanged.

- [ ] **Step 5: Commit**

```bash
git add src/app.css src/lib/components/Header.svelte src/routes/settings/+page.svelte src/lib/components/ui/Button.svelte src/lib/components/ui/Select.svelte src/lib/components/ImageDropZone.svelte
git commit -m "refactor: extract CSS tokens for titlebar glass, neutral tints, and traffic light offset"
```

---

### Task 9: Update CHANGELOG and version bump

**Files:**
- Modify: `CHANGELOG.md`
- Modify: `package.json`
- Modify: `src-tauri/Cargo.toml`
- Modify: `src-tauri/tauri.conf.json`

- [ ] **Step 1: Update CHANGELOG with refactor summary**

Add `[0.4.2]` entry summarizing the cleanup: shared utilities extracted, security fixes, reactivity bug fixes, CSS token cleanup.

- [ ] **Step 2: Bump versions to 0.4.2**

Update in `package.json`, `src-tauri/Cargo.toml`, and `src-tauri/tauri.conf.json`.

- [ ] **Step 3: Final test run**

Run: `npx vitest run` and `cargo check` in `src-tauri/`
Expected: All tests pass, Rust compiles clean.

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md package.json src-tauri/Cargo.toml src-tauri/tauri.conf.json
git commit -m "chore: version bump to 0.4.2 with code review cleanup"
```
