# Using GasTown to Create a Tauri + SvelteKit Application

## Overview

Convert **Nanobanana Studio** (Next.js batch image generator) into a **Tauri desktop application** with **SvelteKit** frontend, managed via GasTown.

## Configuration

- **Git**: Local repository (push to remote later)
- **Frontend**: SvelteKit (static adapter for Tauri)
- **Backend**: Tauri Rust commands (replacing Next.js API routes)

## Current State

### Existing Project
- **Location**: `/Users/aaronkwhite-sh/Apps/nanobanana-batch-uploader`
- **Stack**: Next.js 16, React 19, Tailwind CSS 4, SQLite, Google Gemini API
- **Features**: Text-to-image, image-to-image, job queue, dark mode

### GasTown Setup
- **HQ**: `~/gt`

---

## Step-by-Step Workflow

### Step 1: Create Local Git Repository

```bash
mkdir ~/Apps/nanobanana-tauri
cd ~/Apps/nanobanana-tauri
git init
git commit --allow-empty -m "Initial commit"
```

### Step 2: Add as GasTown Rig

GasTown's `gt rig add` requires a git URL. For local repos, you need to use the `--local-repo` flag with a file path:

```bash
cd ~/gt

# Add rig pointing to local repo
gt rig add nanobanana file:///Users/aaronkwhite-sh/Apps/nanobanana-tauri --prefix nb --local-repo ~/Apps/nanobanana-tauri
```

**Note**: If the file:// URL doesn't work, you may need to:
1. Create a bare git repo: `git clone --bare ~/Apps/nanobanana-tauri ~/Apps/nanobanana-tauri.git`
2. Use that as the URL: `gt rig add nanobanana ~/Apps/nanobanana-tauri.git --prefix nb`

### Step 3: Create Crew Workspace

```bash
gt crew add nanobanana/aaron
gt crew start nanobanana/aaron
```

This opens a tmux session in `~/gt/nanobanana/crew/aaron/rig/`

### Step 4: Initialize Tauri + SvelteKit

From your crew workspace:

```bash
# Create Tauri app with SvelteKit template
npm create tauri-app@latest . -- --template sveltekit

# Or manually:
npm create svelte@latest .
npm install
npm install -D @tauri-apps/cli
npx tauri init
```

### Step 5: Configure SvelteKit for Tauri

Install the static adapter (Tauri serves static files):

```bash
npm install -D @sveltejs/adapter-static
```

Update `svelte.config.js`:
```javascript
import adapter from '@sveltejs/adapter-static';

export default {
  kit: {
    adapter: adapter({
      fallback: 'index.html' // for SPA-style routing
    })
  }
};
```

### Step 5b: Set Up Tailwind CSS

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update `tailwind.config.js`:
```javascript
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  darkMode: 'class',
  theme: {
    extend: {
      // Port your existing theme extensions from the Next.js app
    }
  },
  plugins: []
};
```

Create `src/app.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Import in `src/routes/+layout.svelte`:
```svelte
<script>
  import '../app.css';
</script>

<slot />
```

**Style Migration Notes:**
- Your existing Tailwind classes transfer directly (same utility names)
- Dark mode toggle: Use SvelteKit's `$app/stores` or a simple store
- Lucide icons: Use `lucide-svelte` package (same icons, Svelte bindings)

### Step 6: Migrate Features

| Next.js Component | SvelteKit Equivalent |
|-------------------|---------------------|
| `src/app/page.tsx` | `src/routes/+page.svelte` |
| `src/components/*.tsx` | `src/lib/components/*.svelte` |
| `src/app/api/*` | Tauri commands (`src-tauri/src/commands/`) |
| `src/lib/db.ts` | Tauri Rust with rusqlite |
| `src/lib/gemini.ts` | Tauri command calling Gemini API |

### Step 7: Implement Tauri Commands

The Next.js API routes become Tauri commands in Rust:

```rust
// src-tauri/src/main.rs
#[tauri::command]
async fn create_job(prompt: String, mode: String) -> Result<Job, String> {
    // SQLite + Gemini API logic
}

#[tauri::command]
async fn get_jobs() -> Result<Vec<Job>, String> {
    // Query SQLite
}
```

---

## GasTown Commands Reference

| Command | Purpose |
|---------|---------|
| `gt rig add <name> <url>` | Add project as rig |
| `gt rig list` | List all rigs |
| `gt crew add <rig>/<name>` | Create human workspace |
| `gt crew start <rig>/<name>` | Start workspace session |
| `gt crew at <rig>/<name>` | Attach to session |
| `gt bead ready` | Find available work |
| `gt bead create "title"` | Create issue/task |

---

## Verification

After setup:
1. `gt rig list` shows nanobanana rig
2. `gt crew list` shows your workspace
3. `npm run tauri dev` launches the app
4. SQLite database works in `~/.nanobanana/` or app data dir

---

## Files to Create/Modify

- `~/Apps/nanobanana-tauri/` - New project root
- `package.json` - SvelteKit + Tauri + Tailwind deps
- `svelte.config.js` - Static adapter config
- `tailwind.config.js` - Tailwind with dark mode
- `postcss.config.js` - PostCSS for Tailwind
- `src/app.css` - Tailwind directives
- `src-tauri/tauri.conf.json` - Tauri config
- `src-tauri/src/main.rs` - Tauri commands
- `src/routes/+layout.svelte` - Root layout with CSS import
- `src/routes/+page.svelte` - Main UI
- `src/lib/components/` - Migrated components
- `src/lib/stores/` - Svelte stores for state (theme, jobs, etc.)
