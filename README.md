# DN Assistant

Desktop utility app built with **Tauri 2**, **React 19**, **shadcn/ui**, **Lucide**, and **Anime.js**.

## Features

- Live clock with locale-aware date formatting (vi/en)
- Month calendar with schedule notes (SQLite)
- Basic calculator with expression parser (no `eval`)
- System monitor: CPU, RAM, network, NVIDIA GPU (NVML)

## Develop

Prerequisites: Node 18+, pnpm, Rust stable (MSVC on Windows), WebView2.

```bash
pnpm install
pnpm tauri dev
```

## Build

```bash
pnpm tauri build
```

Installer output is under `src-tauri/target/release/bundle/`.
