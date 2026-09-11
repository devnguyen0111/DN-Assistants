# DN Assistant

Desktop utility app built with **Tauri 2**, **React 19**, **shadcn/ui**, **Lucide**, and **Anime.js**.

## Features

- Home dashboard with clock, agenda, system snapshot, and weather
- Multi-page shell with grouped sidebar: Home, Clock, Calendar, Calculator, Currency, Dev tools, Notes, Todo, Clipboard, Focus, System, Network, Weather, Settings, About
- Command palette (`Ctrl+K`) for navigation, event search, math, and currency queries (`100 usd to vnd`)
- Live clock with solar + Vietnamese lunar date (Can Chi), configurable primary timezone, world clocks
- Month calendar with schedule notes (SQLite), reminders (toast / OS notification / chime)
- Calculator with persistent history + unit converter; separate currency exchange via Frankfurter
- Notes and todos (SQLite), Pomodoro/Focus timer, developer toolbox (JSON/Base64/JWT/hash/UUID/QR/regex)
- Clipboard history (opt-in, off by default) with global hotkey `Ctrl+Shift+V`
- System monitor: CPU, RAM, network (per-interface), NVIDIA GPU, disks, top processes (push metrics)
- Network tools: public IP, ping, port check
- Weather via Open-Meteo (no API key) with city search and 7-day forecast
- Themes: light / dark / system, accent colors, density; bilingual vi/en
- Desktop native: system tray, close-to-tray, autostart, window state restore, global hotkey (`Ctrl+Shift+Space`), single instance, auto-updater

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

## Releases

Push a `v*` tag to trigger `.github/workflows/release.yml`. Configure repository secrets:

- `TAURI_SIGNING_PRIVATE_KEY`
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` (if the key is encrypted)
