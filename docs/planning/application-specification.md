# Nanobanana Studio - Tauri + SvelteKit Migration Specifications

Based on thorough analysis of the Next.js application at `~/Apps/nanobanana-batch-uploader`.

---

## 1. Database Schema

### Primary Tables

#### `jobs` Table
```sql
CREATE TABLE jobs (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'pending',
  mode TEXT NOT NULL DEFAULT 'text-to-image',
  prompt TEXT NOT NULL,
  output_size TEXT NOT NULL DEFAULT '1K',
  temperature REAL NOT NULL DEFAULT 1,
  aspect_ratio TEXT NOT NULL DEFAULT '1:1',
  batch_job_name TEXT,
  batch_temp_file TEXT,
  total_items INTEGER NOT NULL DEFAULT 0,
  completed_items INTEGER NOT NULL DEFAULT 0,
  failed_items INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
)
```

**Columns:**
- `id`: UUID primary key
- `status`: One of `'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'`
- `mode`: Either `'text-to-image'` or `'image-to-image'`
- `prompt`: Main prompt text (first prompt in queue for T2I, transformation prompt for I2I)
- `output_size`: One of `'1K' | '2K' | '4K'`
- `temperature`: Float 0-2 (0, 0.5, 1, 1.5, 2) - controls creativity
- `aspect_ratio`: One of `'1:1' | '16:9' | '9:16' | '4:3' | '3:4'`
- `batch_job_name`: External Gemini Batch API job identifier
- `batch_temp_file`: Path to temporary JSONL file used for submission
- `total_items`: Count of job items in batch
- `completed_items`: Count of successfully processed items
- `failed_items`: Count of failed items
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp

#### `job_items` Table
```sql
CREATE TABLE job_items (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL,
  input_prompt TEXT,
  input_image_path TEXT,
  output_image_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  error TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
)
```

**Columns:**
- `id`: UUID primary key
- `job_id`: Foreign key to jobs table
- `input_prompt`: Prompt text (for T2I jobs) or null
- `input_image_path`: Path to input image file (for I2I jobs) or null
- `output_image_path`: Path to generated result image after completion
- `status`: One of `'pending' | 'processing' | 'completed' | 'failed'`
- `error`: Error message if status is failed, null otherwise
- `created_at`: ISO timestamp
- `updated_at`: ISO timestamp

### Indexes
- `idx_job_items_job_id` on `job_items(job_id)`
- `idx_job_items_status` on `job_items(status)`
- `idx_jobs_status` on `jobs(status)`

