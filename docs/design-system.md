# Tauri SvelteKit Design System

A cross-project design reference for building desktop apps with a consistent, refined aesthetic. Derived from Nana Studio — adapt the accent palette per project, keep everything else.

---

## Design Tokens

### Spacing (4px grid)

| Token | Value |
|-------|-------|
| `--space-xs` | 4px |
| `--space-sm` | 8px |
| `--space-md` | 12px |
| `--space-lg` | 16px |
| `--space-xl` | 24px |
| `--space-2xl` | 32px |

### Border Radius

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 6px | Badges, small elements |
| `--radius-md` | 8px | Inputs, buttons, dropdowns |
| `--radius-lg` | 12px | Cards, dialogs |

### Shadows

```css
--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
```

### Transitions

| Token | Value | Use |
|-------|-------|-----|
| `--transition-fast` | 0.15s ease | Hover states, immediate feedback |
| `--transition-base` | 0.2s ease | Color/background changes |
| `--transition-slow` | 0.25s ease | Progress bars, width animations |

### Neutral Tints

These are theme-independent and work in both light and dark mode:

```css
--neutral-tint: rgba(128, 128, 128, 0.06);
--neutral-tint-strong: rgba(128, 128, 128, 0.08);
--neutral-border: rgba(128, 128, 128, 0.12);
--neutral-border-hover: rgba(128, 128, 128, 0.2);
```

---

## Color System

### Neutrals — Moonlight Silver

A cool-toned neutral palette. Used for backgrounds, surfaces, borders, and text.

| Token | Hex |
|-------|-----|
| `--silver-50` | #F8FAFC |
| `--silver-100` | #F1F5F9 |
| `--silver-200` | #E2E8F0 |
| `--silver-300` | #CBD5E1 |
| `--silver-400` | #94A3B8 |
| `--silver-500` | #64748B |
| `--silver-600` | #475569 |
| `--silver-700` | #334155 |
| `--silver-800` | #1E293B |

These neutrals are project-agnostic. Keep them across all projects.

### Accent Palette — Per Project

Each project defines its own accent ramp. The system uses these semantic tokens:

| Token | Purpose |
|-------|---------|
| `--accent` | Primary interactive color |
| `--accent-hover` | Hover state |
| `--accent-active` | Active/pressed state |
| `--accent-text` | Text on accent backgrounds |
| `--accent-subtle` | Tinted backgrounds (selected states, highlights) |
| `--accent-glow` | Focus rings, glows |

**Nana Studio uses Rose Gold:**

```css
--rose-50: #fdf2f8;   --rose-100: #fce7f3;
--rose-200: #fbb6ce;  --rose-300: #f687b3;
--rose-400: #ed64a6;  --rose-500: #d53f8c;
--rose-600: #b83280;  --rose-700: #97266d;
--rose-800: #702459;
```

Light mode maps `--accent` to the 500, dark mode to the 400. Follow this pattern for any accent palette — lighter in dark mode for contrast.

### Semantic Status Colors

| Status | Light | Dark |
|--------|-------|------|
| `--success` | #2D9D78 | #5BB89A |
| `--warning` | #C08A2E | #D4A54A |
| `--error` | #C93B3B | #E06060 |

Each status color also gets `-subtle` (background tint) and `-border` variants using rgba at 0.08 and 0.2 opacity respectively.

### Theme Tokens

These semantic tokens change between light and dark mode. Wire your UI to these, never to raw palette values.

| Token | Light | Dark |
|-------|-------|------|
| `--bg` | silver-50 | silver-800 |
| `--surface` | #ffffff | silver-700 |
| `--border` | silver-200 | silver-700 |
| `--text` | silver-800 | silver-100 |
| `--muted` | silver-500 | silver-400 |

### Theme Implementation

```typescript
// stores/theme.ts
type Theme = 'light' | 'dark' | 'system';

// Store preference in localStorage
// Set data-theme attribute on document.documentElement
// Sync with OS via window.matchMedia('(prefers-color-scheme: dark)')
```

Use `data-theme="dark"` on `:root` and scope dark overrides to `[data-theme='dark']` in CSS.

---

## Titlebar

The custom titlebar is the most distinctive element. It replaces the native window chrome with a glass-effect bar that integrates with macOS traffic lights.

### Structure

```svelte
<header
  data-tauri-drag-region
  class="titlebar titlebar-glass sticky top-0 z-50 h-12 ..."
>
  <!-- Left: logo/title (padded past traffic lights) -->
  <!-- Right: icon buttons (theme toggle, settings) with class="no-drag" -->
</header>
```

