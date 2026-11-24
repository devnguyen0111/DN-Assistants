# DN Assistant — desktop UI redesign specification

Design specification only. Implementation is assigned to a subsequent engineer. Target: Windows-first Tauri 2, React 19, Tailwind CSS v4, existing Radix/shadcn-style primitives, lucide-react, anime.js. Vietnamese is the default language; English has equal layout support. Default window: 1280 × 860; minimum: 960 × 680. Dimensions below are CSS pixels in the webview client area; native window decorations are additional chrome.

## 1. Design direction

**A quiet Windows workbench.** Use the restrained layering of Fluent: a stable navigation rail, solid working surfaces, clear selection markers, and precise typography. The distinctive element is the narrow accent selection bar that connects navigation, the current day, and the active tool. Reserve large numerals for timers and actual measurements. Productivity content, rather than decoration or onboarding, occupies the first viewport.

- Neutral cool gray surfaces in light mode; charcoal surfaces in dark mode. No radial gradients behind text, frosted cards, glowing borders, or accent-colored body backgrounds. This evokes Mica through tonal layering without requiring native Mica or transparency support.
- Use Segoe UI Variable with Vietnamese-capable system fallbacks. Sentence case throughout. Distinguish headings through size and weight, never tiny uppercase text or wide tracking.
- Comfortable density is the default. Compact density reduces spacing and control heights, not font legibility. Every action remains reachable by keyboard.
- All six existing accents remain selectable. Accent means selection, focus, and the main action; success, warning, danger, and information retain independent semantic colors.
- One page title, one content frame, one primary action per task area. Separate related sections with space or a divider. A panel contains a genuinely separate surface or interaction, not an entire page by default.

### Audit baseline and decisions

Reviewed `src/index.css`, shell/header/navigation, page wrappers, UI primitives, bento layout, Home, command palette, widgets, card implementations, settings sections, and all 12 supplied screenshots. The existing sidebar has `overflow-y-auto`, but its flex sizing does not reliably reserve a footer; explicitly set the full chain of `min-height: 0` and separate fixed regions. The screenshot sidebar loses App links and overlaps Collapse with Weather. The current Home is dominated by scratchpad/clock, introductory copy, repeated route shortcuts, and equal-height panels. Tool wrappers introduce several unrelated centered width caps. Several card headers repeat the route title. Theme controls display the destination mode rather than the selected mode.

The browser preview's missing `invoke` bridge, empty hardware readings, and resulting error messages are expected environment limitations, not design defects. The new state system specifies production behavior without treating preview failures as product bugs. Shutdown scheduling already exists in `PowerTimerCard.tsx`; redesign that component rather than adding a second timer.

## 2. Design tokens

These values are the implementation contract. Color values use OKLCH; structural borders and control boundaries are separate because they serve different contrast requirements. All content surfaces are opaque. Do not apply `/60`, `/80`, backdrop blur, or parent opacity to these surfaces.

### Theme colors and compatibility aliases

Replace the existing theme values with the following foundation. Theme application remains `html.dark`; accent and density remain `data-accent` and `data-density` on `html`.

```css
:root {
  color-scheme: light;
  --app-bg: oklch(0.965 0.004 255);
  --sidebar-bg: oklch(0.945 0.006 255);
  --surface-1: oklch(1 0 0);
  --surface-2: oklch(0.975 0.004 255);
  --surface-3: oklch(0.925 0.008 255);
  --elevated: oklch(1 0 0);
  --border-subtle: oklch(0.875 0.008 255);
  --border-strong: oklch(0.740 0.012 255);
  --border-control: oklch(0.580 0.012 255);
  --text-1: oklch(0.220 0.012 255);
  --text-2: oklch(0.400 0.012 255);
  --text-3: oklch(0.470 0.012 255);
  --text-disabled: oklch(0.620 0.008 255);
  --accent-fill: oklch(0.420 0.085 195);
  --accent-hover: oklch(0.380 0.085 195);
  --accent-pressed: oklch(0.340 0.075 195);
  --accent-soft: oklch(0.925 0.025 195);
  --accent-ink: oklch(0.340 0.070 195);
  --on-accent: oklch(1 0 0);
  --success: oklch(0.400 0.100 155);
  --success-soft: oklch(0.950 0.025 155);
  --warning: oklch(0.420 0.085 75);
  --warning-soft: oklch(0.960 0.035 85);
  --danger: oklch(0.440 0.155 25);
  --danger-soft: oklch(0.955 0.020 25);
  --info: oklch(0.420 0.120 255);
  --info-soft: oklch(0.950 0.020 255);
  --on-danger: oklch(1 0 0);
  --focus-ring: oklch(0.420 0.085 195);
  --scrim: oklch(0.180 0.010 255 / 0.42);
  --elevation-panel: 0 1px 2px oklch(0.180 0.010 255 / 0.05);
  --elevation-popover: 0 4px 16px oklch(0.180 0.010 255 / 0.14),
                    0 1px 3px oklch(0.180 0.010 255 / 0.08);
  --elevation-dialog: 0 16px 48px oklch(0.180 0.010 255 / 0.22),
                   0 2px 8px oklch(0.180 0.010 255 / 0.10);
}
html.dark {
  color-scheme: dark;
  --app-bg: oklch(0.180 0.006 255);
  --sidebar-bg: oklch(0.200 0.007 255);
  --surface-1: oklch(0.230 0.008 255);
  --surface-2: oklch(0.260 0.009 255);
  --surface-3: oklch(0.310 0.010 255);
  --elevated: oklch(0.290 0.009 255);
  --border-subtle: oklch(0.350 0.009 255);
  --border-strong: oklch(0.470 0.010 255);
  --border-control: oklch(0.600 0.010 255);
  --text-1: oklch(0.955 0.004 255);
  --text-2: oklch(0.810 0.008 255);
  --text-3: oklch(0.735 0.008 255);
  --text-disabled: oklch(0.540 0.008 255);
  --accent-fill: oklch(0.780 0.095 195);
  --accent-hover: oklch(0.830 0.085 195);
  --accent-pressed: oklch(0.730 0.095 195);
  --accent-soft: oklch(0.300 0.025 195);
  --accent-ink: oklch(0.860 0.065 195);
  --on-accent: oklch(0.160 0.006 255);
  --success: oklch(0.810 0.100 155);
  --success-soft: oklch(0.290 0.025 155);
  --warning: oklch(0.850 0.110 85);
  --warning-soft: oklch(0.300 0.025 75);
  --danger: oklch(0.810 0.110 25);
  --danger-soft: oklch(0.290 0.030 25);
  --info: oklch(0.820 0.090 255);
  --info-soft: oklch(0.290 0.025 255);
  --on-danger: oklch(0.160 0.006 255);
  --focus-ring: oklch(0.780 0.095 195);
  --scrim: oklch(0 0 0 / 0.60);
  --elevation-panel: 0 1px 2px oklch(0 0 0 / 0.12);
  --elevation-popover: 0 4px 16px oklch(0 0 0 / 0.32),
                    0 1px 3px oklch(0 0 0 / 0.24);
  --elevation-dialog: 0 16px 48px oklch(0 0 0 / 0.45),
                   0 2px 8px oklch(0 0 0 / 0.30);
}
/* Declare aliases on html, which also owns theme/accent attributes. */
html {
  --background: var(--app-bg);
  --foreground: var(--text-1);
  --card: var(--surface-1);
  --card-foreground: var(--text-1);
  --popover: var(--elevated);
  --popover-foreground: var(--text-1);
  --primary: var(--accent-fill);
  --primary-foreground: var(--on-accent);
  --secondary: var(--surface-3);
  --secondary-foreground: var(--text-1);
  --muted: var(--surface-2);
  --muted-foreground: var(--text-3);
  --accent: var(--accent-soft);
  --accent-foreground: var(--accent-ink);
  --destructive: var(--danger);
  --destructive-foreground: var(--on-danger);
  --border: var(--border-subtle);
  --input: var(--border-control);
  --ring: var(--focus-ring);
  --chart-1: var(--accent-fill);
  --chart-2: var(--success);
  --chart-3: var(--warning);
  --chart-4: var(--info);
  --chart-5: var(--danger);
}
```

### Six accents