### Database Configuration
- Use SQLite with WAL (Write-Ahead Logging) mode enabled: `PRAGMA journal_mode = WAL`
- Location: App data directory (Tauri's `appDataDir`)
- File-based persistence

---

## 2. Tauri Commands (replacing Next.js API routes)

### Job Commands

#### `get_jobs`
**Purpose:** Fetch list of jobs
**Parameters:**
- `status` (optional): Filter by status (`'active'` or `'all'`)

**Returns:**
```rust
Vec<Job>
```

#### `get_job`
**Purpose:** Fetch specific job with all items
**Parameters:**
- `id`: Job UUID

**Returns:**
```rust
struct JobWithItems {
    job: Job,
    items: Vec<JobItem>,
}
```

**Behavior:** Auto-checks batch status if job is processing

#### `create_job`
**Purpose:** Create and submit new job

**Parameters (Text-to-Image):**
```rust
struct CreateT2IJob {
    prompts: Vec<String>,
    output_size: String,  // "1K" | "2K" | "4K"
    temperature: f32,     // 0, 0.5, 1, 1.5, 2
    aspect_ratio: String, // "1:1" | "16:9" | "9:16" | "4:3" | "3:4"
}
```

**Parameters (Image-to-Image):**
```rust
struct CreateI2IJob {
    prompt: String,
    image_paths: Vec<String>,
    output_size: String,
    temperature: f32,
    aspect_ratio: String,
}
```

**Returns:** `JobWithItems`

**Behavior:**
- Creates job record in database
- Creates individual job_items for each prompt/image
- Submits batch to Gemini API asynchronously
- Marks items as 'processing'

#### `delete_job`
**Purpose:** Cancel job and delete from database
**Parameters:**
- `id`: Job UUID

**Behavior:**
- Cancels Gemini batch job if still running
- Cleans up temporary JSONL files
- Deletes job and all associated items from database

### File Commands

#### `upload_images`
**Purpose:** Upload images for image-to-image transformations
**Parameters:**
- `files`: Vec of file paths from file picker

**Returns:**
```rust
Vec<UploadedFile> // { id, path, name }
```

**Constraints:**
- Allowed types: JPEG, PNG, WebP, GIF
- Max size per file: 10MB
- Max files: 20 per batch

**Storage:** Files copied to `{appDataDir}/uploads/{uuid}.{extension}`

#### `get_image`
**Purpose:** Get image for display
**Parameters:**
- `path`: Image path

**Returns:** Base64 encoded image or asset URL

### Config Commands

#### `get_config`
**Purpose:** Check if API key is configured
**Returns:**
```rust
struct ConfigStatus {
    has_key: bool,
    masked: Option<String>, // "AI**...***"
}
```

#### `save_config`
**Purpose:** Save API key
**Parameters:**
- `api_key`: String

**Validation:**
- Must start with `'AI'` (Gemini key format)
- Stored in Tauri's secure storage or config file

#### `delete_config`
**Purpose:** Remove API key

---

## 3. Gemini API Integration

### Model & Configuration
- **Model:** `gemini-3-pro-image-preview`
- **API:** google-generative-ai-rs or reqwest with REST API
- **Mode:** Batch API (async processing)
- **Cost Reduction:** 50% savings vs real-time API

### Batch Request Format (JSONL)

Each batch request is a JSONL file where each line is a separate request:

```json
{
  "key": "item-uuid",
  "request": {
    "contents": [
      {
        "role": "user",
        "parts": [
          { "text": "prompt text" },
          {
            "inlineData": {
              "data": "base64-encoded-image",
              "mimeType": "image/jpeg"
            }
          }
        ]
      }
    ],
    "generationConfig": {
      "temperature": 1,
      "responseModalities": ["IMAGE"],
      "imageConfig": {
        "imageSize": "1024x1024",
        "aspectRatio": "1:1"
      }
    }
  }
}
```

### Image Size Mappings
| Size | Square | 16:9 | 9:16 | 4:3 | 3:4 |
|------|--------|------|------|-----|-----|
| 1K | 1024x1024 | 1024x576 | 576x1024 | 1024x768 | 768x1024 |
| 2K | 2048x2048 | 2048x1152 | 1152x2048 | 2048x1536 | 1536x2048 |
| 4K | 4096x4096 | 4096x2304 | 2304x4096 | 4096x3072 | 3072x4096 |

### Batch Submission Flow

1. **Prepare JSONL file**
   - One request per item
   - Save to temp location: `{appDataDir}/temp/batch-{mode}-{timestamp}.jsonl`

2. **Upload to Gemini Files API**
   ```
   POST https://generativelanguage.googleapis.com/upload/v1beta/files
   ```

3. **Create batch job**
   ```
   POST https://generativelanguage.googleapis.com/v1beta/batches
   ```

4. **Store batch metadata**
   - Save `job.name` as `batch_job_name`
   - Save temp file path as `batch_temp_file`
   - Mark job as 'processing'

### Batch Status Polling

**Endpoint:** `GET https://generativelanguage.googleapis.com/v1beta/{batch_job_name}`

**Completed States:**
- `JOB_STATE_SUCCEEDED`: Download and process results
- `JOB_STATE_FAILED`: Mark job as failed, update items with error
- `JOB_STATE_CANCELLED`: Mark job as failed

### Results Download

1. Get results file from batch job response
2. Download JSONL results file
3. Parse line-by-line, extract base64 images
4. Save images to `{appDataDir}/results/{item-id}.png`
5. Update job_items with output path and status
6. Clean up temp JSONL file

---

## 4. Job Queue Logic

### Job States & Transitions

```
created → pending → processing → completed/failed/cancelled
```

#### State Details

| State | Description | UI Display |
|-------|-------------|------------|
| pending | Batch submitted, awaiting start | "Starting..." with spinner |
| processing | Gemini actively processing | "Generating X images..." with progress |
| completed | At least one item succeeded | Thumbnail gallery |
| failed | All items failed or batch error | Error state with retry option |
| cancelled | User cancelled | Not displayed (deleted) |

### Item States
- **pending:** Queued but not started
- **processing:** Currently being processed by Gemini
- **completed:** Successfully generated, image saved
- **failed:** Generation failed, error message stored

### Cost Calculation
```
unit_cost = {
  "1K": $0.02,
  "2K": $0.07,
  "4K": $0.12
}

total_cost = unit_cost * total_items
```

---

## 5. UI Components

### Component Hierarchy

```
App
├── Header
│   ├── Logo + Title
│   ├── Stats (images generated, cost)
│   ├── Settings Button
│   └── ThemeToggle
├── ModeSelector (Text-to-Image / Image-to-Image tabs)
├── [T2I Mode]
│   ├── TextToImageForm
│   │   ├── PromptQueue (queued prompts display)
│   │   ├── Textarea (auto-resizing, Shift+Enter to submit)
│   │   ├── Controls Row
│   │   │   ├── SizeDropdown (1K/2K/4K with prices)
│   │   │   ├── AspectRatioDropdown
│   │   │   └── TemperatureDropdown
│   │   └── SubmitButton
│   └── JobList
│       └── JobCard (per job)
├── [I2I Mode]
│   ├── ImageToImageForm
│   │   ├── DropZone (drag & drop)
│   │   ├── AttachmentChips (uploaded images)
│   │   ├── Textarea
│   │   ├── Controls Row
│   │   └── SubmitButton
│   └── JobList
│       └── JobCard (per job)
├── SettingsModal
│   ├── API Key Tab
│   ├── About Tab
│   └── Support Tab
└── ErrorToast
```

### Key Component Specs

#### TextToImageForm
- Queue system: Enter adds to queue, Shift+Enter submits all
- Auto-resize textarea (max 200px height)
- Dropdown menus with keyboard navigation
- Loading state disables form

#### ImageToImageForm
- Drag & drop with visual feedback (border highlight)
- Click to open native file picker (Tauri dialog)
- Max 20 files, 10MB each
- Preview thumbnails with remove button
- Single prompt for all images

#### JobCard States

**Processing:**
```svelte
<div class="job-card processing">
  <div class="thumbnail shimmer">
    <Spinner />
  </div>
  <div class="info">
    <span class="status">Generating {total} images...</span>
    <span class="progress">{completed}/{total}</span>
  </div>
  <button class="cancel">Cancel</button>
</div>
```

**Completed:**
```svelte
<div class="job-card completed">
  <div class="thumbnails" on:scroll={updateFades}>
    {#each items as item}
      <img src={item.output_image_path} on:click={openInViewer} />
    {/each}
  </div>
  <div class="info">
    <p class="prompt">{job.prompt}</p>
    <span class="meta">{output_size} · {aspect_ratio} · {temperature} · {count} · ${cost}</span>
  </div>
  <div class="actions">
    <button on:click={copyPrompt}>Copy</button>
    <button on:click={deleteJob}>Remove</button>
  </div>
</div>
```

#### SettingsModal
- Three tabs: API Key, About, Support
- API key input with show/hide toggle
- Masked display of existing key
- Validation feedback
- Buy Me a Coffee QR code in Support tab

#### ThemeToggle
- Dropdown: Light / Dark / System
- Persists to localStorage
- Applies via CSS class on html element

---

## 6. Settings & Configuration

### Storage Locations

| Setting | Storage | Notes |
|---------|---------|-------|
| API Key | Tauri secure storage or encrypted config | Never exposed to frontend |
| Theme | localStorage `theme` | light/dark/system |
| Mode | localStorage `nanobanana-mode` | text-to-image/image-to-image |

### Constants

```typescript
// Output sizes with prices
const OUTPUT_SIZES = {
  '1K': { label: '1K ($0.02)', price: 0.02 },
  '2K': { label: '2K ($0.07)', price: 0.07 },
  '4K': { label: '4K ($0.12)', price: 0.12 },
};

// Aspect ratios
const ASPECT_RATIOS = {
  '1:1': 'Square',
  '16:9': 'Wide',
  '9:16': 'Portrait',
  '4:3': 'Landscape',
  '3:4': 'Tall',
};

// Temperature values
const TEMPERATURES = [0, 0.5, 1, 1.5, 2];
// 0 = precise/consistent, 2 = creative/varied
```

---

## 7. File Operations

### Directory Structure

```
{appDataDir}/
├── nanobanana.db              # SQLite database
├── uploads/                   # Uploaded source images (I2I)
│   └── {uuid}.{ext}
├── results/                   # Generated output images
│   └── {uuid}.png
└── temp/                      # Temporary batch files
    └── batch-{mode}-{timestamp}.jsonl
```

### File Handling

#### Image Upload (I2I)
1. User selects files via Tauri file dialog or drag & drop
2. Validate type (JPEG, PNG, WebP, GIF) and size (<10MB)
3. Copy to `{appDataDir}/uploads/{uuid}.{ext}`
4. Return metadata for form state

#### Generated Images
- Always saved as PNG
- Path: `{appDataDir}/results/{item-id}.png`
- Served via Tauri's asset protocol or convertFileSrc

#### Cleanup
- Temp JSONL files deleted after batch completion
- Upload files persist (could add cleanup for orphaned files)
- Result files deleted when job is deleted

---

## 8. Polling & Events

### Job Status Polling

**Client-side polling:**
```typescript
const pollInterval = setInterval(async () => {
  const activeJobs = jobs.filter(j =>
    j.status === 'pending' || j.status === 'processing'
  );

  if (activeJobs.length === 0) {
    clearInterval(pollInterval);
    return;
  }

  for (const job of activeJobs) {
    const updated = await invoke('get_job', { id: job.id });
    updateJobInStore(updated);
  }
}, 2000);
```

**Alternative: Tauri Events**
- Backend emits events on job state changes
- Frontend listens and updates UI
- More efficient than polling

---

## 9. Error Handling

### Error Types

| Error | Source | Display |
|-------|--------|---------|
| API key not configured | Config check | Warning banner + settings prompt |
| Invalid file type | Upload validation | Toast notification |
| File too large | Upload validation | Toast notification |
| Batch submission failed | Gemini API | Job marked failed, error in card |
| Individual item failed | Gemini response | Item status + error message |
| Network error | Any API call | Toast with retry suggestion |

### Error Display
- Toast notifications (5 second auto-dismiss)
- Inline errors in forms
- Job card error states
- Settings modal validation feedback

---

## 10. Migration Notes for Tauri

### Key Differences from Next.js

| Feature | Next.js | Tauri |
|---------|---------|-------|
| API routes | `/api/*` handlers | Rust commands via `invoke()` |
| Database | better-sqlite3 | rusqlite |
| File paths | `process.cwd()` | `app.path.appDataDir()` |
| Environment | `.env.local` | Config file or Tauri state |
| Image serving | API route | `convertFileSrc()` or asset protocol |
| File picker | HTML input | Tauri dialog plugin |

### Security Considerations

1. **API Key Storage**
   - Use Tauri's secure storage plugin or encrypt config
   - Never expose full key to frontend

2. **File Access**
   - Use Tauri's fs plugin with appropriate permissions
   - Validate all file paths

3. **IPC Security**
   - Validate all command inputs in Rust
   - Use typed parameters

### Dependencies (Rust)

```toml
[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
rusqlite = { version = "0.32", features = ["bundled"] }
reqwest = { version = "0.12", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
tokio = { version = "1", features = ["full"] }
uuid = { version = "1", features = ["v4"] }
chrono = { version = "0.4", features = ["serde"] }
base64 = "0.22"
thiserror = "2.0"
```

### Dependencies (Frontend)

```json
{
  "dependencies": {
    "@tauri-apps/api": "^2.0.0",
    "@tauri-apps/plugin-dialog": "^2.0.0",
    "@tauri-apps/plugin-fs": "^2.0.0"
  }
}
```
