import { describe, expect, it } from "vitest";
import {
  createVaultMeta,
  decryptString,
  deriveVaultKey,
  encryptString,
  generatePassword,
  verifyMasterPassword,
} from "@/lib/vault-crypto";

describe("vault crypto", () => {
  it("verifies the right master password only", async () => {
    const meta = await createVaultMeta("correct horse");
    expect(await verifyMasterPassword("correct horse", meta)).not.toBeNull();
    expect(await verifyMasterPassword("wrong", meta)).toBeNull();
  });

  it("round-trips and uses a fresh nonce each time", async () => {
    const meta = await createVaultMeta("pw");
    const key = await deriveVaultKey("pw", meta.salt);
    const a = await encryptString(key, "secret ✓");
    const b = await encryptString(key, "secret ✓");
    expect(a.nonce).not.toBe(b.nonce);
    expect(await decryptString(key, a.nonce, a.ciphertext)).toBe("secret ✓");
  });

  it("generates passwords within bounds from the chosen alphabet", () => {
    const digitsOnly = generatePassword({
      length: 4,
      lowercase: false,
      uppercase: false,
      digits: true,
      symbols: false,
    });
    expect(digitsOnly).toMatch(/^\d{8}$/); // clamped to the minimum length of 8
    const long = generatePassword({
      length: 500,
      lowercase: true,
      uppercase: true,
      digits: true,
      symbols: true,
    });
    expect(long).toHaveLength(128);
  });
});
