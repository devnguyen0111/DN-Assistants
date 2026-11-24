import { describe, expect, it } from "vitest";
import { formatCountdown, secondsUntilTime } from "@/lib/power";

describe("power timer helpers", () => {
  it("targets later today, or tomorrow once the time has passed", () => {
    const now = new Date(2026, 10, 24, 22, 0, 0);
    expect(secondsUntilTime("23:30", now)).toBe(90 * 60);
    expect(secondsUntilTime("07:00", now)).toBe(9 * 3600);
    expect(secondsUntilTime("22:00", now)).toBe(24 * 3600);
    expect(secondsUntilTime("bad", now)).toBeNull();
  });

  it("formats countdowns", () => {
    expect(formatCountdown(59)).toBe("00:59");
    expect(formatCountdown(3725)).toBe("1:02:05");
  });
});
