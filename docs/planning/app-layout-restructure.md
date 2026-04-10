# App Layout Restructure — Three-Panel Creative Studio

## Context
Nanobanana Studio is evolving from a single-purpose batch image tool into a multi-mode creative studio (T2I, I2I, VEO video, eventually real-time). The current single-view with tab toggle doesn't scale. Moving to a proper app layout with left nav, center workspace, and right settings panel.

## Layout Structure

```
┌──────────┬─────────────────────────┬──────────────┐
│ Left Nav │   Center Workspace      │ Right Panel  │
│ (fixed)  │   (scrollable)          │ (contextual) │
│          │                         │              │
│ Home     │   Content changes per   │ Settings for │
│ ───────  │   selected nav item     │ active mode  │
│ T2I      │                         │              │
│ I2I      │                         │ - Size       │
│ Video    │                         │ - Ratio      │
│          │                         │ - Temp       │
│ ───────  │                         │ - Model      │
│ Process  │                         │ - etc        │
│ Settings │                         │              │
│          │                         │              │
│ ───────  │                         │              │
│ [Banner] │                         │              │
└──────────┴─────────────────────────┴──────────────┘
```

## Left Nav (fixed sidebar)

**Top section:**
- **Home** — Dashboard/landing view

**Create section:**
- **Text → Image** — T2I batch generation
- **Image → Image** — I2I batch generation
- **Text → Video** — VEO video creation (future)

**Bottom section (pinned):**
- **Processing** — Active/completed jobs queue
- **Settings** — App config (API key, defaults, appearance, about)

**Pinned at very bottom:**
- **Announcement card** — Promo/update banner (Buy Me a Coffee, new features, credits upsell in future)

## Center Workspace (changes per nav item)

### Home View
First-time user sees:
1. **Welcome/setup flow** — API key configuration prompt if not set
2. **Quick actions** — Large cards for "Create Image", "Transform Image", "Create Video"
3. **Empty state** with clear CTAs directing to creation modes

Returning user sees:
1. **Quick actions** — Same cards but perhaps smaller
2. **Recent creations** — Grid of latest generated images/videos with timestamps
3. **Quick stats** — Jobs completed, images generated, etc. (lightweight)

### T2I / I2I / Video Views
- Prompt input area (text prompts for T2I/Video, image drop zone + prompt for I2I)
- Live preview of queued items before submission
- Submit button with cost estimate
- Results appear inline after generation completes

### Processing View
- All jobs (active, completed, failed, cancelled)
- Filterable/sortable
- Expand to see results
- Retry/delete actions
- This is essentially the current JobList but as its own full view

### Settings View
- Same tabs as current settings page (API Key, Defaults, Storage, Appearance, About)
- Rendered in center workspace, no right panel needed

## Right Panel (contextual settings)

**Visible on:** T2I, I2I, Video creation views
**Hidden on:** Home, Processing, Settings

Contains generation settings specific to the active mode:

**Image (T2I):**
- Output size (1K, 2K, 4K)
- Aspect ratio
- Temperature
- Number of images
- (Future: model selection, style presets)

**Image (I2I):**
- Output size
- Aspect ratio
- Temperature
- Transformation strength (future)

**Video:**
- Duration
- Resolution
- Style/model
- (TBD based on VEO API)

The right panel should be collapsible for smaller windows, with settings accessible via a toggle button.

## Routing

```
/              → Home
/create/t2i    → Text to Image + right panel
/create/i2i    → Image to Image + right panel
/create/video  → Video creation + right panel
/processing    → Job queue
/settings      → Settings (existing tabs)
```

## Key Design Decisions (TBD before implementation)

1. **Nav width** — Compact icons-only (~48px) vs labeled (~200px) vs collapsible?
2. **Right panel behavior** — Always visible on create views, or toggleable drawer?
3. **Window minimum size** — Three panels need more width. New minimum ~1000px? Or collapse right panel on narrow windows?
4. **Home view scope** — How much to invest in the dashboard for v1? Minimal (quick actions + recent) vs full onboarding flow?
5. **Processing as separate view vs sidebar badge** — Could show active job count on nav items instead of a separate view?

## What This Means for Current Code

- `+page.svelte` (current single view) gets broken up into route-based views
- `PromptForm` settings (size, ratio, temp) move to the right panel component
- `JobList` becomes the Processing view
- `Header` becomes the left nav sidebar
- `ModeSelector` tabs are replaced by nav items
- Settings page moves from `/settings` to being a nav destination in the layout

## NOT doing yet
This is a planning document. No implementation until the design is approved and mockups are reviewed.
