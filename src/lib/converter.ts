export type LengthUnit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd" | "mi";
export type MassUnit = "mg" | "g" | "kg" | "oz" | "lb" | "t";
export type TempUnit = "celsius" | "fahrenheit" | "kelvin";
export type DataUnit = "B" | "KB" | "MB" | "GB" | "TB" | "KiB" | "MiB" | "GiB" | "TiB";
export type SpeedUnit = "kmh" | "ms" | "mph" | "knot" | "mach";
export type AreaUnit = "sqm" | "sqkm" | "ha" | "sqft" | "acre";
export type VolumeUnit = "l" | "ml" | "cum" | "gal" | "floz" | "cup";

/** All length factors relative to meters. */
const LENGTH_TO_M: Record<LengthUnit, number> = {
  mm: 0.001,
  cm: 0.01,
  m: 1,
  km: 1000,
  in: 0.0254,
  ft: 0.3048,
  yd: 0.9144,
  mi: 1609.344,
};

/** All mass factors relative to grams. */
const MASS_TO_G: Record<MassUnit, number> = {
  mg: 0.001,
  g: 1,
  kg: 1000,
  oz: 28.349523125,
  lb: 453.59237,
  t: 1_000_000,
};

const DATA_TO_B: Record<DataUnit, number> = {
  B: 1,
  KB: 1000,
  MB: 1_000_000,
  GB: 1_000_000_000,
  TB: 1_000_000_000_000,
  KiB: 1024,
  MiB: 1024 ** 2,
  GiB: 1024 ** 3,
  TiB: 1024 ** 4,
};

/** All speed factors relative to m/s. */
const SPEED_TO_MS: Record<SpeedUnit, number> = {
  ms: 1,
  kmh: 1 / 3.6,
  mph: 0.44704,
  knot: 0.5144444444444445,
  mach: 343,
};

/** All area factors relative to square meters (m²). */
const AREA_TO_SQM: Record<AreaUnit, number> = {
  sqm: 1,
  sqkm: 1_000_000,
  ha: 10_000,
  sqft: 0.09290304,
  acre: 4046.8564224,
};

/** All volume factors relative to Liters (L). */
const VOLUME_TO_L: Record<VolumeUnit, number> = {
  l: 1,
  ml: 0.001,
  cum: 1000,
  gal: 3.785411784,
  floz: 0.0295735295625,
  cup: 0.24,
};

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  return (value * LENGTH_TO_M[from]) / LENGTH_TO_M[to];
}

export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  return (value * MASS_TO_G[from]) / MASS_TO_G[to];
}

export function convertTemp(value: number, from: TempUnit, to: TempUnit): number {
  let celsius = value;
  if (from === "fahrenheit") celsius = ((value - 32) * 5) / 9;
  else if (from === "kelvin") celsius = value - 273.15;

  if (to === "celsius") return celsius;
  if (to === "fahrenheit") return (celsius * 9) / 5 + 32;
  return celsius + 273.15;
}

export function convertData(value: number, from: DataUnit, to: DataUnit): number {
  return (value * DATA_TO_B[from]) / DATA_TO_B[to];
}

export function convertSpeed(value: number, from: SpeedUnit, to: SpeedUnit): number {
  return (value * SPEED_TO_MS[from]) / SPEED_TO_MS[to];
}

export function convertArea(value: number, from: AreaUnit, to: AreaUnit): number {
  return (value * AREA_TO_SQM[from]) / AREA_TO_SQM[to];
}

export function convertVolume(value: number, from: VolumeUnit, to: VolumeUnit): number {
  return (value * VOLUME_TO_L[from]) / VOLUME_TO_L[to];
}

export function formatConverted(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const abs = Math.abs(value);
  if (abs === 0) return "0";
  if (abs >= 1e6 || abs < 1e-4) return value.toExponential(4);
  const rounded = Math.round(value * 1e8) / 1e8;
  return String(rounded);
}

export const LENGTH_UNITS: LengthUnit[] = ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"];
export const MASS_UNITS: MassUnit[] = ["mg", "g", "kg", "oz", "lb", "t"];
export const TEMP_UNITS: TempUnit[] = ["celsius", "fahrenheit", "kelvin"];
export const DATA_UNITS: DataUnit[] = ["B", "KB", "MB", "GB", "TB", "KiB", "MiB", "GiB", "TiB"];
export const SPEED_UNITS: SpeedUnit[] = ["kmh", "ms", "mph", "knot", "mach"];
export const AREA_UNITS: AreaUnit[] = ["sqm", "sqkm", "ha", "sqft", "acre"];
export const VOLUME_UNITS: VolumeUnit[] = ["l", "ml", "cum", "gal", "floz", "cup"];
