import { describe, expect, it } from "vitest";
import { generateTotp } from "@/lib/totp";

// RFC 6238 appendix B (SHA1) — secret "12345678901234567890", last 6 digits.
const SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("generateTotp", () => {
  it.each([
    [59, "287082"],
    [1111111109, "081804"],
    [1234567890, "005924"],
    [2000000000, "279037"],
  ])("t=%i -> %s", (seconds, code) => {
    expect(generateTotp(SECRET, seconds * 1000).code).toBe(code);
  });

  it("reports seconds remaining in the 30s window", () => {
    expect(generateTotp(SECRET, 59_000).remaining).toBe(1);
    expect(generateTotp(SECRET, 60_000).remaining).toBe(30);
  });

  it("tolerates lowercase and spaces in the secret", () => {
    expect(generateTotp("gezd gnbv gy3t qojq gezd gnbv gy3t qojq", 59_000).code).toBe("287082");
  });
});
