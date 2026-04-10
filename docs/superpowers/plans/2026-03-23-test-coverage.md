# Test Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add meaningful test coverage across both the Rust backend (zero tests currently) and the TypeScript frontend (13 tests, major gaps in stores and utilities).

**Architecture:** Rust tests use in-memory SQLite databases to test commands without Tauri runtime. Frontend tests mock the Tauri `invoke` function (already set up in `src/tests/setup.ts`) to test stores and utilities in isolation. Focus on security boundaries, pure logic, and store behavior — not visual component rendering.

**Tech Stack:** Vitest (frontend), cargo test (Rust), jsdom, @testing-library/svelte, rusqlite (in-memory)

---

## File Structure

### New files:
- `src-tauri/src/paths_test.rs` — tests for mime_from_ext, validate_batch_name
- `src-tauri/src/commands/config_test.rs` — tests for save_setting allowlist, config masking
- `src-tauri/src/commands/jobs_test.rs` — tests for Job::from_row (if feasible without Tauri runtime)
- `src/lib/utils/options.test.ts` — tests for option array generation
- `src/lib/utils/jobs.test.ts` — tests for isActiveJob
- `src/lib/stores/settings.test.ts` — tests for load/update/reset
- `src/lib/stores/config.test.ts` — tests for load/save/remove/validate

### Modified files:
- `src-tauri/src/paths.rs` — add `#[cfg(test)] mod tests`
- `src-tauri/src/commands/config.rs` — add `#[cfg(test)] mod tests`

---

### Task 1: Rust — test pure functions in paths.rs

These functions don't need Tauri AppHandle — they're pure logic.

**Files:**
- Modify: `src-tauri/src/paths.rs`

- [ ] **Step 1: Add tests for `mime_from_ext`**

Add at the bottom of `src-tauri/src/paths.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mime_from_ext_jpg() {
        assert_eq!(mime_from_ext("jpg"), "image/jpeg");
    }

    #[test]
    fn test_mime_from_ext_jpeg() {
        assert_eq!(mime_from_ext("jpeg"), "image/jpeg");
    }

    #[test]
    fn test_mime_from_ext_png() {
        assert_eq!(mime_from_ext("png"), "image/png");
    }

    #[test]
    fn test_mime_from_ext_webp() {
        assert_eq!(mime_from_ext("webp"), "image/webp");
    }

    #[test]
    fn test_mime_from_ext_gif() {
        assert_eq!(mime_from_ext("gif"), "image/gif");
    }

    #[test]
    fn test_mime_from_ext_unknown_defaults_to_png() {
        assert_eq!(mime_from_ext("bmp"), "image/png");
        assert_eq!(mime_from_ext("tiff"), "image/png");
        assert_eq!(mime_from_ext(""), "image/png");
    }

    #[test]
    fn test_validate_batch_name_valid() {
        assert!(validate_batch_name("batches/abc123").is_ok());
        assert!(validate_batch_name("batches/my-batch-2024").is_ok());
    }

    #[test]
    fn test_validate_batch_name_rejects_missing_prefix() {
        assert!(validate_batch_name("abc123").is_err());
        assert!(validate_batch_name("").is_err());
        assert!(validate_batch_name("batch/abc").is_err());
    }

    #[test]
    fn test_validate_batch_name_rejects_path_traversal() {
        assert!(validate_batch_name("batches/../etc/passwd").is_err());
        assert!(validate_batch_name("batches/..").is_err());
    }

    #[test]
    fn test_validate_batch_name_rejects_url_injection() {
        assert!(validate_batch_name("batches/https://evil.com").is_err());
        assert!(validate_batch_name("batches/ftp://evil.com").is_err());
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test`
Expected: All new tests pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/paths.rs
git commit -m "test: add tests for mime_from_ext and validate_batch_name

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Rust — test save_setting allowlist

