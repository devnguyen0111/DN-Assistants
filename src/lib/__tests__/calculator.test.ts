import { describe, expect, it } from "vitest";
import { evaluate, formatResult } from "@/lib/calculator";

describe("calculator", () => {
  it("respects precedence and parentheses", () => {
    expect(evaluate("2+3*4")).toBe(14);
    expect(evaluate("(2+3)*4")).toBe(20);
    expect(evaluate("2^10")).toBe(1024);
    expect(evaluate("10 % 3")).toBe(1);
  });

  it("handles unicode operators, constants and functions", () => {
    expect(evaluate("6×7")).toBe(42);
    expect(evaluate("9÷3")).toBe(3);
    expect(evaluate("√16")).toBe(4);
    // trig functions work in degrees
    expect(formatResult(evaluate("sin(90)"))).toBe("1");
    expect(formatResult(evaluate("cos(60)"))).toBe("0.5");
  });

  it("rejects empty and malformed input", () => {
    expect(() => evaluate("")).toThrow();
    expect(() => evaluate("2+*")).toThrow();
  });

  it("formats floating point noise away", () => {
    expect(formatResult(0.1 + 0.2)).toBe("0.3");
    expect(formatResult(Infinity)).toBe("Error");
  });
});