For each `html[data-accent="…"]`, set the five variables in its row. For `html.dark[data-accent="…"]`, use the dark row. Set `--focus-ring: var(--accent-fill)` in every accent selector. `--on-accent` is theme-dependent above and never changes with hue. Teal is the fallback when no attribute exists. The subdued shadcn `--accent` token is **not** the filled primary color.

| Theme / accent | `--accent-fill` | `--accent-hover` | `--accent-pressed` | `--accent-soft` | `--accent-ink` |
| --- | --- | --- | --- | --- | --- |
| Light teal | oklch(0.420 0.085 195) | oklch(0.380 0.085 195) | oklch(0.340 0.075 195) | oklch(0.925 0.025 195) | oklch(0.340 0.070 195) |
| Light blue | oklch(0.420 0.130 255) | oklch(0.380 0.120 255) | oklch(0.340 0.110 255) | oklch(0.925 0.025 255) | oklch(0.340 0.100 255) |
| Light violet | oklch(0.420 0.140 295) | oklch(0.380 0.130 295) | oklch(0.340 0.120 295) | oklch(0.925 0.025 295) | oklch(0.340 0.110 295) |
| Light rose | oklch(0.420 0.135 15) | oklch(0.380 0.125 15) | oklch(0.340 0.110 15) | oklch(0.925 0.025 15) | oklch(0.340 0.100 15) |
| Light amber | oklch(0.420 0.085 75) | oklch(0.380 0.075 75) | oklch(0.340 0.065 75) | oklch(0.925 0.030 75) | oklch(0.340 0.065 75) |
| Light emerald | oklch(0.420 0.095 155) | oklch(0.380 0.085 155) | oklch(0.340 0.075 155) | oklch(0.925 0.025 155) | oklch(0.340 0.075 155) |
| Dark teal | oklch(0.780 0.095 195) | oklch(0.830 0.085 195) | oklch(0.730 0.095 195) | oklch(0.300 0.025 195) | oklch(0.860 0.065 195) |
| Dark blue | oklch(0.780 0.100 255) | oklch(0.830 0.080 255) | oklch(0.730 0.110 255) | oklch(0.300 0.025 255) | oklch(0.860 0.065 255) |
| Dark violet | oklch(0.780 0.110 295) | oklch(0.830 0.090 295) | oklch(0.730 0.120 295) | oklch(0.300 0.025 295) | oklch(0.860 0.065 295) |
| Dark rose | oklch(0.780 0.100 15) | oklch(0.830 0.080 15) | oklch(0.730 0.110 15) | oklch(0.300 0.025 15) | oklch(0.860 0.065 15) |
| Dark amber | oklch(0.780 0.110 75) | oklch(0.830 0.100 75) | oklch(0.730 0.100 75) | oklch(0.300 0.025 75) | oklch(0.860 0.075 75) |
| Dark emerald | oklch(0.780 0.105 155) | oklch(0.830 0.090 155) | oklch(0.730 0.105 155) | oklch(0.300 0.025 155) | oklch(0.860 0.065 155) |

### Geometry, typography, density, and motion

```css
html {
  --space-0: 0px; --space-1: 4px; --space-2: 8px;
  --space-3: 12px; --space-4: 16px; --space-5: 20px;
  --space-6: 24px; --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px;
  --radius-xs-value: 4px; --radius-sm-value: 6px;
  --radius-md-value: 8px; --radius-lg-value: 10px;
  --radius-xl-value: 12px; --radius-pill-value: 999px;
  --radius: 10px; /* legacy base; do not change radius with density */
  --font-ui: "Segoe UI Variable Text", "Segoe UI Variable", "Segoe UI",
             "Noto Sans", system-ui, sans-serif;
  --font-code: "Cascadia Code", "Cascadia Mono", Consolas, monospace;
  --type-display: 36px; --leading-display: 44px; --weight-display: 600;
  --type-title: 24px; --leading-title: 32px; --weight-title: 600;
  --type-section: 16px; --leading-section: 24px; --weight-section: 600;
  --type-body: 14px; --leading-body: 20px; --weight-body: 400;
  --type-label: 14px; --leading-label: 20px; --weight-label: 600;
  --type-caption: 12px; --leading-caption: 16px; --weight-caption: 400;
  --type-code: 13px; --leading-code: 20px; --weight-code: 400;
  --type-numeral: 28px; --leading-numeral: 36px; --weight-numeral: 600;
  --focus-width: 2px; --focus-offset: 2px;
  --duration-instant: 0ms; --duration-fast: 100ms;
  --duration-normal: 160ms; --duration-slow: 220ms;
  --motion-ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --motion-ease-enter: cubic-bezier(0, 0, 0.2, 1);
  --motion-ease-exit: cubic-bezier(0.4, 0, 1, 1);
  --sidebar-expanded: 224px; --sidebar-collapsed: 64px;
  --app-toolbar-h: 52px;
  --density-pad: 20px; --density-gap: 16px;
  --density-control-h: 36px; --density-row-h: 44px;
  --density-nav-h: 36px; --density-section-gap: 24px;
}
html[data-density="compact"] {
  --density-pad: 16px; --density-gap: 12px;
  --density-control-h: 32px; --density-row-h: 36px;
  --density-nav-h: 32px; --density-section-gap: 20px;
}
html[data-density="comfortable"] {
  --density-pad: 20px; --density-gap: 16px;
  --density-control-h: 36px; --density-row-h: 44px;
  --density-nav-h: 36px; --density-section-gap: 24px;
}
```

Use body typography for controls, list titles, and settings values; labels use weight 600. Navigation group labels use caption/600 with normal letter spacing. Page title tracking is -0.01em; all other text uses normal tracking. Mono is limited to code, hashes, keyboard hints, and numerals; dates, badges, and ordinary metadata use the UI font. Numerals use `font-variant-numeric: tabular-nums lining-nums`; clocks use display size, stat tiles use numeral size. Never reduce text below 12px. Panel padding uses `--density-pad`; row/control heights are minimums and grow for wrapped content.

Elevation: app/sidebar level 0; panels level 1 with subtle border and panel shadow; menus/tooltips level 2 with popover shadow; modal level 3 with dialog shadow. No default hover shadow or translation on panels. Z-index: base 0, local sticky toolbar 10, shell toolbar 20, dropdown/popover 40, modal overlay/content 50/51, nested modal menus 60, toast 70, tooltip 80. Radix portals inside dialogs must sit above their modal.

### Tailwind v4 mapping

Keep `@import "tailwindcss"` and the existing `.dark` custom variant. Define this mapping with the aliases above; use `bg-surface-1`, `text-text-2`, `border-control`, `p-panel`, and `gap-panel-gap` instead of arbitrary opacity layers. Tailwind's standard spacing utilities continue to use its 4px base; the explicit `space-*` variables document approved steps.

```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-sidebar: var(--sidebar-bg);
  --color-surface-1: var(--surface-1);
  --color-surface-2: var(--surface-2);
  --color-surface-3: var(--surface-3);
  --color-elevated: var(--elevated);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-text-1: var(--text-1);
  --color-text-2: var(--text-2);
  --color-text-3: var(--text-3);
  --color-text-disabled: var(--text-disabled);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-hover: var(--accent-hover);
  --color-primary-pressed: var(--accent-pressed);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-success: var(--success);
  --color-success-soft: var(--success-soft);
  --color-warning: var(--warning);
  --color-warning-soft: var(--warning-soft);
  --color-danger: var(--danger);
  --color-danger-soft: var(--danger-soft);
  --color-info: var(--info);
  --color-info-soft: var(--info-soft);
  --color-border: var(--border);
  --color-border-strong: var(--border-strong);
  --color-control: var(--border-control);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-xs: var(--radius-xs-value);
  --radius-sm: var(--radius-sm-value);
  --radius-md: var(--radius-md-value);
  --radius-lg: var(--radius-lg-value);
  --radius-xl: var(--radius-xl-value);
  --radius-pill: var(--radius-pill-value);
  --shadow-panel: var(--elevation-panel);
  --shadow-popover: var(--elevation-popover);
  --shadow-dialog: var(--elevation-dialog);
  --spacing-panel: var(--density-pad);
  --spacing-panel-gap: var(--density-gap);
  --spacing-control: var(--density-control-h);
  --spacing-row: var(--density-row-h);
  --font-sans: var(--font-ui);
  --font-mono: var(--font-code);
  --text-display: var(--type-display);
  --text-display--line-height: var(--leading-display);
  --text-display--font-weight: var(--weight-display);
  --text-title: var(--type-title);
  --text-title--line-height: var(--leading-title);
  --text-title--font-weight: var(--weight-title);
  --text-section: var(--type-section);
  --text-section--line-height: var(--leading-section);
  --text-section--font-weight: var(--weight-section);
  --text-body: var(--type-body);
  --text-body--line-height: var(--leading-body);
  --text-body--font-weight: var(--weight-body);
  --text-label: var(--type-label);
  --text-label--line-height: var(--leading-label);
  --text-label--font-weight: var(--weight-label);
  --text-caption: var(--type-caption);
  --text-caption--line-height: var(--leading-caption);
  --text-caption--font-weight: var(--weight-caption);
  --text-code: var(--type-code);
  --text-code--line-height: var(--leading-code);
  --text-code--font-weight: var(--weight-code);
  --text-numeral: var(--type-numeral);
  --text-numeral--line-height: var(--leading-numeral);
  --text-numeral--font-weight: var(--weight-numeral);
  --ease-standard: var(--motion-ease-standard);
  --ease-enter: var(--motion-ease-enter);
  --ease-exit: var(--motion-ease-exit);
}
```