### Key CSS

```css
.titlebar {
  -webkit-app-region: drag;
}

.no-drag {
  -webkit-app-region: no-drag;
}

.titlebar-glass {
  background: var(--titlebar-bg);
  border-bottom: 1px solid var(--glass-border);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
  backdrop-filter: blur(8px) saturate(120%);
}

/* macOS traffic light offset */
--traffic-light-offset: 86px;
```

### Glass Tokens

| Token | Light | Dark |
|-------|-------|------|
| `--titlebar-bg` | rgba(255, 255, 255, 0.3) | rgba(30, 41, 59, 0.3) |
| `--glass-bg` | rgba(255, 255, 255, 0.4) | rgba(51, 65, 85, 0.4) |
| `--glass-border` | silver-200 | rgba(255, 255, 255, 0.08) |
| `--glass-blur` | blur(10px) saturate(150%) | none |

Dark mode disables the heavy glass blur — it reads as muddy on dark backgrounds. Keep the translucent background but skip the filter.

### Titlebar Icon Buttons

- Size: 32px square (`h-8 w-8`)
- Radius: `--radius-md`
- Hover: `--accent-subtle` background
- Icons: Lucide at default size

### Tauri Config

Set `decorations: false` in `tauri.conf.json` to remove native chrome, then handle the titlebar entirely in your frontend. On macOS, traffic lights still render — the 86px offset keeps your content clear of them.

---

## Typography

### Font Stack

```css
--font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text",
             "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
--font-mono: "SF Mono", SFMono-Regular, ui-monospace,
             "Cascadia Code", Menlo, Monaco, Consolas, monospace;
```

macOS-first. Falls through to system fonts on other platforms.

### Scale

| Class | Size | Use |
|-------|------|-----|
| `text-xs` | 12px | Labels, captions, timestamps, badges |
| `text-sm` | 14px | Body text, form inputs, buttons |
| `text-base` | 16px | Section headings |

Desktop apps don't need large type. Keep it tight.

### Weights

- **400 (normal)** — Body text
- **500 (medium)** — Labels, badges, selected tabs
- **600 (semibold)** — Headings, titles

### Tracking

- `tracking-tight` (-0.015em) — Buttons, headings
- `tracking-wide` (0.025em) — Uppercase labels (e.g., "GENERATIONS")

### Rendering

