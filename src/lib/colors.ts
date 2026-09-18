export type RgbColor = { r: number; g: number; b: number };
export type HslColor = { h: number; s: number; l: number };
export type HsvColor = { h: number; s: number; v: number };
export type CmykColor = { c: number; m: number; y: number; k: number };

export type ContrastResult = {
  ratio: number;
  normalAa: boolean;
  normalAaa: boolean;
  largeAa: boolean;
  largeAaa: boolean;
};

export type HarmonyType =
  | "complementary"
  | "analogous"
  | "triadic"
  | "tetradic"
  | "splitComplementary"
  | "monochromatic";

export function clamp(val: number, min: number, max: number): number {
  return Math.min(Math.max(val, min), max);
}

export function hexToRgb(hex: string): RgbColor | null {
  const clean = hex.replace(/^#/, "").trim();
  if (!/^([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(clean)) return null;

  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return { r, g, b };
  }

  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function rgbToHex({ r, g, b }: RgbColor): string {
  const pr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const pg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const pb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  return `#${pr}${pg}${pb}`.toUpperCase();
}

export function rgbToHsl({ r, g, b }: RgbColor): HslColor {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  const max = Math.max(nr, ng, nb);
  const min = Math.min(nr, ng, nb);
  const delta = max - min;

  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (delta !== 0) {
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    switch (max) {
      case nr:
        h = ((ng - nb) / delta + (ng < nb ? 6 : 0)) / 6;
        break;
      case ng:
        h = ((nb - nr) / delta + 2) / 6;
        break;
      case nb:
        h = ((nr - ng) / delta + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb({ h, s, l }: HslColor): RgbColor {
  const nh = (((h % 360) + 360) % 360) / 360;
  const ns = clamp(s, 0, 100) / 100;
  const nl = clamp(l, 0, 100) / 100;

  if (ns === 0) {
    const val = Math.round(nl * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    let nt = t;
    if (nt < 0) nt += 1;
    if (nt > 1) nt -= 1;
    if (nt < 1 / 6) return p + (q - p) * 6 * nt;
    if (nt < 1 / 2) return q;
    if (nt < 2 / 3) return p + (q - p) * (2 / 3 - nt) * 6;
    return p;
  };

  const q = nl < 0.5 ? nl * (1 + ns) : nl + ns - nl * ns;
  const p = 2 * nl - q;

  const r = hue2rgb(p, q, nh + 1 / 3);
  const g = hue2rgb(p, q, nh);
  const b = hue2rgb(p, q, nh - 1 / 3);

  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
}

export function rgbToCmyk({ r, g, b }: RgbColor): CmykColor {
  const nr = r / 255;
  const ng = g / 255;
  const nb = b / 255;

  const k = 1 - Math.max(nr, ng, nb);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }

  const c = Math.round(((1 - nr - k) / (1 - k)) * 100);
  const m = Math.round(((1 - ng - k) / (1 - k)) * 100);
  const y = Math.round(((1 - nb - k) / (1 - k)) * 100);
  const roundedK = Math.round(k * 100);

  return { c, m, y, k: roundedK };
}

export function getLuminance({ r, g, b }: RgbColor): number {
  const a = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

export function getContrast(foreground: RgbColor, background: RgbColor): ContrastResult {
  const lum1 = getLuminance(foreground);
  const lum2 = getLuminance(background);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  const ratio = Number(((brightest + 0.05) / (darkest + 0.05)).toFixed(2));

  return {
    ratio,
    normalAa: ratio >= 4.5,
    normalAaa: ratio >= 7.0,
    largeAa: ratio >= 3.0,
    largeAaa: ratio >= 4.5,
  };
}

export function generateHarmonies(baseHex: string): Record<HarmonyType, string[]> {
  const rgb = hexToRgb(baseHex) ?? { r: 14, g: 165, b: 233 };
  const hsl = rgbToHsl(rgb);

  const rotate = (deg: number, satMod = 0, lightMod = 0) => {
    const nh = (hsl.h + deg + 360) % 360;
    const ns = clamp(hsl.s + satMod, 10, 100);
    const nl = clamp(hsl.l + lightMod, 10, 90);
    return rgbToHex(hslToRgb({ h: nh, s: ns, l: nl }));
  };

  return {
    complementary: [baseHex, rotate(180)],
    analogous: [rotate(-30), baseHex, rotate(30)],
    triadic: [baseHex, rotate(120), rotate(240)],
    tetradic: [baseHex, rotate(90), rotate(180), rotate(270)],
    splitComplementary: [baseHex, rotate(150), rotate(210)],
    monochromatic: [
      rotate(0, 0, -30),
      rotate(0, 0, -15),
      baseHex,
      rotate(0, 0, 15),
      rotate(0, 0, 30),
    ],
  };
}

export async function extractPaletteFromImage(fileOrBlob: Blob): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(fileOrBlob);

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve([]);
          return;
        }

        const width = 120;
        const height = Math.max(1, Math.round((img.height / img.width) * width));
        canvas.width = width;
        canvas.height = height;

        ctx.drawImage(img, 0, 0, width, height);
        const data = ctx.getImageData(0, 0, width, height).data;
        URL.revokeObjectURL(url);

        const colorMap = new Map<string, { r: number; g: number; b: number; count: number }>();
        const step = 4; // sample every 4th pixel

        for (let i = 0; i < data.length; i += 4 * step) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          const a = data[i + 3];

          if (a < 128) continue; // skip transparent

          // Quantize to 16-step grid
          const qr = Math.round(r / 24) * 24;
          const qg = Math.round(g / 24) * 24;
          const qb = Math.round(b / 24) * 24;
          const key = `${qr},${qg},${qb}`;

          const existing = colorMap.get(key);
          if (existing) {
            existing.count++;
          } else {
            colorMap.set(key, { r: qr, g: qg, b: qb, count: 1 });
          }
        }

        const sorted = Array.from(colorMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 24);

        // Filter for distinct colors (Euclidean distance > 45)
        const distinct: Array<{ r: number; g: number; b: number }> = [];
        for (const item of sorted) {
          const isTooClose = distinct.some((d) => {
            const dist = Math.sqrt(
              Math.pow(item.r - d.r, 2) + Math.pow(item.g - d.g, 2) + Math.pow(item.b - d.b, 2),
            );
            return dist < 48;
          });
          if (!isTooClose) {
            distinct.push(item);
          }
          if (distinct.length >= 6) break;
        }

        const hexes = distinct.map((rgb) => rgbToHex(rgb));
        resolve(hexes.length > 0 ? hexes : ["#0EA5E9", "#10B981", "#8B5CF6"]);
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };

    img.src = url;
  });
}
