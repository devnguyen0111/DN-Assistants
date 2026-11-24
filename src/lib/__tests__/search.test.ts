import { describe, expect, it } from "vitest";
import { foldedFilter, foldText } from "@/lib/search";

describe("diacritic-insensitive search", () => {
  it("folds Vietnamese text", () => {
    expect(foldText("Đường Lịch Việc cần làm")).toBe("duong lich viec can lam");
  });

  it("matches without accents and requires every word", () => {
    expect(foldedFilter("Lịch calendar", "lich")).toBeGreaterThan(0);
    expect(foldedFilter("Việc cần làm", "viec lam")).toBeGreaterThan(0);
    expect(foldedFilter("Việc cần làm", "viec ghi")).toBe(0);
  });
});
