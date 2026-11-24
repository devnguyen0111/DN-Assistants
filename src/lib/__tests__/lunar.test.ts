import { describe, expect, it } from "vitest";
import { getCanChiYear, solarToLunar } from "@/lib/lunar";

describe("solarToLunar (Vietnam, UTC+7)", () => {
  it("finds Tết", () => {
    expect(solarToLunar(10, 2, 2024)).toMatchObject({ day: 1, month: 1, year: 2024, leap: false });
    expect(solarToLunar(29, 1, 2025)).toMatchObject({ day: 1, month: 1, year: 2025, leap: false });
  });

  it("handles the leap 2nd month of 2023", () => {
    expect(solarToLunar(22, 3, 2023)).toMatchObject({ day: 1, month: 2, year: 2023, leap: true });
  });

  it("names Can Chi years", () => {
    expect(getCanChiYear(2024, "vi")).toBe("Giáp Thìn");
    expect(getCanChiYear(2025, "vi")).toBe("Ất Tỵ");
  });
});
