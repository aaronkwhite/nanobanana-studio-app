# Nana Studio

*Peel. Prompt. Produce.*

A macOS desktop app for batch media generation using Google's Gemini API. Submit dozens of prompts as a single batch job and get results at **50% of the standard API cost**.

Built with Tauri v2, SvelteKit 2, Svelte 5, and Rust.

## Features

- **Batch Image Generation** — submit multiple prompts at once via the Gemini Batch API
- **Text-to-Image** — generate images from text prompts
- **Image-to-Image** — transform existing images with prompts
- **Job Tracking** — real-time progress, expand to view results inline
- **Native Drag & Drop** — drop images from Finder for I2I workflows
- **Dark/Light Theme** — system-aware theming with manual override
- **Output to ~/Pictures** — generated images save to `~/Pictures/Nana Studio/` by default

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (1.77.2+)
- [Gemini API Key](https://aistudio.google.com/apikey)

## Getting Started

```bash
# Clone the repository
git clone https://github.com/aaronkwhite/nanobanana-studio-app.git
cd nanobanana-studio-app

# Install dependencies
npm install

# Run in development mode
npm run tauri dev

# Build for production
npm run tauri build
```

## Configuration

1. Launch the app
2. Click the Settings gear in the header
3. Enter your Gemini API key under **General > Gemini API Key**
4. Click **Test & Save** — the key is validated against Gemini before storing

## Development

```bash
# Run frontend only (no Tauri)
npm run dev

# Run full app with Tauri
npm run tauri dev

# Run frontend tests (Vitest)
npm run test:run

# Run Rust tests
cd src-tauri && cargo test

# Run frontend tests in watch mode
npm test

# Type checking
npm run check
```

## Testing

**Frontend (Vitest):** 42 tests across 10 files
- Stores: settings, config, jobs, theme
- Utilities: options, isActiveJob
- Components: Header, JobCard, Button
- Types: constants, calculateCost

**Backend (Rust):** 15 tests
- Security: save_setting key allowlist, batch name validation (SSRF/path traversal)
- Pure functions: MIME type mapping, API key masking

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5 (runes), Tailwind CSS 4
- **Backend**: Tauri v2, Rust
- **Database**: SQLite (rusqlite, WAL mode)
- **Icons**: Lucide (v1 RC)
- **Testing**: Vitest + Testing Library (frontend), cargo test (backend)

## Design System

- **Color**: Moonlight Silver neutrals + Rose Gold accent
- **Typography**: SF Pro system font stack
- **Components**: Glass morphism cards, sliding pill tabs, translucent titlebar
- **Themes**: Light and dark with `--titlebar-bg`, `--glass-bg`, `--neutral-tint` tokens

## Project Structure

```
src/                          # SvelteKit frontend
  lib/
    components/               # Svelte components
      ui/                     # Design system primitives (Button, Select, Tabs, etc.)
    stores/                   # Svelte stores (settings, config, jobs, theme)
    types/                    # TypeScript types matching Rust structs
    utils/                    # Utilities (commands, options, jobs, mock-mode)
  routes/                     # Pages (+page.svelte, settings/+page.svelte)
  app.css                     # Design tokens and glass utilities
src-tauri/                    # Rust backend
  src/
    commands/                 # Tauri IPC commands (config, jobs, files, batch)
    paths.rs                  # Shared path resolution, API key, MIME, validation
    models.rs                 # Data structures (Job, JobItem, etc.)
    db.rs                     # SQLite database initialization
    lib.rs                    # Tauri app setup and command registration
static/
  images/                     # Logo SVGs (mark, full, inverse)
```

## License

MIT