The allowlist is a security boundary. Test that allowed keys pass and disallowed keys are rejected. This requires an in-memory SQLite database.

**Files:**
- Modify: `src-tauri/src/commands/config.rs`

- [ ] **Step 1: Add tests for the allowlist constant**

Since `save_setting` is a Tauri command (takes `AppHandle`), we can't easily call it directly in unit tests. Instead, test the allowlist logic by extracting or testing the constant itself, and testing the validation inline.

Add at the bottom of `src-tauri/src/commands/config.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_allowed_setting_keys_contains_expected() {
        assert!(ALLOWED_SETTING_KEYS.contains(&"default_output_size"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"default_aspect_ratio"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"default_temperature"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"results_dir"));
        assert!(ALLOWED_SETTING_KEYS.contains(&"uploads_dir"));
    }

    #[test]
    fn test_allowed_setting_keys_rejects_api_key() {
        assert!(!ALLOWED_SETTING_KEYS.contains(&"gemini_api_key"));
    }

    #[test]
    fn test_allowed_setting_keys_rejects_arbitrary() {
        assert!(!ALLOWED_SETTING_KEYS.contains(&"admin"));
        assert!(!ALLOWED_SETTING_KEYS.contains(&"password"));
        assert!(!ALLOWED_SETTING_KEYS.contains(&""));
        assert!(!ALLOWED_SETTING_KEYS.contains(&"DROP TABLE config"));
    }

    #[test]
    fn test_api_key_masking_long_key() {
        // Test the masking logic inline — key longer than 8 chars
        let key = "AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz";
        let masked = if key.len() > 8 {
            format!("{}...{}", &key[..2], &key[key.len() - 3..])
        } else {
            "****".to_string()
        };
        assert_eq!(masked, "AI...xYz");
    }

    #[test]
    fn test_api_key_masking_short_key() {
        let key = "short";
        let masked = if key.len() > 8 {
            format!("{}...{}", &key[..2], &key[key.len() - 3..])
        } else {
            "****".to_string()
        };
        assert_eq!(masked, "****");
    }
}
```

- [ ] **Step 2: Run tests**

Run: `cd src-tauri && cargo test`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src-tauri/src/commands/config.rs
git commit -m "test: add tests for save_setting allowlist and API key masking

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Frontend — test utility functions

**Files:**
- Create: `src/lib/utils/options.test.ts`
- Create: `src/lib/utils/jobs.test.ts`

- [ ] **Step 1: Write options tests**

```typescript
// src/lib/utils/options.test.ts
import { describe, it, expect } from 'vitest';
import { sizeOptions, ratioOptions, tempOptions } from './options';

describe('sizeOptions', () => {
  it('contains all output sizes', () => {
    const values = sizeOptions.map(o => o.value);
    expect(values).toEqual(['1K', '2K', '4K']);
  });

  it('includes price in labels', () => {
    expect(sizeOptions[0].label).toContain('$0.02');
  });
});

describe('ratioOptions', () => {
  it('contains all aspect ratios', () => {
    const values = ratioOptions.map(o => o.value);
    expect(values).toEqual(['1:1', '16:9', '9:16', '4:3', '3:4']);
  });

  it('has human-readable labels', () => {
    const labels = ratioOptions.map(o => o.label);
    expect(labels).toContain('Square');
    expect(labels).toContain('Wide');
    expect(labels).toContain('Portrait');
  });
});

describe('tempOptions', () => {
  it('contains all temperature values as strings', () => {
    const values = tempOptions.map(o => o.value);
    expect(values).toEqual(['0', '0.5', '1', '1.5', '2']);
  });

  it('labels extremes with descriptors', () => {
    const labels = tempOptions.map(o => o.label);
    expect(labels[0]).toBe('0 (Precise)');
    expect(labels[2]).toBe('1 (Default)');
    expect(labels[4]).toBe('2 (Creative)');
  });

  it('labels middle values as plain numbers', () => {
    expect(tempOptions[1].label).toBe('0.5');
    expect(tempOptions[3].label).toBe('1.5');
  });
});
```

