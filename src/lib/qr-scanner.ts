import jsQR from "jsqr";

export type QrPayloadType = "wifi" | "otp" | "url" | "email" | "text";

export type WifiDetails = {
  ssid: string;
  password?: string;
  encryption?: "WPA" | "WEP" | "nopass" | string;
  hidden?: boolean;
};

export type OtpDetails = {
  type: "totp" | "hotp";
  label: string;
  secret: string;
  issuer?: string;
  algorithm?: string;
  digits?: number;
  period?: number;
};

export type QrScanResult = {
  raw: string;
  type: QrPayloadType;
  wifi?: WifiDetails;
  otp?: OtpDetails;
  url?: string;
  email?: string;
  location?: {
    topLeftCorner: { x: number; y: number };
    topRightCorner: { x: number; y: number };
    bottomRightCorner: { x: number; y: number };
    bottomLeftCorner: { x: number; y: number };
  };
};

/**
 * Parses raw text from a QR code into structured types (WiFi, OTP 2FA, URL, Email, Text).
 */
export function parseQrContent(raw: string): Omit<QrScanResult, "location"> {
  const trimmed = raw.trim();

  // 1. Check WiFi format: WIFI:S:MySSID;T:WPA;P:MyPass;;
  if (/^WIFI:/i.test(trimmed)) {
    const ssidMatch = trimmed.match(/S:([^;]*)/i);
    const passMatch = trimmed.match(/P:([^;]*)/i);
    const typeMatch = trimmed.match(/T:([^;]*)/i);
    const hiddenMatch = trimmed.match(/H:([^;]*)/i);

    const ssid = ssidMatch ? ssidMatch[1] : "";
    const password = passMatch ? passMatch[1] : "";
    const encryption = typeMatch ? typeMatch[1] : "WPA";
    const hidden = hiddenMatch ? hiddenMatch[1].toLowerCase() === "true" : false;

    return {
      raw: trimmed,
      type: "wifi",
      wifi: { ssid, password, encryption, hidden },
    };
  }

  // 2. Check 2FA OTP Auth: otpauth://totp/Example:alice@google.com?secret=JBSWY3DPEHPK3PXP&issuer=Example
  if (/^otpauth:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const type = url.host.toLowerCase() === "hotp" ? "hotp" : "totp";
      const label = decodeURIComponent(url.pathname.replace(/^\//, ""));
      const secret = url.searchParams.get("secret") ?? "";
      const issuer = url.searchParams.get("issuer") ?? "";
      const algorithm = url.searchParams.get("algorithm") ?? "SHA1";
      const digits = Number(url.searchParams.get("digits")) || 6;
      const period = Number(url.searchParams.get("period")) || 30;

      return {
        raw: trimmed,
        type: "otp",
        otp: { type, label, secret, issuer, algorithm, digits, period },
      };
    } catch {
      // Fall through to text
    }
  }

  // 3. Check URL
  if (/^https?:\/\//i.test(trimmed)) {
    return {
      raw: trimmed,
      type: "url",
      url: trimmed,
    };
  }

  // 4. Check Email
  if (/^mailto:/i.test(trimmed)) {
    return {
      raw: trimmed,
      type: "email",
      email: trimmed.replace(/^mailto:/i, "").split("?")[0],
    };
  }

  // 5. Default: Plain text
  return {
    raw: trimmed,
    type: "text",
  };
}

/**
 * Loads an image File or Blob into an HTMLImageElement.
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image for scanning: " + String(e)));
    };
    img.src = url;
  });
}

/**
 * Scans a QR code from a File or Blob using HTML5 Canvas & jsQR.
 */
export async function scanQrFromImage(file: File | Blob): Promise<QrScanResult | null> {
  const img = await loadImage(file);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create 2D canvas context");

  // Keep dimensions reasonable if image is huge to speed up scan
  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  const maxDim = 1600;
  if (width > maxDim || height > maxDim) {
    const scale = Math.min(maxDim / width, maxDim / height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(img, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });

  if (!code || !code.data) {
    return null;
  }

  const parsed = parseQrContent(code.data);
  return {
    ...parsed,
    location: code.location,
  };
}