Theme-specific elevation values remain on html; the Tailwind shadow/easing names map to separately named runtime tokens to avoid self-referential custom properties. Motion classes should consume `var(--duration-fast)` etc. directly; do not introduce a second duration scale.

## 3. App shell and layout rules

### Shell structure and scrolling

The webview root is `height: 100dvh; overflow: hidden`. AppShell is a two-column grid: sidebar and `minmax(0, 1fr)`. Its right column is a grid with `52px minmax(0, 1fr)` rows. Every flex/grid ancestor of a scroll viewport has `min-height: 0; min-width: 0`. No body scrolling. Native titlebar/minimize/maximize/close remain native; the 52px app toolbar is below native decorations.

```text
┌──── sidebar 224 / 64 ────┬──────── app toolbar (52) ──────────────┐
│ Brand (64)              │ Commands Ctrl+K          Pin · More   │
├─────────────────────────┼───────────────────────────────────────┤
│ Favorites               │ PageHeader: title       Page actions  │
│ Today                   │ optional one-line description         │
│ Library                 │                                       │
│ Tools   NAV SCROLLS      │       PAGE VIEWPORT SCROLLS           │
│ System                  │                                       │
├─────────────────────────┤                                       │
│ App: Settings · About   │                                       │
│ Collapse                │                                       │
└─────────────────────────┴───────────────────────────────────────┘
```

Sidebar uses `grid-template-rows: 64px minmax(0,1fr) auto`, a 1px right border, 8px horizontal padding. Width: expanded 224px; collapsed 64px in both densities. Brand: 32px logo and 14px/600 app name; remove the truncated tagline. Middle `<nav>` alone gets `overflow-y:auto; overscroll-behavior:contain; scrollbar-gutter:stable`. Fixed bottom footer uses solid sidebar background, top border, 8px padding, `shrink-0`; never position it over navigation.

Render Today / Library / Tools / System in the scroll region, preserving `src/lib/nav.ts` order. Render the App group once in the fixed footer: Settings and About each get a full-width nav row, then Collapse. Footer height is 140px comfortable / 128px compact, including its 12px caption, three rows, padding and border (allow +1px rounding). Collapsed footer omits the caption and has the same three vertically stacked controls. Neither Settings nor About is hideable or favoritable; migrate stale hidden/favorite entries accordingly. Keep the five-group data model for command search and About catalog.

Navigation rows: height `--density-nav-h`, 8px horizontal padding, 8px icon/text gap, 16px icon, radius 6px. Active: accent-soft fill, accent-ink text, 3px accent-fill inset bar centered vertically at 18px height; no layout-shifting border. Hover: surface-3 fill. Pressed: surface-3 plus inset 1px border-strong. Focus ring is independent of active state. Group labels: caption/600/text-3, 12px top and 4px bottom spacing. Collapsed groups use 1px separators, no inaccessible letter abbreviations. Every collapsed item has a localized accessible name and right-side tooltip on focus and hover.

Favorites remain at the top of the scrolling nav, in saved order, and are not duplicated in their original group. Omit hidden modules from Favorites, while preserving their saved order; temporarily show the current hidden route in its normal group. No arbitrary favorite cap. A 28px Star button appears on row hover **and focus-within**, remains visible when favorited, and has an explicit accessible name and pressed state. It is a sibling of the navigation button, never nested. In collapsed mode, manage favorites through the page action menu or Settings Modules. Removing a favorite preserves focus on that route's normal group entry.

### Global toolbar and page header

AppHeader becomes global utilities only. No route title inside it. On wide windows (client width ≥1200): left Commands button with Search icon, “Lệnh” / “Commands”, `Ctrl+K` chip; right labeled Pin toggle, Shortcuts button, language menu, theme menu. Pin reads “Luôn ở trên: Tắt/Bật” / “Always on top: Off/On”, using `aria-pressed`. Shortcuts reads “Phím tắt” / “Shortcuts”. Language displays “Tiếng Việt” / “English”, with a menu rather than cycling. Theme displays the **selected** setting: “Giao diện: Tối” / “Theme: Dark”, “Sáng/Light”, or “Hệ thống/System”; for System, append resolved mode in the menu description. Use Moon for Dark, Sun for Light, Monitor for System. Theme selection is a radio menu with Light, Dark, System. No right-click-only behavior.

Below 1200px, retain Commands and a labeled Pin toggle; move Shortcuts, Language, Theme into a labeled “Tùy chọn” / “Options” dropdown with current values in rows. This is deterministic at 960px and prevents an unlabeled icon pile. Toolbar uses transparent layout over app-bg, bottom border, 16px side padding; remove its current floating rounded container.

Each routed page owns one `PageHeader`: title at left, optional description below, actions slot at right. PageHeader belongs to the page scroll viewport. Default top/bottom spacing 20/20px; title 24/32, description 14/20 text-2, 4px gap. Description must add information; omit generic subtitles such as “Overview and quick actions”. At inner width <720px, actions wrap onto a second row aligned left; titles and descriptions wrap instead of disappearing. Actions: one primary button, up to two secondary buttons, then labeled More menu. Do not repeat the route title inside a Panel.

### Width and minimum-window behavior

All pages share a left content edge: 24px from the right column's left boundary at ≥1200px window width, 16px below. Right padding matches; compact mode does not change these gutters. Remove shell `max-w-7xl` and ad hoc page `mx-auto max-w-*` wrappers.

| Page family | Width contract | Internal layout |
| --- | --- | --- |
| Home, System, Calendar, Habits | Fluid, all available width | Grids measured against content width |
| Todo, Notes, Vault unlocked, Clipboard, Snippets | Fluid workspace | Lists, editors and detail panes; no global centered cap |
| Dev Tools, File Tools, Calculator, Colors, Network, Clock, Weather | Fluid tool workspace | Tool nav, working area, bounded controls inside |
| Settings | Fluid outer frame, left aligned | 176px in-page nav + 24px gap + form column max 760px |
| About, Vault setup/unlock, Focus settings | Same page-header edge | Body/form max 720px; Vault form max 440px; never center whole route |

Use content/container queries for internal breakpoints, not Tailwind viewport `xl` when sidebar width changes. At 960px expanded, content width is 704px after 32px gutters; collapsed it is 864px. Preserve the user's sidebar preference on resize; do not auto-collapse it. At 960×680 all shell utilities/footer remain visible, secondary panes stack or become explicitly opened sheets, and page content scrolls vertically. No page-level horizontal scroll. Only code, tables, history grids, and long hashes may scroll horizontally inside labeled regions. Maintain at least 16px bottom page padding. For fixed editor workspaces, PageHeader occupies an auto row and workspace uses `minmax(0,1fr)`; list/editor viewports scroll independently, with no additional outer page scroll unless header wrapping requires it.

## 4. Component specifications

### PageHeader, Section, and Panels

