import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/text";

describe("slugify", () => {
  it("strips Vietnamese diacritics including đ", () => {
    expect(slugify("Đường phố Hà Nội")).toBe("duong-pho-ha-noi");
  });

  it("collapses punctuation and repeated separators", () => {
    expect(slugify("  Hello,  World -- 2026! ")).toBe("hello-world-2026");
  });
});