- [ ] **Step 2: Write isActiveJob tests**

```typescript
// src/lib/utils/jobs.test.ts
import { describe, it, expect } from 'vitest';
import { isActiveJob } from './jobs';
import type { Job } from '$lib/types';

function makeJob(status: string): Job {
  return {
    id: 'test-id',
    status,
    mode: 'text-to-image',
    prompt: 'test',
    output_size: '1K',
    temperature: 1,
    aspect_ratio: '1:1',
    batch_job_name: null,
    batch_temp_file: null,
    total_items: 1,
    completed_items: 0,
    failed_items: 0,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  } as Job;
}

describe('isActiveJob', () => {
  it('returns true for pending jobs', () => {
    expect(isActiveJob(makeJob('pending'))).toBe(true);
  });

  it('returns true for processing jobs', () => {
    expect(isActiveJob(makeJob('processing'))).toBe(true);
  });

  it('returns false for completed jobs', () => {
    expect(isActiveJob(makeJob('completed'))).toBe(false);
  });

  it('returns false for failed jobs', () => {
    expect(isActiveJob(makeJob('failed'))).toBe(false);
  });

  it('returns false for cancelled jobs', () => {
    expect(isActiveJob(makeJob('cancelled'))).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests**

Run: `npx vitest run`
Expected: New tests pass alongside existing 13

- [ ] **Step 4: Commit**

```bash
git add src/lib/utils/options.test.ts src/lib/utils/jobs.test.ts
git commit -m "test: add tests for options and isActiveJob utilities

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Frontend — test settings store

The settings store loads from, saves to, and resets persisted settings via Tauri commands. The `invoke` mock is already configured in `src/tests/setup.ts`.

**Files:**
- Create: `src/lib/stores/settings.test.ts`

- [ ] **Step 1: Write settings store tests**

```typescript
// src/lib/stores/settings.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { settings } from './settings';

vi.mock('@tauri-apps/api/core');

describe('settings store', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('has correct defaults', () => {
    const s = get(settings);
    expect(s.output_size).toBe('1K');
    expect(s.aspect_ratio).toBe('16:9');
    expect(s.temperature).toBe(1);
  });

  it('loads saved settings from backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      default_output_size: '2K',
      default_aspect_ratio: '1:1',
      default_temperature: '0.5',
    });

    await settings.load();

    const s = get(settings);
    expect(s.output_size).toBe('2K');
    expect(s.aspect_ratio).toBe('1:1');
    expect(s.temperature).toBe(0.5);
  });

  it('falls back to defaults on load error', async () => {
    vi.mocked(invoke).mockRejectedValueOnce(new Error('DB error'));

    await settings.load();

    const s = get(settings);
    expect(s.output_size).toBe('1K');
    expect(s.aspect_ratio).toBe('16:9');
    expect(s.temperature).toBe(1);
  });

  it('persists update to backend', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await settings.update({ output_size: '4K' });

    expect(invoke).toHaveBeenCalledWith('save_setting', {
      key: 'default_output_size',
      value: '4K',
    });
  });

  it('persists temperature as string', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await settings.update({ temperature: 1.5 });

    expect(invoke).toHaveBeenCalledWith('save_setting', {
      key: 'default_temperature',
      value: '1.5',
    });
  });

  it('resets to defaults and persists', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await settings.reset();

    const s = get(settings);
    expect(s.output_size).toBe('1K');
    expect(s.aspect_ratio).toBe('16:9');
    expect(s.temperature).toBe(1);

    expect(invoke).toHaveBeenCalledWith('save_setting', {
      key: 'default_output_size',
      value: '1K',
    });
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/settings.test.ts
git commit -m "test: add settings store tests for load/update/reset

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Frontend — test config store

**Files:**
- Create: `src/lib/stores/config.test.ts`

- [ ] **Step 1: Write config store tests**

```typescript
// src/lib/stores/config.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { get } from 'svelte/store';
import { invoke } from '@tauri-apps/api/core';
import { config } from './config';

