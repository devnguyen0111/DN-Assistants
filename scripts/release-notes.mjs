#!/usr/bin/env node
// Release guard + notes for .github/workflows/release.yml.
//  1. The pushed tag must equal v<package.json version> (and tauri.conf/Cargo follow it),
//     otherwise installed apps would be offered a mislabeled build forever.
//  2. The newest section of RELEASE_NOTES.md (up to the first "---" line) becomes the
//     GitHub release body, which tauri-action copies into latest.json "notes" — that is
//     what the in-app update dialog shows.
// Usage: node scripts/release-notes.mjs [tag]   (tag defaults to $GITHUB_REF_NAME)
import { readFileSync, appendFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
const cargo = readFileSync(new URL("../src-tauri/Cargo.toml", import.meta.url), "utf8");
const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME ?? "";
const expected = `v${pkg.version}`;
const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};

if (tag && tag !== expected) fail(`Tag ${tag} does not match package.json version ${expected}`);
const cargoVersion = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
if (cargoVersion !== pkg.version) {
  fail(`src-tauri/Cargo.toml version ${cargoVersion} != package.json ${pkg.version}`);
}

const notes = readFileSync(new URL("../RELEASE_NOTES.md", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const section = notes.split(/\n---\s*\n/)[0].trim();
if (!section.split("\n")[0].includes(pkg.version)) {
  fail(`RELEASE_NOTES.md must start with a section for ${pkg.version}`);
}

if (process.env.GITHUB_OUTPUT) {
  const delim = `NOTES_${Date.now()}`;
  appendFileSync(process.env.GITHUB_OUTPUT, `body<<${delim}\n${section}\n${delim}\n`);
}
console.log(section);