- **PageHeader:** semantic `header` with exactly one h1; localized optional description, action group, optional count adjacent to title. No background/border wrapper. Counts are plain caption text unless a status is conveyed. Never truncate the only available title.
- **Section:** semantic `section` labeled by h2; optional description and right-aligned section action. Header-to-body gap 12px; section-to-section gap density-section-gap. No default fill, border, shadow, or padding. Use this to replace outer big Cards in Todo, Dev Tools, File Tools, Habits, Clipboard, and settings groups. Sections that have no distinct heading do not invent one.
- **Default Panel:** surface-1, 1px border-subtle, radius 10px, panel shadow, density-pad inset. Header has section typography, optional 16px muted icon and action; 12px body gap. Footer separated only when it hosts persistent actions. No fixed minimum height; do not fill empty space to match a neighbor. Container headers use actual h2/h3 semantics rather than CardTitle divs alone.
- **Interactive Panel:** default Panel plus hover surface-2 and border-strong; entire-panel navigation must be a real link/button when there are no child controls. Panels with child controls instead have a header link and normal body; never combine an onClick div with nested checkbox/buttons.
- **Stat tile:** surface-2, border-subtle, radius 8px, 12px padding; label caption, value numeral, optional caption trend and units. Minimum height 84px, content-driven above that. No pointer cursor unless actionable. Unknown readings use an em dash with an accessible “Unavailable” label, never fake 0%.
- **Empty Panel:** same surrounding surface as its section, compact inline empty row by default. First-use module state may use a 160–200px body with a 24px icon, section-size title, one explanatory line and one action. Dashboard emptiness uses a 64–80px row and no illustration. Never nest an Empty Panel inside an extra decorative card.

### Buttons and inputs

| Component | Comfortable | Compact | Anatomy / rules |
| --- | --- | --- | --- |
| Default button/input/select | 36px min height | 32px min height | 12px horizontal inset, 14/20 label, radius 6px |
| Small button | 32px | 28px | 8px inset; 12/16 text only for secondary actions |
| Large button | 40px | 36px | 16px inset; primary form action |
| Icon button | 36×36px | 32×32px | 16px icon; tooltip + aria-label required |
| Dense row accessory | 28×28px | 28×28px | 16px icon, ≥4px separation |
| Textarea | 96px min height | 80px min height | 12px inset; 14/20 UI or 13/20 code |

Button variants: primary uses accent-fill/on-accent and explicit accent-hover/pressed; secondary uses surface-3/text-1; outline uses surface-1/text-1/border-control; ghost uses transparent/text-2 with surface-3 hover; link uses accent-ink and underline on hover/focus; destructive uses danger/on-danger. Destructive text/ghost action uses danger with danger-soft hover. Do not assume white text on dark-theme destructive buttons. One filled action per local toolbar. All variants need default, hover, pressed, focus-visible, disabled, and pending states. Pending retains button width/label, adds a 16px spinner and `aria-busy`, prevents duplicate activation. Disabled uses surface-2/text-disabled and disabled semantics, not whole-element opacity. Explain disabled dependencies in persistent helper text.

Inputs use surface-1, border-control, text-1; placeholder text-3. Persistent label above, 4px gap; helper/error below, 4px gap. Error adds danger border and a text message connected by `aria-describedby`; retain user input and focus the first invalid field on submit. Read-only uses surface-2 and remains selectable. Textareas wrap prose; code textareas preserve lines with local horizontal scroll. Icons never replace labels. Search input uses a leading Search icon and trailing Clear button only while nonempty.

### Localized date and time entry

Replace user-facing native `datetime-local`/`date` controls with a shared `DateTimePicker` composed from the existing Radix Popover, Input, Button, and Select. Native formatting cannot be forced by the Vietnamese UI language.

- Trigger displays a localized full numeric date and 24-hour time: vi `24/11/2026 09:30`; en `11/24/2026 09:30`. Placeholder vi `dd/mm/yyyy`, en `mm/dd/yyyy`, with localized visible helper instructions. English uses month-first entry; Vietnamese uses day-first. `Intl.DateTimeFormat` formats all displayed dates; explicit parsers handle these known numeric entry patterns rather than `Date.parse` of localized text.
- Popover width 320px, 16px padding: date input, month heading with previous/next controls, 7-column calendar, then separately labeled hour/minute numeric fields. Time fields always use HH:mm, inputmode numeric, valid 00–23 and 00–59. Date-only use omits time. Provide Today, Clear, Cancel, Apply; Clear is absent for required values. Optional time has an explicit “Add time” control; a date-only task remains date-only rather than silently acquiring midnight.
- Vietnamese week starts Monday; English week starts Sunday. Calendar grid has one tab stop with arrow-day navigation, Home/End week, PageUp/Down month, Enter selection. Selected day uses accent-soft + accent border; Today uses a dot and accessible label, not color alone. Every cell has a full-date accessible name.
- Typed changes are draft until Apply; Cancel/Escape restores previous value. Enter in the text field validates without closing on failure. Invalid dates such as 31/02 show a localized inline error. Trigger focus is restored on close. All-day events disable time fields and preserve the underlying all-day semantics.
- Show the applicable timezone near timed entry: use existing event/task interpretation; clock timezone settings do not silently alter event timestamps. Local machine timezone and chosen calendar timezone must be named where applicable. Store using existing timestamp/date models and explicit local component conversion. Validate calendar end ≥ start, recurrence/reminder dependencies, and DST-invalid local times before saving.
- The same 24-hour time field is reused for habit nudges, shutdown schedule, and settings times. No heavy date-picker dependency; build the small month grid from existing calendar/date helpers.

### Selection controls, toolbars, lists, and feedback

- **Segmented control:** 2–4 mutually exclusive values for one view/filter: Todo status, Calendar month/agenda, calculator standard/scientific, shutdown after/at. Surface-3 track, 2px inset, radius 8px; selected surface-1, text-1, subtle border. Use radio-group semantics and arrow-key movement for values, not fake tab semantics. Minimum 32px comfortable / 28px compact inner hit height. Use existing primitives or native radio inputs with styled labels.
- **Tabs:** distinct content sections within one module, such as File Tools or Calculator categories. Underline tabs on a bottom divider; 36/32px min height, 12px inset, 2px accent active underline, 14px labels. Use Radix Tabs with manual activation for expensive panels; Left/Right navigate, Enter activates. Do not wrap into two rows. At constrained widths put secondary tab choices in an explicitly labeled selection menu. Eleven developer tools use vertical navigation instead of horizontal tabs.
- **Toolbar:** one flex row, 8px gaps, 12px below; primary action left with related controls, copy/export/clear aligned right. Wrap complete groups at <720px; labels remain visible. Secondary uncommon operations go in More. Sticky toolbar uses solid app or surface background, 1px bottom border, z=10; no blur. Editor-format controls are grouped by function and have localized tooltips plus toggle states.
- **List row:** density-row-h minimum; 12px horizontal padding, 8px gaps, 1px divider, no per-row card shadow. Anatomy: optional 28px checkbox target/icon, flexible title + caption metadata, status/due date, trailing sibling action buttons. Multiline rows grow to 60/52px minimum. Hover surface-2; selected accent-soft plus inset 3px selection bar; focus-visible ring; checked task uses line-through plus checked checkbox. Row title and separate controls must not create nested interactive elements. Essential actions appear on focus-within as well as hover.
- **Loading:** reserve the expected list/editor geometry; show 3–5 skeleton rows after 200ms rather than a spinner plus unrelated skeleton block. Containers use `aria-busy`; one polite loading label. Preserve existing data on background refresh and display a small “Updating” label. Skeletons use surface-3, without pulsing under reduced motion.
- **Empty:** distinguish first use, no matches, and all done. Example vi “Không có việc đến hạn hôm nay” / en “No tasks due today” with “Xem tất cả” / “View all”; filtered empty includes Clear filters. Empty Home agenda: “Hôm nay chưa có lịch” / “Nothing scheduled today”, Add event. Never convert a failed request into an empty result.
- **Error:** compact inline alert near affected content, icon + specific localized summary + Retry; keep healthy panels interactive. Technical details are collapsed under Details, selectable for diagnostics. Persistent failure remains visible after any toast closes. Use `role=alert` only for a new actionable failure, not every stats poll.
- **Toasts:** existing Sonner, bottom-right with 16px inset, max 360px wide, surface-elevated, border-subtle, icon and concise action result. Success 4s, info 5s, errors 8s with close action; pause while hovered/focused. Max three visible. No secrets in copy feedback. Use Undo only where data restoration is actually implemented; no false Undo promise. No toast for every background autosave or timer tick.
- **Dialogs:** Radix Dialog with labeled title/description, 24px padding, radius 12px, scrim, max height `calc(100dvh - 48px)`. Standard width 480px, complex event/task editor 640px, viewport-safe max width `calc(100vw - 48px)`. Header and action footer fixed around a scrolling body. Cancel left of primary confirm on the right. Focus initial useful field; focus trap, Escape dismiss and restore trigger. For destructive AlertDialog, initial focus is Cancel; title names the object/count and confirm names the action. Dirty editor close prompts Save / Discard / Cancel; never silently discard. Outside-click does not discard unsaved work.
- **Badges:** 12/16 text, 4px horizontal and 2px vertical padding, radius 4px, minimum height 20px. Neutral surface-3/text-2; status uses matching soft background and semantic foreground plus a word/icon. Priority labels are localized, never raw enum values. No uppercase transform. Clickable filters are buttons, not badges.
- **Keyboard hints:** semantic `kbd`, code 12/16, 4px horizontal inset, min height 20px, radius 4px, surface-2/text-2/border-subtle. Display real enabled shortcuts only. Adjacent label supplies purpose; chips are never the sole accessible name.

