import { describe, expect, it } from "vitest";
import { classifyUpdateError, shouldPrompt } from "@/lib/updates";

describe("update prompts", () => {
  it("respects skipped versions and snoozes", () => {
    expect(shouldPrompt("0.5.1", {})).toBe(true);
    expect(shouldPrompt("0.5.1", { skippedVersion: "0.5.1" })).toBe(false);
    expect(shouldPrompt("0.5.2", { skippedVersion: "0.5.1" })).toBe(true);
    expect(shouldPrompt("0.5.1", { snoozedUntil: 2000, now: 1000 })).toBe(false);
    expect(shouldPrompt("0.5.1", { snoozedUntil: 2000, now: 3000 })).toBe(true);
  });

  it("classifies updater errors into actionable kinds", () => {
    expect(classifyUpdateError("error sending request for url (https://github.com/...)")).toBe(
      "network",
    );
    expect(classifyUpdateError("signature verification failed")).toBe("signature");
    expect(classifyUpdateError("Could not fetch a valid release JSON from the remote: 404")).toBe(
      "no-release",
    );
    expect(classifyUpdateError("something odd")).toBe("unknown");
  });
});
