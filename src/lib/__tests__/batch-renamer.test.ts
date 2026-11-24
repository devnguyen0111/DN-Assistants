import { describe, expect, it } from "vitest";
import {
  applyBatchRename,
  DEFAULT_BATCH_RENAME_RULE,
  renameOne,
  type BatchRenameRule,
} from "@/lib/batch-renamer";

const rule = (over: Partial<BatchRenameRule>): BatchRenameRule => ({
  ...DEFAULT_BATCH_RENAME_RULE,
  ...over,
});

describe("batch renamer", () => {
  it("keeps names unchanged with the default rule", () => {
    expect(renameOne("Photo.JPG", 0, DEFAULT_BATCH_RENAME_RULE)).toBe("Photo.JPG");
  });

  it("applies find/replace, prefix, suffix and extension case", () => {
    const r = rule({
      find: "IMG",
      replace: "trip",
      matchCase: true,
      prefix: "2024-",
      suffix: "-x",
      extensionMode: "lower",
    });
    expect(renameOne("IMG_001.JPG", 0, r)).toBe("2024-trip_001-x.jpg");
  });

  it("numbers files with zero padding", () => {
    const r = rule({ enableNumbering: true, numberPosition: "replace", digits: 3, startNumber: 7 });
    expect(renameOne("a.txt", 0, r)).toBe("007.txt");
    expect(renameOne("b.txt", 2, r)).toBe("009.txt");
  });

  it("flags case-insensitive collisions", () => {
    const items = [
      { id: "1", name: "a.txt", size: 1 },
      { id: "2", name: "B.txt", size: 1 },
    ];
    const out = applyBatchRename(items, rule({ find: "[ab]", replace: "x", isRegex: true }));
    expect(out.map((i) => i.newName)).toEqual(["x.txt", "x.txt"]);
    expect(out.every((i) => i.hasCollision)).toBe(true);
  });

  it("only treats same-folder names as collisions", () => {
    const items = [
      { id: "1", name: "a.txt", size: 1, path: "C:\\x\\a.txt" },
      { id: "2", name: "a.txt", size: 1, path: "C:\\y\\a.txt" },
    ];
    const out = applyBatchRename(items, rule({ prefix: "new-" }));
    expect(out.map((i) => i.newName)).toEqual(["new-a.txt", "new-a.txt"]);
    expect(out.some((i) => i.hasCollision)).toBe(false);
  });
});