### Command palette

Keep cmdk and the current `dn-open-palette` event / Ctrl+K. Dialog width 640px, top offset `min(12vh, 96px)`, max height `min(560px, calc(100dvh - 64px))`. Search row 48px, results scroll independently, persistent 32px footer with arrow/Enter/Escape hints. Empty query shows Favorites, then navigation/recently used commands where history already exists; do not fabricate usage history. Search matches Vietnamese with/without diacritics and English names. Group labels use caption/600 sentence case. Result row minimum 44px with icon, action-first title, optional 12px secondary text, optional shortcut.

Preserve calculator, currency, create-task, vault, scratchpad, navigation, note, snippet, and event capabilities. Make effects explicit: “Hoàn thành: …” / “Complete: …” for todo matches; “Sao chép mật khẩu: …” / “Copy password: …” for unlocked vault entries. Locked vault exposes Unlock only; no secret preview. Do not nest a username-copy button inside a cmdk item; offer separate username/password result actions. Enter activates the highlighted result, Escape closes, opening/closing restores focus. Search results for notes/events should open the selected record, not merely the module; carry record identity in existing routing/state when implemented. Navigation commands remain available for hidden modules. Long names wrap to two lines; no silent loss of command meaning.

## 5. Page-by-page layouts

All wireframes show the content region below global utilities. Source order matches reading and keyboard order. Grids use natural heights; never give every dashboard item `h-full` or universal 140px auto rows.

### Home — Today at a glance

Page title vi “Hôm nay” / en “Today”; description is the localized weekday/date. Header actions: Add task primary, Add event secondary, More → Open widget (clock/focus/CPU/sticky). Quick creation opens the actual editor rather than only navigating to its route.

At content width ≥1000px use a 12-column grid: first content band agenda span 7, due tasks span 5; second band habits span 7, focus span 5; third band scratchpad span 8, compact utilities span 4. Each band aligns at its top and uses intrinsic height. At 680–999px use two equal columns with the same sequence. Below 680px use one column in order agenda, due tasks, habits, focus, scratchpad, utilities. At 1280px with expanded sidebar, inner content is 1008px and uses the 12-column layout.

```text
Today · Tuesday, 24 November                [+ Task] [Event] [More]
┌ Today agenda (7) ─────────────┐ ┌ Due tasks (5) ────────────────┐
│ 09:30  Planning              │ │ □ Send draft     Today 16:00 │
│ 14:00  Review       View all │ │ □ Review notes       View all│
└─────────────────────────────┘ └───────────────────────────────┘
┌ Habits (7) ─────────────────┐ ┌ Focus (5) ────────────────────┐
│ □ Read   ✓ Walk    1/2 today │ │ 25:00       [Start focus]     │
└─────────────────────────────┘ └───────────────────────────────┘
┌ Scratchpad (8) ─────────────┐ ┌ Utilities (4) ────────────────┐
│ Write a quick note…         │ │ 09:30 · Ho Chi Minh City      │
│ Saved locally   Save as note│ │ Weather 31°C · CPU 12% RAM 40%│
└─────────────────────────────┘ └───────────────────────────────┘
```

Agenda shows today's next 3 events, ongoing first; no events today shows an inline empty row and next upcoming event if available. Due tasks shows up to 5 incomplete tasks, overdue first then today's due time; show overdue count and explicit “Overdue” labels. Exclude undated work from this priority preview, with View all for the full list. Checkboxes work in place and expose pending/error state. Habits shows today's due habits, up to 4 and View all; completion controls are direct and labeled. Focus shows persisted running state or a 25-minute default with Start action and link to full Focus. Do not start a second independent timer.

Scratchpad is 120px textarea, plain UI font, saved/saving/error status, Save as note and More → Clear / Open sticky widget. Preserve its existing shared persisted content and debounce behavior; flush pending changes on navigation/widget close. Clear uses confirmation when nonempty. Utilities combine compact clock, weather summary, and CPU/RAM into one 120–160px content-driven panel. Use local clock timezone's human-readable city label; raw IANA identifier in tooltip/settings. No seconds on Home. Individual utility header links navigate to details; no nested clickable container.

Remove greeting hero, introduction paragraph, Learn more button, entire 8–9-pill quick-action strip, duplicate favorites strip, recent-notes card, standalone large clock/weather/system cards, and equal-height two-column rule. Favorites belong in sidebar/palette. Empty modules shrink to their inline state; no giant blank rectangles or repeated onboarding illustrations. No bottom utilities pinned over page content.

### Calendar

PageHeader Calendar with Add event primary; ICS import/export under More. Toolbar: Today, previous/next month with labeled buttons, month/year heading, Month/Agenda segmented control. Preserve existing lunar-date/event/repetition/reminder features; weekday labels follow locale week start. Selection and Today use distinct visual indicators.

At content width ≥960px: `minmax(0,1fr) 320px`, gap 16px. Left month grid in a single panel; right selected-day agenda, followed by upcoming agenda in the same rail. Remove the separate full-width duplicate Calendar heading and the detached bottom AgendaCard. At <960px the selected-day agenda appears below the month grid; Upcoming follows as a collapsed disclosure by default. Month cells have 72px min height wide / 56px narrow, 8px padding, max two event summaries plus “+N”; retain seven columns at 704px inner width. Month grid grows vertically and page scrolls, never squeezes text. Agenda mode is chronological date-grouped rows, available at all sizes. Event click opens the existing event editor using the shared date/time picker; add from a day preselects that date.

### Todo

Remove the TodoCard outer Card/title and fixed 360px ScrollArea. Page is a full-width Section and list. PageHeader title + count, More → Clear completed with existing confirmation. Composer first row: flexible title input (minimum 240px) and Add task. Second row: labeled Due date, Priority, and a “More details” disclosure containing Repeat, Reminder and calendar-event link. Defaults: no due date, medium priority, no recurrence/reminder. Enter from title adds; Escape does not erase a draft. Date field at least 200px, priority 144px; secondary controls wrap as a two-column form below 720px rather than compressing six controls into one line. Invalid title focuses title; reminder dependency is explained inline.

Below composer: All / Active / Due / Done segmented filter, search and Sort menu (due date default; priority/title optional if implemented). Group active work into Overdue, Today, Upcoming, No date, each a plain Section heading. Rows expose checkbox, title, date/priority caption and More; expanded row or edit dialog holds recurrence, reminder and linked-event selectors rather than showing several Select controls on every row. Long titles wrap to two lines, with full text in details. Completion stays in place until the pending update succeeds; completed filter remains available. Use page scroll, not a small fixed-height box surrounded by blank space.

### Habits

Header: Habits + Add habit. Replace three large zero-stat cards with a single 72px summary strip: completed today, current streak, best streak; hide streak metrics until meaningful data exists. Category filter is a labeled Select, not an untranslated “All”. Full-width rows show habit icon/title/category, Today checkbox button, current streak and a last-7-days strip. At inner width ≥1000px show 30-day history on the row; below that, detail disclosure contains 30-day history and reminder controls. History days have tooltip/full-date accessible names; provide a textual completed-days summary and keyboard-accessible date list so tiny heatmap marks are never the only editing control. Add/edit dialog uses labeled category/color/reminder fields. Habit color is identity, not status; checked state also uses a check mark. Empty state invites Add habit in ≤200px.

