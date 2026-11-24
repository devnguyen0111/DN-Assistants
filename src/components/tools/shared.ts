import { toast } from "sonner";

/** Copy plain (non-secret) text and toast `label`. */
export async function copyText(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(label);
  } catch (err) {
    toast.error(err instanceof Error ? err.message : String(err));
  }
}

export async function computeHash(
  buffer: ArrayBuffer,
  algorithm: "SHA-256" | "SHA-1" | "SHA-512",
): Promise<string> {
  const hashBuffer = await crypto.subtle.digest(algorithm, buffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
