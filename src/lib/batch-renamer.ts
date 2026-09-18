export type CaseTransform =
  | "none"
  | "lower"
  | "upper"
  | "title"
  | "camel"
  | "kebab"
  | "snake";

export type NumberPosition = "prefix" | "suffix" | "replace";

export type BatchRenameRule = {
  // Find & Replace
  find: string;
  replace: string;
  isRegex: boolean;
  matchCase: boolean;

  // Add Prefix & Suffix
  prefix: string;
  suffix: string;

  // Case Transform
  caseTransform: CaseTransform;

  // Numbering
  enableNumbering: boolean;
  startNumber: number;
  step: number;
  digits: number; // e.g., 2 -> 01, 3 -> 001
  numberPosition: NumberPosition;
  numberSeparator: string; // e.g. " - " or "_"

  // Extension
  extensionMode: "keep" | "lower" | "upper" | "custom";
  customExtension: string;
};

export const DEFAULT_BATCH_RENAME_RULE: BatchRenameRule = {
  find: "",
  replace: "",
  isRegex: false,
  matchCase: false,
  prefix: "",
  suffix: "",
  caseTransform: "none",
  enableNumbering: false,
  startNumber: 1,
  step: 1,
  digits: 2,
  numberPosition: "suffix",
  numberSeparator: "_",
  extensionMode: "keep",
  customExtension: "",
};

export type RenamedItem = {
  id: string;
  originalName: string;
  originalPath?: string;
  size: number;
  newName: string;
  hasCollision: boolean;
  isChanged: boolean;
};

function splitNameAndExt(filename: string): { base: string; ext: string } {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot <= 0) {
    return { base: filename, ext: "" };
  }
  return {
    base: filename.slice(0, lastDot),
    ext: filename.slice(lastDot + 1),
  };
}

function transformCase(text: string, type: CaseTransform): string {
  switch (type) {
    case "lower":
      return text.toLowerCase();
    case "upper":
      return text.toUpperCase();
    case "title":
      return text.replace(/\b\w/g, (c) => c.toUpperCase());
    case "camel":
      return text
        .toLowerCase()
        .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase());
    case "kebab":
      return text
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9-]/g, "");
    case "snake":
      return text
        .toLowerCase()
        .replace(/\s+/g, "_")
        .replace(/[^a-z0-9_]/g, "");
    case "none":
    default:
      return text;
  }
}

/**
 * Transforms a single filename based on the configured rules.
 */
export function renameOne(
  filename: string,
  index: number,
  rule: BatchRenameRule,
): string {
  const { base: origBase, ext: origExt } = splitNameAndExt(filename);
  let base = origBase;
  let ext = origExt;

  // 1. Find and Replace
  if (rule.find) {
    try {
      if (rule.isRegex) {
        const flags = rule.matchCase ? "g" : "gi";
        const re = new RegExp(rule.find, flags);
        base = base.replace(re, rule.replace);
      } else {
        if (rule.matchCase) {
          base = base.split(rule.find).join(rule.replace);
        } else {
          const re = new RegExp(rule.find.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
          base = base.replace(re, rule.replace);
        }
      }
    } catch {
      // invalid regex, keep base
    }
  }

  // 2. Case transformation
  if (rule.caseTransform !== "none") {
    base = transformCase(base, rule.caseTransform);
  }

  // 3. Prefix & Suffix
  if (rule.prefix) {
    base = `${rule.prefix}${base}`;
  }
  if (rule.suffix) {
    base = `${base}${rule.suffix}`;
  }

  // 4. Numbering
  if (rule.enableNumbering) {
    const numVal = rule.startNumber + index * rule.step;
    const numStr = String(numVal).padStart(Math.max(1, rule.digits), "0");
    const sep = rule.numberSeparator || "";

    if (rule.numberPosition === "prefix") {
      base = `${numStr}${sep}${base}`;
    } else if (rule.numberPosition === "suffix") {
      base = `${base}${sep}${numStr}`;
    } else if (rule.numberPosition === "replace") {
      base = `${numStr}`;
    }
  }

  // 5. Extension
  if (rule.extensionMode === "lower") {
    ext = ext.toLowerCase();
  } else if (rule.extensionMode === "upper") {
    ext = ext.toUpperCase();
  } else if (rule.extensionMode === "custom") {
    ext = rule.customExtension.replace(/^\./, "");
  }

  return ext ? `${base}.${ext}` : base;
}

/**
 * Applies renaming rules across a batch of files and detects name collisions.
 */
export function applyBatchRename(
  items: { id: string; name: string; size: number; path?: string }[],
  rule: BatchRenameRule,
): RenamedItem[] {
  const newNames: string[] = [];
  const counts = new Map<string, number>();

  items.forEach((item, index) => {
    const newName = renameOne(item.name, index, rule);
    newNames.push(newName);
    counts.set(newName.toLowerCase(), (counts.get(newName.toLowerCase()) ?? 0) + 1);
  });

  return items.map((item, index) => {
    const newName = newNames[index];
    const isCollision = (counts.get(newName.toLowerCase()) ?? 0) > 1;
    const isChanged = newName !== item.name;

    return {
      id: item.id,
      originalName: item.name,
      originalPath: item.path,
      size: item.size,
      newName,
      hasCollision: isCollision,
      isChanged,
    };
  });
}

/**
 * Generates an executable script (PowerShell .ps1 or Windows Batch .bat) for renaming.
 */
export function generateBatchScript(
  items: RenamedItem[],
  format: "powershell" | "cmd" = "powershell",
): string {
  const changed = items.filter((i) => i.isChanged && !i.hasCollision);
  if (changed.length === 0) return "";

  if (format === "powershell") {
    const lines = [
      "# DN Assistant Batch Renamer Script",
      "# Run this in PowerShell within the target folder",
      "$ErrorActionPreference = 'Stop'",
      "Write-Host 'Starting batch rename of " + changed.length + " files...' -ForegroundColor Cyan",
      "",
    ];

    changed.forEach((item) => {
      const src = item.originalName.replace(/'/g, "''");
      const dst = item.newName.replace(/'/g, "''");
      lines.push(`if (Test-Path -LiteralPath '${src}') { Rename-Item -LiteralPath '${src}' -NewName '${dst}' }`);
    });

    lines.push("");
    lines.push("Write-Host 'Done! " + changed.length + " files renamed successfully.' -ForegroundColor Green");
    return lines.join("\r\n");
  }

  // Windows Command Prompt Batch (.bat)
  const lines = [
    "@echo off",
    "chcp 65001 > nul",
    "echo [DN Assistant] Renaming " + changed.length + " files...",
    "",
  ];

  changed.forEach((item) => {
    const src = item.originalName.replace(/"/g, '""');
    const dst = item.newName.replace(/"/g, '""');
    lines.push(`if exist "${src}" ren "${src}" "${dst}"`);
  });

  lines.push("");
  lines.push("echo Renaming complete!");
  lines.push("pause");
  return lines.join("\r\n");
}
