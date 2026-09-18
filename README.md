# DN Assistant

Desktop utility app built with **Tauri 2**, **React 19**, **shadcn/ui**, **Lucide**, and **Anime.js**.

**Version 0.3.1**

## Features

- **Advanced Currency Suite**: Searchable currency picker with flags & symbols, multi-currency watchlist comparison table, international card/bank fee & spread calculator, and quick conversion reference matrix
- **Comprehensive DevTools Suite**: JSON formatting/minifying, JSON to TypeScript interface generator, Base64 text & image/file preview/download, URL Inspector with interactive query parameter editor, JWT status & expiry countdown, MD5 & HMAC security, UUID batch & NanoID generation, WiFi QR code generator, regex tester with replace & presets, timestamp & world timezones, and text/code utilities
- Home dashboard with greeting, quick actions, scratch pad, favorites, clock, agenda, system snapshot, weather, todos, notes, TikTok streaks, and daily habit check-ins
- Multi-page shell with grouped sidebar + pin-to-favorites, page-aware header, density modes, bilingual vi/en
- First-run onboarding and What's New dialog after updates
- Command palette (`Ctrl+K`) for navigation, snippets, events, notes, vault search, math, currency (`100 usd to vnd`), and scratch pad actions
- **Habit Tracker & Routine Builder**: Daily check-ins, active streaks, best streak record, and 30-day heatmap grid visualization
- **Color Studio & Palette Extractor**: Instant HEX/RGB/HSL/CMYK conversion, harmonies, image palette extraction from files/clipboard, WCAG 2.1 AA/AAA contrast checker, and CSS gradient generator
- **Snippets & Dynamic Template Library**: Reusable code snippets & canned responses with automatic placeholder replacement (`{{date}}`, `{{time}}`, `{{clipboard}}`, `{{uuid}}`), syntax tags, and quick search in Command Palette
- **Focus Soundscapes & Procedural Audio Synthesizer**: 100% offline ambient audio (Rain, Forest Wind, Ocean Waves, Campfire, Binaural Alpha Beats, White/Pink/Brown noise) with multi-channel mixer built into Pomodoro Focus mode
- **Desktop Floating Sticky Note Widget**: Always-on-top desktop sticky note with autosave, copy, and 1-click note conversion
- **File Checksum & Media Toolkit**: File hash integrity verification (SHA-256, SHA-1, SHA-512), image resizer & format converter (WebP/PNG/JPEG), and text case & word count suite
- Live clock with solar + Vietnamese lunar date (Can Chi), world clocks, floating clock widget
- Month calendar with schedule notes (SQLite), reminders, recurring daily/weekly events, ICS import/export
- Calculator with history + unit converter; currency exchange via Frankfurter / ExchangeRate-API
- Notes with Markdown preview/split, tags, and pin; todos with priority, due dates, calendar linking, and recurrence
- Clipboard history (opt-in) for text and images, transforms, pinned templates, save image to disk (`Ctrl+Shift+V`)
- Password vault with AES-GCM, TOTP authenticator codes, auto-lock, password health, optional HIBP check, CSV import
- Focus / Pomodoro timer with 7/30-day stats and floating widget
- System monitor: CPU, RAM, network, NVIDIA GPU, disks, top processes with end-process; CPU widget
- Network tools: public IP, ping, port check, DNS lookup, download speed test
- Weather via Open-Meteo; developer toolbox (JSON/Base64/JWT/hash/UUID/QR/regex/time/diff)
- Desktop native: tray, close-to-tray, autostart, always-on-top, custom global hotkeys, window state, single instance, auto-updater
- Export/import JSON data + encrypted `.dnbackup` backups (events, notes, todos, habits, snippets, vault) and diagnostics export

## Develop

Prerequisites: Node 18+, pnpm, Rust stable (MSVC on Windows), WebView2.

Ensure Cargo is on PATH (`%USERPROFILE%\.cargo\bin`).

```bash
pnpm install
pnpm tauri dev
```

Scripts: `pnpm typecheck`, `pnpm lint`, `pnpm format`, `pnpm build`.

## Build

```bash
pnpm tauri build
```

Installer output is under `src-tauri/target/release/bundle/`.

## Releases / updates

Push a `v*` tag to trigger `.github/workflows/release.yml`. The workflow creates a **draft** GitHub Release with updater artifacts (`latest.json`). **Publish** the draft so installed apps can discover the update.

Configure repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (if the key is encrypted)

Updater endpoint: `https://github.com/devnguyen0111/DN-Assistants/releases/latest/download/latest.json`