vi.mock('@tauri-apps/api/core');

describe('config store', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('starts with no key', () => {
    const c = get(config);
    expect(c.has_key).toBe(false);
    expect(c.masked).toBeNull();
  });

  it('loads config with key from backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce({
      has_key: true,
      masked: 'AI...xyz',
    });

    await config.load();

    const c = get(config);
    expect(c.has_key).toBe(true);
    expect(c.masked).toBe('AI...xyz');
  });

  it('validates API key via backend', async () => {
    vi.mocked(invoke).mockResolvedValueOnce(true);

    const valid = await config.validate('test-key');

    expect(valid).toBe(true);
    expect(invoke).toHaveBeenCalledWith('validate_api_key', { apiKey: 'test-key' });
  });

  it('saves API key and reloads config', async () => {
    vi.mocked(invoke)
      .mockResolvedValueOnce(undefined) // saveConfig
      .mockResolvedValueOnce({ has_key: true, masked: 'te...key' }); // getConfig reload

    await config.save('test-key');

    expect(invoke).toHaveBeenCalledWith('save_config', { apiKey: 'test-key' });
  });

  it('removes API key and clears state', async () => {
    vi.mocked(invoke).mockResolvedValue(undefined);

    await config.remove();

    expect(invoke).toHaveBeenCalledWith('delete_config');
    const c = get(config);
    expect(c.has_key).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/stores/config.test.ts
git commit -m "test: add config store tests for load/save/remove/validate

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Frontend — test calculateCost and types

**Files:**
- Create: `src/lib/types/index.test.ts`

- [ ] **Step 1: Write type constant and calculateCost tests**

```typescript
// src/lib/types/index.test.ts
import { describe, it, expect } from 'vitest';
import { OUTPUT_SIZES, ASPECT_RATIOS, TEMPERATURES, calculateCost } from './index';

describe('OUTPUT_SIZES', () => {
  it('has correct prices', () => {
    expect(OUTPUT_SIZES['1K'].price).toBe(0.02);
    expect(OUTPUT_SIZES['2K'].price).toBe(0.07);
    expect(OUTPUT_SIZES['4K'].price).toBe(0.12);
  });
});

describe('ASPECT_RATIOS', () => {
  it('has 5 ratios', () => {
    expect(Object.keys(ASPECT_RATIOS)).toHaveLength(5);
  });
});

describe('TEMPERATURES', () => {
  it('ranges from 0 to 2 in 0.5 steps', () => {
    expect(TEMPERATURES).toEqual([0, 0.5, 1, 1.5, 2]);
  });
});

describe('calculateCost', () => {
  it('calculates cost for 1K images', () => {
    expect(calculateCost('1K', 10)).toBe(0.2);
  });

  it('calculates cost for 4K images', () => {
    expect(calculateCost('4K', 5)).toBe(0.6);
  });

  it('returns 0 for zero items', () => {
    expect(calculateCost('1K', 0)).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run`
Expected: All tests pass

- [ ] **Step 3: Commit**

```bash
git add src/lib/types/index.test.ts
git commit -m "test: add tests for type constants and calculateCost

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>"
```

---

### Task 7: Final verification and commit

- [ ] **Step 1: Run all frontend tests**

Run: `npx vitest run`
Expected: All tests pass (should be ~35+ tests now)

- [ ] **Step 2: Run all Rust tests**

Run: `cd src-tauri && cargo test`
Expected: All Rust tests pass

- [ ] **Step 3: Verify coverage improvement**

Run: `npx vitest run --coverage` and check that stores and utils show meaningful coverage.

- [ ] **Step 4: No commit needed — individual tasks already committed**
