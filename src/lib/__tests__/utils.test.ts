import { describe, expect, it } from "vitest";
import { localDateKey } from "@/lib/utils";

describe("localDateKey", () => {
  it("uses the local calendar day, not UTC", () => {
    // 00:30 local on Mar 1 is still Feb 28 in UTC for any positive offset (tests run in UTC+7).
    expect(localDateKey(new Date(2026, 2, 1, 0, 30))).toBe("2026-03-01");
  });

  it("pads month and day", () => {
    expect(localDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
});
