# Nanobanana Studio

A desktop application for batch image generation using Google's Gemini API. Built with Tauri, SvelteKit, and Tailwind CSS.

## Features

- **Text-to-Image**: Generate images from text prompts
- **Image-to-Image**: Transform existing images with prompts
- **Batch Processing**: Process multiple images or prompts in a single job
- **Job Management**: Track progress, view results, and manage generation jobs
- **Dark/Light Theme**: System-aware theming with manual override

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (1.77.2+)
- [Gemini API Key](https://makersuite.google.com/app/apikey)

## Installation

```bash
# Clone the repository
git clone https://github.com/aaronkwhite/nanobanana-studio-app.git
cd nanobanana-studio-app

# Install dependencies
npm install

# Run in development mode
npm run tauri:dev

# Build for production
npm run tauri:build
```

## Configuration

1. Launch the application
2. Click the settings icon in the header
3. Enter your Gemini API key (starts with "AI")
4. Your key is stored locally in an SQLite database

## Development

```bash
# Run frontend only
npm run dev

# Run with Tauri (full app)
npm run tauri:dev

# Run tests
npm test

# Run tests once
npm run test:run

# Type checking
npm run check
```

## Tech Stack

- **Frontend**: SvelteKit 2, Svelte 5, Tailwind CSS 4
- **Backend**: Tauri 2, Rust
- **Database**: SQLite (via rusqlite)
- **Testing**: Vitest, Testing Library

## License

MIT - see [LICENSE](LICENSE)
