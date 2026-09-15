# DN Assistant

Desktop utility app built with **Tauri 2**, **React 19**, **shadcn/ui**, **Lucide**, and **Anime.js**.

**Version 0.2.0**

## Features

- Home dashboard with greeting, quick actions, scratch pad, favorites, clock, agenda, system snapshot, weather, todos, notes, and TikTok streaks
- Multi-page shell with grouped sidebar + pin-to-favorites, page-aware header, density modes, bilingual vi/en
- First-run onboarding and What's New dialog after updates
- Command palette (`Ctrl+K`) for navigation, events, notes, vault search, math, currency (`100 usd to vnd`), and scratch pad actions
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
- Export/import JSON data + encrypted `.dnbackup` backups and diagnostics export

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
