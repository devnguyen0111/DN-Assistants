import { describe, expect, it } from "vitest";
import { formatDateNumeric, monthGrid, parseDateNumeric, parseTime24 } from "@/lib/datetime";

describe("locale date entry", () => {
  it("parses day-first in Vietnamese and month-first in English", () => {
    expect(parseDateNumeric("24/11/2026", "vi")?.getDate()).toBe(24);
    expect(parseDateNumeric("11/24/2026", "en")?.getMonth()).toBe(10);
    expect(parseDateNumeric("24/11/2026", "en")).toBeNull();
  });

  it("rejects impossible dates instead of rolling over", () => {
    expect(parseDateNumeric("31/02/2026", "vi")).toBeNull();
    expect(parseDateNumeric("29/02/2028", "vi")?.getDate()).toBe(29);
    expect(parseDateNumeric("2026-11-24", "vi")).toBeNull();
  });

  it("formats with zero padding in locale order", () => {
    const d = new Date(2026, 0, 5);
    expect(formatDateNumeric(d, "vi")).toBe("05/01/2026");
    expect(formatDateNumeric(d, "en")).toBe("01/05/2026");
  });

  it("validates 24h times", () => {
    expect(parseTime24("9:05")).toEqual({ hours: 9, minutes: 5 });
    expect(parseTime24("24:00")).toBeNull();
    expect(parseTime24("12:60")).toBeNull();
  });

  it("starts the week on Monday for vi and Sunday for en", () => {
    // 1 Nov 2026 is a Sunday.
    const nov = new Date(2026, 10, 1);
    expect(monthGrid(nov, "vi")[0]!.getDay()).toBe(1);
    expect(monthGrid(nov, "en")[0]!.getDate()).toBe(1);
    expect(monthGrid(nov, "en")).toHaveLength(42);
  });
});