### Notes

Header Notes + New note; Save belongs to editor toolbar. Workspace at content width ≥880px: 280px note list + 16px gap + flexible editor. List has search, optional tag filter, pinned group then recent notes; rows show title, two-line excerpt and localized modified date. No repeated Notes title above the list or editor. Editor header shows document title, Saved/Unsaved/Saving status, Save primary, More → Copy Markdown / Export / Pin / Delete. Keep existing explicit Save behavior; do not claim autosave for the note editor. Formatting toolbar immediately precedes text area. Edit/Preview/Split uses a segmented control; default Edit, enable Split only when editor itself is ≥720px wide. Markdown preview uses max 72ch reading width inside the fluid editor.

Below 880px, list becomes a “Notes (count)” sheet trigger above the editor; select closes sheet and focuses editor title. Empty collection starts a new draft with a short list hint rather than an empty full-height list plus a second empty editor. Dirty selection/navigation invokes Save/Discard/Cancel. Editor consumes remaining viewport height and scrolls internally. Scratchpad retains its separate existing persistence behavior.

### Passwords / Vault

Keep route identifier `passwords`; visible page title vi “Kho mật khẩu” / en “Password vault”. Locked/setup view: 440px form aligned to content left, short local-encryption/recovery explanation, persistent labels, reveal-password toggle, Caps Lock hint, unlock/create action and inline validation. No duplicate page name on a card. Preserve existing cryptography, auto-lock, clipboard-clearing and recovery limitations.

Unlocked at content width ≥880px: 280px searchable entry list + fluid details. Header actions Add entry, Lock vault; Import/Export/Health under More, retaining existing confirmations and checks. Details show title/domain, username, masked password with separate Reveal and Copy actions, TOTP value and remaining time where configured, notes. Plain text never appears in toasts/search snippets. Password generator is an editor disclosure, not a competing page hero. Below 880px use entry list then selected detail with Back to entries; no simultaneous narrow columns. Announce locked transition once and restore focus to Unlock. TOTP countdown is visual and not announced every second.

### Clipboard

Full-width list workspace; header Clipboard with capture status switch and More → Clear history. Persistent banner when capture is disabled with explicit Enable action. Toolbar: Search, All/Text/Images segmented filter, pinned-only toggle. Saved templates live in a collapsed Section below the toolbar, not an always-expanded pill wall. Rows show type icon or 48px thumbnail, two-line text preview, timestamp, Pin, Copy and More; image details offer existing Save image. On ≥960px content width show a 320px optional detail pane; below that open a dialog for full content. Copy is explicit, not ambiguous whole-row behavior. Clear confirmation states whether pinned entries are retained based on actual storage behavior. Preserve existing retention/template logic.

### Dev Tools — 11 tools

Remove DevToolsCard outer Card and duplicated “Programming tools” heading. Use a vertical Radix tab list, 176px wide, and `minmax(0,1fr)` working area, 20px gap when content width ≥960px. Left list scrolls with a maximum height of the workspace; active tool has the same selection bar as sidebar. Above list, a small tool-filter field searches the 11 names. Below 960px replace the list with a labeled “Tool” Select above the working area; never wrap 11 horizontal tabs. Remember active tool per session; keep current lazy-loaded modules.

Tools and concrete workspace anatomy:

| Tool | Workspace |
| --- | --- |
| JSON | Format / Minify / JSON to TypeScript primary action group; More contains Escape/Unescape; labeled input and read-only output, error line/column |
| Base64 | Encode/Decode segmented mode, input/output, text/file controls already supported |
| URL | Encode/Decode mode, labeled input/output and Copy result |
| JWT | Token input, decoded header/payload sections, validity status; decoding must not imply verified signature |
| Hash | Text/File segmented source; algorithm selector, input/file picker, full selectable digest with Copy |
| UUID | Version/count controls, Generate, result list with per-row Copy and Copy all |
| QR | Generate/Scan segmented mode; input and preview/output; scanner drop/select surface uses existing scanner |
| Regex | Pattern + flags, test text, matched-count status and marked results; non-color match index list |
| Time | Timestamp/date conversion fields with explicit seconds/milliseconds and timezone; Now action |
| Diff | Two labeled editors, Compare and Clear; differences include +/− markers as well as colors |
| Text | Statistics/Utilities segmented mode; source editor, word/character results, existing text transformations |

Input/output are equal columns when working-area width ≥760px, otherwise stacked. Editors minimum 220px height, expanding to remaining height; actions appear before them and Copy belongs to each output header. This means at default 1280px expanded-sidebar width, the vertical tool list leaves stacked editors; collapsing the sidebar or enlarging the window can enable side-by-side editors. Do not force two 300px editors just to preserve symmetry. Hash/QR/Text alternate sources reuse current components; no duplicated File Tools entries. User-visible acronyms still come from i18n keys.

### File Tools

Full-width Section, two underline tabs: Batch rename / Image conversion. Page-level Add files primary calls the native picker for the active tool; drop surface is a supplemental input. Initial drop surface height 144px, icon 24px, one instruction and supported types. After selection replace it with a compact 48px Add/drop strip.

At content width ≥960px: 280px configuration column plus flexible preview table; below, configuration above preview. Batch rename: ordered rule controls with examples, preview columns Original / New name / Status, conflict rows labeled, Execute rename footer includes file count and target location. Preserve actual rename Undo capabilities; only offer after confirmed success and while supported. Image conversion: format, quality, size and output folder controls; preview shows filename, dimensions, estimated/result size and status. Progress is per file plus overall summary. Do not overwrite files without explicit existing overwrite confirmation. Retain selected files and errors on partial failure. Hashing, QR scanning and text stats remain in Dev Tools.

### Calculator & Convert

Full-width workspace; underline tabs Calculator / Units / Currency / Finance. Remove the route's centered max-width wrapper and redundant Calculator card title. Calculator body: working panel max 560px + history column 280px, aligned left. At content width <880px history becomes a collapsed Section below keypad. Standard/Scientific segmented control sits above a two-line display: expression caption, result 36px tabular numerals. Keypad keys are ≥44×44px in both densities, 8px gaps; digits surface-1, operators surface-3, equals accent, Clear danger text. Scientific keys reveal within the panel without shrinking base digit hit targets. Keyboard input is scoped to the active calculator and never intercepts text entry elsewhere.

Units: labeled category, value, From/To with Swap, output and Copy; two columns at ≥720px, stacked below. Currency: same anatomy with source/last-updated status and Refresh; stale rates labeled. Finance: existing calculation categories in left selector with one readable form max 640px and a result summary; keep existing behavior and avoid inventing financial recommendations. Localize decimal/group display using `Intl.NumberFormat`; parsing must not silently turn Vietnamese decimal commas into thousands separators.

### System, including shutdown timer

Fluid dashboard: first row CPU/RAM/GPU/Network stat tiles (four columns ≥1000px, two below, one <640px). Second band two panels CPU history / RAM history. Third band Disk / Shutdown timer, then full-width Processes table. GPU/network details expand within their associated panels. Use 2-second sampling for visible presentation unless existing diagnostics require faster collection; background pages should not animate live charts. Textual current value and units accompany every chart; missing sensors show Unavailable. Tables have sticky column headings within the table region, explicit sort buttons and local horizontal scrolling.

Shutdown timer uses the existing `PowerTimerCard.tsx`, labeled vi “Hẹn giờ tắt máy” / en “Shutdown timer”. Idle anatomy: action Select (existing shutdown/restart/sleep/lock options), After/At segmented control, duration or 24-hour time input, then five presets 15/30/60/90/120 minutes. Presets only populate duration; they do not immediately schedule. Display a concrete preview sentence with action, local date/time and timezone before “Đặt hẹn giờ” / “Schedule”. Keep valid existing range (1–10080 minutes). If clock time is past today, explicitly show tomorrow's date. Shutdown/restart scheduling confirms the concrete deadline in AlertDialog with Cancel initially focused. The confirmation explains existing no-force-close/app-running behavior using current backend truth.

