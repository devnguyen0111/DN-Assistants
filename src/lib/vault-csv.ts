/** Minimal CSV parser that supports quoted fields (Google Password Manager export). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    // Ignore completely empty trailing lines
    if (row.length === 1 && row[0] === "" && rows.length > 0) {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ",") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  pushField();
  if (row.length > 1 || (row.length === 1 && row[0] !== "")) pushRow();
  return rows;
}

export type GooglePasswordRow = {
  title: string;
  url: string;
  username: string;
  password: string;
  note: string;
};

export function parseGooglePasswordCsv(text: string): GooglePasswordRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0]!.map((h) => h.trim().toLowerCase());
  const idx = (names: string[]) => {
    for (const name of names) {
      const i = header.indexOf(name);
      if (i >= 0) return i;
    }
    return -1;
  };

  const nameIdx = idx(["name", "title"]);
  const urlIdx = idx(["url", "origin", "website"]);
  const userIdx = idx(["username", "user", "login"]);
  const passIdx = idx(["password"]);
  const noteIdx = idx(["note", "notes"]);

  if (passIdx < 0) {
    throw new Error("CSV missing password column");
  }

  const out: GooglePasswordRow[] = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r]!;
    const password = (cols[passIdx] ?? "").trim();
    if (!password) continue;
    const url = urlIdx >= 0 ? (cols[urlIdx] ?? "").trim() : "";
    const username = userIdx >= 0 ? (cols[userIdx] ?? "").trim() : "";
    const title =
      (nameIdx >= 0 ? (cols[nameIdx] ?? "").trim() : "") || url || username || "Untitled";
    const note = noteIdx >= 0 ? (cols[noteIdx] ?? "").trim() : "";
    out.push({ title, url, username, password, note });
  }
  return out;
}