```css
body {
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

---

## Components

All components use CSS custom properties for theming. They work with Tailwind utility classes for layout.

### Button

**Variants:** `primary`, `secondary`, `ghost`, `danger`

| Variant | Background | Text | Border |
|---------|-----------|------|--------|
| primary | `--accent` | `--accent-text` | none |
| secondary | `--accent-subtle` | `--accent` | none |
| ghost | transparent | `--muted` → `--text` on hover | none |
| danger | `--error-subtle` | `--error` | none |

**Sizes:** `sm` (h-7, text-xs), `md` (h-[34px], text-[13px]), `lg` (h-10, text-sm)

**States:**
- Hover: variant-specific color shift
- Active: `translateY(0.5px)`, slight opacity reduction
- Disabled: `opacity-50`, `pointer-events-none`
- Focus: 2px accent ring

### Card

Default element for grouping content. Two modes:

- **Glass** (default): `--glass-bg` background, backdrop blur, `--glass-border`. Hover shifts border toward accent.
- **Solid**: `--surface` background, `--border` border.

Radius: `--radius-lg`. Padding: `p-4` to `p-6` depending on content density.

### Input / Textarea

- Height: Input is `h-9`, Textarea min `80px`
- Border: `--border`, error state uses `--error`
- Focus: 2px ring in `--accent`
- Label: `text-xs font-medium text-[--muted]`, placed above with `gap-1.5`
- Auto-generated IDs with `$derived` to stay reactive
- Textarea supports auto-resize (max 200px) and character counter

### Select

Custom dropdown, not native `<select>`. Renders a trigger button + listbox overlay.

- Trigger: matches Input height (`h-9`), ChevronDown icon rotates on open
- Options: `--accent-subtle` highlight, Check icon for selected
- Keyboard: Escape closes, Enter selects, tabindex on options
- Click-outside closes via window event

### Tabs

Animated pill indicator that slides between tabs.

- Pill easing: `cubic-bezier(0.22, 1, 0.36, 1)` over 250ms — springy, satisfying
- Background: `--neutral-tint-strong` with subtle border
- Selected: `font-medium`, full `--text` color
- Unselected: `--muted` with hover transition

### ProgressBar

- Height: 6px (`h-1.5`)
- Track: `--border` background
- Fill: `--accent`, width transition on `--transition-slow`
- Fully rounded, ARIA attributes for accessibility

### Badge

Inline status indicators. Variants: `default`, `accent`, `success`, `error`.

- Pill shape (full border-radius)
- `text-xs font-medium`, `px-2 py-0.5`
- Each variant includes matching `-subtle` background and `-border`

### Tooltip

Built on `bits-ui` Tooltip. 300ms delay.

- Background: `--surface`, border: `--border`
- Text: `text-xs`, shadow: `--shadow-md`

### Dialog

Built on `bits-ui` Dialog.

- Overlay: fixed fullscreen, `--overlay-bg` + `--overlay-blur`
- Content: glass card, centered, `max-w-md`, `--shadow-lg`

---

## Animations

### Keyframes

```css
@keyframes pulse-subtle {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Patterns

- **Hover feedback**: Use `--transition-fast` (0.15s). Users should never wait for a hover state.
- **State changes**: Use `--transition-base` (0.2s). Background/color swaps.
- **Progress/width**: Use `--transition-slow` (0.25s). Smooth but not sluggish.
- **Tab pill**: `cubic-bezier(0.22, 1, 0.36, 1)` at 250ms. The signature motion — springy with slight overshoot.
- **Svelte transitions**: Use `slide` for expanding/collapsing content (job card details).
- **Loading states**: `spin` keyframe on Loader icons, `pulse-subtle` for processing indicators.

---

## Layout Conventions

### Global

```css
html, body {
  overscroll-behavior: none;  /* no rubber-banding */
  overflow: hidden;           /* app manages its own scroll */
}

::-webkit-scrollbar { display: none; }
scrollbar-width: none;
```

### Content Areas

- Main content: `px-6 py-6`
- Cards: `p-4` to `p-6`
- Form groups: `flex flex-col gap-2` or `gap-3`
- Form grids: `grid grid-cols-3 gap-2` for compact option rows
- Button groups: `gap-1.5`

### Focus States

```css
*:focus-visible {
  outline: 1px solid var(--accent);
  outline-offset: 1px;
}
```

---

## Glass Morphism

The defining visual treatment. Use it on titlebar, cards, and overlays — not everywhere.

```css
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  -webkit-backdrop-filter: var(--glass-blur);
  backdrop-filter: var(--glass-blur);
}
```

**Rules:**
- Glass only works over varied backgrounds. Over a flat color it's invisible overhead.
- Dark mode: disable heavy blur (`--glass-blur: none`). Keep translucent backgrounds.
- Don't stack glass on glass — one layer maximum.
- Cards default to glass. Use solid (`--surface`) when layered inside other glass elements.

---

## Accessibility

- Focus-visible rings on all interactive elements (accent color, 1px, 1px offset)
- ARIA attributes: `aria-expanded`, `aria-haspopup`, `aria-selected`, `role="listbox"`, `role="option"`
- Keyboard navigation: Escape closes dropdowns/dialogs, Enter selects, Tab traverses
- Semantic HTML with proper heading hierarchy
- `tabindex={0}` on custom interactive elements

---

## Dependencies

| Package | Purpose |
|---------|---------|
| `tailwindcss` | Utility CSS |
| `bits-ui` | Headless components (Tooltip, Dialog) |
| `lucide-svelte` | Icon library |
| `canvas-confetti` | Celebration effects (optional) |

---

## Adapting for a New Project

1. **Copy the token layer** — all `--space-*`, `--radius-*`, `--shadow-*`, `--transition-*`, `--silver-*`, neutral tints, and font stacks. These don't change.
2. **Define your accent** — create an 8-stop ramp (50–800). Map `--accent` to the 500 in light, 400 in dark.
3. **Keep the titlebar pattern** — glass bar, `data-tauri-drag-region`, 86px traffic light offset, `no-drag` on buttons.
4. **Use the component API** — Button (4 variants, 3 sizes), Card (glass/solid), Input/Textarea/Select with label+error pattern, Tabs with pill animation.
5. **Respect the type scale** — xs/sm/base only. Desktop apps stay tight.
6. **Match the motion** — fast for hover, base for state, slow for progress. Tabs get the cubic-bezier spring.