Scheduled state replaces the form with action/deadline, 28px countdown, and a clearly labeled neutral outline “Hủy hẹn giờ” / “Cancel timer” button. Cancellation prevents a harmful action, so it is not styled destructive. Changing action/time requires Cancel first. Show pending cancellation and wait for backend acknowledgement before claiming success. Final-minute warning is persistent and accessible with Cancel, announced once at the warning threshold; no repeated second-by-second alert or flashing. If scheduling fails keep the draft visible. Do not duplicate backend timers or introduce behavior unsupported by `src/lib/power.ts` / existing warning hook.

### Settings

Header Settings, no generic subtitle. At content width ≥1000px use 176px in-page nav + 24px gap + max 760px form column; all aligned to the shared left edge. Nav is sticky within page viewport, labeled “Settings sections”, with active accent bar. Below 1000px use a sticky Section Select at the top and the full-width form column. Selecting an anchor scrolls and focuses its h2 without hiding it under sticky chrome (`scroll-margin-top: 64px`). Scroll updates active anchor without moving keyboard focus.

Sections, in this order: Appearance (theme, 6 named swatches, density); Language & region (language, timezone); Modules & favorites (existing module visibility and favorite order); General & desktop (startup, tray, always-on-top, widgets); Shortcuts; Reminders (events/todos/habits/morning brief); Weather; Privacy & vault; Backup & restore; Updates. Preserve all current settings by assigning them to these sections, not removing less visible controls. About stays a separate footer destination.

Each is a borderless Section with settings rows divided by subtle rules. Row: label/description left, control right (control width 220px; max 50%); minimum 64px comfortable / 56px compact. Below 720px content width, stack label and full-width control with 8px gap. Accent swatches are 32px radio targets with localized name and selected check, not color-only choices. Modules use grouped rows, not a giant enclosing Card; Home, Settings and About remain reachable and unhideable. Appearance preview is a small sample row using real tokens. Immediate toggles show inline save failure and rollback if persistence fails; text credentials/paths with explicit Apply retain unsaved indication. BackupSection preserves export/import preview, encrypted password flow, merge/restore distinctions, and confirmations; describe actual data affected before restore. No global Save button for settings that persist immediately.

### Floating widgets

Keep separate always-on-top undecorated windows and existing four kinds. Use opaque surface-1, 1px border-strong, radius 10px, no global shell/gradients. Theme/accent/language follow app settings. Retain current default sizes: clock 280×140, focus 260×180, CPU 220×120, sticky 320×260. Minimum sizes equal those defaults until explicit resizing support is implemented. Widget density is fixed: 12px body inset, 32px title strip, 28px action targets, body text ≥14px. Title uses caption/600; Close has localized aria-label and tooltip.

Only empty title-strip space is a `data-tauri-drag-region`; buttons/inputs are excluded. Clock shows 36px HH:mm with optional seconds in caption plus date/city. Focus mirrors the main timer's running/paused/idle state and offers “Open Focus” rather than a second timer engine; timer digits 36px. CPU shows current percentage plus small history/text status without inventing zero values. Sticky uses UI-font 14/20 textarea, Copy / Save as note / Close; overflow actions go under More if needed. Textarea retains a visible inset focus ring. Flush pending scratchpad saves before Close and show errors without losing text. Closing widgets must not clear shared scratchpad or stop Focus. Toasts within a widget fit its width minus 16px; do not overflow a 220px window. Esc closes menus/dialogs, not the widget itself while editing.

### Remaining existing routes

Focus: left-aligned main timer panel max 640px with mode, progress, Start/Pause/Reset; history and sound controls in Sections below. Clock: fluid timezone list with a compact primary clock; Add timezone is header action. Weather: current conditions beside location controls, then seven-day forecast that changes from seven to two columns by available width; keep attribution visible. Network: two-column diagnostic panels ≥800px, stacked below, with labeled host/port inputs and explicit result states. Colors: fluid color workspace, preview and accessible contrast output, labeled code fields; no outer repeated heading. Snippets: search/category toolbar plus list/detail using Notes' 880px breakpoint; preserve placeholder expansion and copy behavior. About: max 720px reading column at shared left edge, version/update action then plain Sections for story, module catalog, privacy, shortcuts and technical details. These routes follow the same tokens, single h1 and keyboard rules; no route retains old translucent card styling.

## 6. Accessibility and interaction quality

- Target WCAG 2.2 AA. Normal text, caption, placeholders, statuses and keyboard hints must achieve ≥4.5:1 against their actual rendered background; large text ≥3:1. Essential icons, control outlines, focus rings and selected-state indicators must achieve ≥3:1 against adjacent colors. Decorative panel dividers may be lower contrast because they do not identify controls. `text-disabled` is only for truly disabled content, never important metadata. Check converted/rendered OKLCH colors rather than assuming lightness differences guarantee a ratio.
- Validate light/dark × all six accents × both densities. Pair accent-ink with accent-soft, on-accent with fill/hover/pressed, semantic colors with corresponding soft surfaces, text-3 with every surface used. These are design values, not a claim that all combinations have already been measured; contrast verification is an implementation acceptance gate. If gamut conversion or platform rendering causes a failure, adjust lightness within the same hue and record the final token change before release.
- Focus-visible uses a solid 2px ring in focus-ring with 2px offset and a surface-colored gap; never `outline-ring/50`. Inset equivalent is required where clipping would hide an external ring. Do not clip rings under sticky regions. Selected does not imply focused. Portaled menus retain a visible focus indicator.
- Desktop pointer targets ≥28×28px, default controls ≥32px; all satisfy ≥24px WCAG minimum without relying on icon dimensions. Use ≥44px for keypad and primary touch interactions; when coarse pointer is detected expand row/button targets to ≥44px without changing font size. Heatmap/chart marks have accessible larger list equivalents.
- Semantic landmarks: sidebar navigation, global utility header, main, named sections. Skip to main appears on keyboard focus. Use actual links/buttons, associated labels, `aria-current`, pressed/checked state, and meaningful localized names. Tooltips supplement rather than supply the only accessible description. Preserve meaningful reading order when moving panes into sheets.
- Modal focus is trapped/restored by Radix. Escape unwinds the topmost popover/dialog first. Do not globally bind single-letter shortcuts while editing. Announce loading completions and copy/save outcomes politely; new errors assertively once. Do not announce live clock, charts or countdown each tick.
- Support Windows High Contrast / forced-colors: native system Canvas/CanvasText/ButtonText/Highlight colors, visible real borders and outlines; preserve selection bars/checks through forced-color-aware styles. Icons use currentColor and no color-only meaning.
- At 200% text scaling, controls and page headers grow, content stacks, and scroll regions remain reachable. At OS scaling where client CSS width falls below nominal minimum, use the same one-column fallbacks; do not enforce `min-width:960px` on document content or cause horizontal page scrolling.
- `prefers-reduced-motion: reduce` disables anime.js entrance/stagger, number tweening and animated chart transitions, not only CSS animations. Default navigation appears immediately; use 100ms hover, 160ms popover fades, 220ms sidebar width transition. No page/card fly-in animation. Motion never delays input or moves focus. Disable smooth anchor scrolling under reduced motion. Essential pending spinners can become a static pending icon with text.

## 7. Incremental implementation plan

This document authorizes no source changes in the design task. The following is the implementation handoff. Preserve all existing backend, persisted data, routes, encryption, native integrations and module capabilities. Introduce no heavy dependencies; use existing Radix, cmdk, Sonner, Intl and date helpers. New user-facing labels, statuses, error summaries, menu items, placeholder/help text, tooltips, aria-labels and shortcut descriptions must be keys in both `src/locales/vi.ts` and `src/locales/en.ts`; no language branching or string replacement inside JSX. Preserve current i18n typing in `src/lib/i18n.tsx` and route metadata in `src/lib/page-meta.ts`.

### Phase 1 — foundation, without route restructuring

1. `src/index.css`: replace theme/accent tokens and Tailwind mappings per §2; remove body gradients and card translucency assumptions. Replace generic density selectors (including `.space-y-4` and `aside nav button`) with explicit component tokens. Remove global page-enter transform and double CSS/anime entry behavior. Keep existing alias names so old components render throughout migration.
2. `src/components/ui/card.tsx`, `button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `tabs.tsx`, `badge.tsx`, `tooltip.tsx`, `popover.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sonner.tsx`: apply opaque surfaces, sizes, elevation, focus and states. Add small Panel variant props while keeping existing Card exports; no data/logic changes. Confirm destructive foreground works in both themes.
3. `src/components/ui/state-block.tsx`, `skeleton.tsx`, `alert.tsx`: add inline/page state sizing, contextual actions and correct announcements. `src/components/layout/PageSkeleton.tsx`: reserve real page geometry. Add reusable `src/components/ui/keyboard-hint.tsx` and `segmented-control.tsx` with the specified semantics.
4. Add required bilingual labels alongside each component change. Gate: old routes still compile and all existing controls retain readable text, focus and behavior in both themes.

### Phase 2 — shell and header contract

1. `src/components/layout/AppShell.tsx`: implement viewport grid, nav min-height chain, fixed App footer, expanded/collapsed widths, shared gutters, duplicate-free favorites and keyboard-visible Star controls. Keep sidebarCollapsed persistence and hidden-route behavior. `src/lib/nav.ts`: keep five groups; move only App rendering, and mark About unhideable alongside Home/Settings. `src/components/settings/ModulesSection.tsx` reflects that rule. Normalize stale hidden/favorite values in `src/lib/settings.ts` / `settings-context.tsx` without deleting user favorites for other routes.
2. `src/components/layout/AppHeader.tsx`: utilities only, selected-mode menus, stateful Pin label and <1200px Options behavior. Connect shortcut events to the existing handlers in `src/App.tsx` / ShortcutsDialog; keep command palette event contract.
3. Add `src/components/layout/PageHeader.tsx`, `Section.tsx`, `PageLayout.tsx`: typed title/description/actions, width-family and scroll-mode contracts. Each `src/pages/*Page.tsx` adopts its own PageHeader; remove route h1 from AppHeader in the same atomic change so no intermediate route loses its title. `src/lib/page-meta.ts` supplies consistent labels. WidgetPage is intentionally excluded from routed shell.
4. Gate: at 960×680 and 1440×960, with all modules and many favorites, Settings/About/Collapse never overlap or scroll away. Sidebar wheel does not scroll main content. Active current hidden page remains reachable. Every route has exactly one visible h1.

### Phase 3 — daily workflow

1. `src/pages/HomePage.tsx`, `src/components/bento/BentoGrid.tsx`: implement intrinsic-height bands and explicit column spans; remove universal row floors and Home's `xl:grid-cols-2` equal-card override. Add dashboard focus preview reusing `src/lib/focus.ts`. Update `AgendaCard.tsx`, `WeatherCard.tsx`, `ClockCard.tsx` with explicit summary variants where useful; no duplicate clock/system card instances just for styling.
2. Add `src/components/ui/date-time-picker.tsx` and small date-only/time-field helpers in the same directory; reuse `src/lib/events.ts` date conversions and localeTag. Update `TodoCard.tsx`, `CalendarCard.tsx`, `HabitsCard.tsx` and time settings call sites. Preserve timestamp/all-day semantics. Test Vietnamese and English parsing, invalid dates, DST gaps and midnight boundaries.
3. `src/pages/TodoPage.tsx`, `src/components/cards/TodoCard.tsx`: remove outer Card/header and fixed-height list, restructure composer, row details and grouped list. `CalendarPage.tsx`, `CalendarCard.tsx`, `AgendaCard.tsx`: merge agenda rail and responsive stacking without duplicating selected-day content. `HabitsPage.tsx`, `HabitsCard.tsx`: compact summary, check-in rows, accessible history.
4. Gate: a user can add a Vietnamese due date, set reminder/recurrence, edit a calendar event and check a habit using keyboard only; data remains identical through layout changes. Home shows agenda and due work before scratchpad/utilities with empty or populated data.

### Phase 4 — libraries and tools

1. `NotesPage.tsx` / `NotesCard.tsx`, `PasswordsPage.tsx` / `PasswordsCard.tsx`, `ClipboardPage.tsx` / `ClipboardCard.tsx`, `SnippetsPage.tsx` / `SnippetsCard.tsx`: remove page caps and repeated titles; implement workspace breakpoints, sheets/details and pending/dirty states. Reuse `src/components/ui/sheet.tsx` and existing vault/security functions. Do not alter secret persistence or clipboard-clearing semantics.
2. `DevToolsPage.tsx`, `DevToolsCard.tsx`, `src/components/tools/devtools/*.tsx`: vertical tool selector and responsive editor widths. Reuse `HasherTab.tsx`, `QrScannerTab.tsx`, `TextInspectorTab.tsx` under the specified Hash/QR/Text modes. Preserve lazy loading, tool contents and drafts across selection where they currently persist.
3. `FileToolsPage.tsx`, `FileToolsCard.tsx`, `BatchRenamerTab.tsx`, `ImageConverterTab.tsx`: replace outer Card with tabs/workspace, compact selected-file drop area and preview/status layout. `CalculatorPage.tsx`, `CalculatorCard.tsx`, `CurrencyCard.tsx`: full-width workspace, bounded keypad/history and correct number formatting.
4. `ColorsPage.tsx`, `ColorStudioCard.tsx`, `NetworkPage.tsx`, `NetworkToolsCard.tsx`, `FocusPage.tsx`, `FocusCard.tsx`, `ClockPage.tsx`, `ClockCard.tsx`, `WeatherPage.tsx`, `WeatherCard.tsx`, `AboutPage.tsx`: apply remaining route contracts and single-title rule. Remove individual anime.js page entrance effects from all migrated pages.
5. Gate: all 11 developer tools and both File Tools are reachable at minimum size; editors/tables scroll locally; Notes drafts and Vault lock behavior survive navigation; calculator keyboard input never hijacks another field.

### Phase 5 — system, settings, palette and widgets

1. `src/pages/SystemPage.tsx`, `src/components/cards/SystemCards.tsx`, `src/components/charts/Sparkline.tsx`: implement stat/history/detail arrangement with truthful unknown/stale states. `PowerTimerCard.tsx`: scheduling preview, confirmation, neutral Cancel timer, pending and final-minute states. Reuse `src/lib/power.ts` and `src/hooks/usePowerWarnings.ts`; no parallel scheduling engine.
2. `src/pages/SettingsPage.tsx`, `src/components/settings/BackupSection.tsx`, `ModulesSection.tsx`: section anchors, responsive in-page nav and consistent rows. Extract presentation-only section components as needed, preserving all existing controls and persistence timing.
3. `src/components/layout/CommandPalette.tsx`, `src/components/ui/command.tsx`: localized effect-first results, no nested interactive result buttons, keyboard footer and selected-record navigation. `src/lib/routing.ts` / `src/hooks/useHashRoute.ts` may carry record identity while preserving current module hashes. Do not let palette result selection bypass a dirty-document prompt.
4. `src/pages/WidgetPage.tsx`, `src/lib/routing.ts`: widget chrome, localized labels, restricted drag area, textarea focus and save flush; preserve existing window sizes/always-on-top behavior. `src/components/layout/ShortcutsDialog.tsx`: document actual implemented shortcuts and no aspirational shortcuts.
5. Gate: native Windows build schedules/cancels a timer correctly, widget close preserves scratchpad, settings anchor focus works, palette commands clearly identify effects, and all current module capabilities remain available.

### Phase 6 — acceptance and completion

Run the repository's existing `pnpm typecheck`, `pnpm lint`, `pnpm test`, and `pnpm build` after implementation. Add meaningful tests for localized picker parsing/date boundaries, sidebar footer/scroll reachability, record navigation, and timer pending/confirmation behavior; avoid snapshot tests that merely mirror classes. Validate native-only functionality in Tauri, not just a browser preview.

Manually inspect 960×680, 1280×860 and 1440×960, expanded/collapsed sidebar, both locales, empty/populated/error/loading data, comfortable/compact density. Check every theme/accent pairing for text/control/focus contrast and both normal and reduced motion. Run a keyboard pass and Windows screen reader / High Contrast pass. At 200% text scaling no footer, label, dialog action, or editor content is unreachable.

Completion criteria: App footer never overlaps navigation; a route has one title and no redundant enclosing Card; tool pages use shared content edges; Home's first viewport prioritizes agenda and due tasks; utility labels report current state; Vietnamese date entry is day-first and never displays US native placeholders; type scale and opaque surfaces are consistent in both themes. No new heavy dependencies, untranslated strings, lost functionality, or backend rewrites are required by this redesign.
