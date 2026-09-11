export type LengthUnit = "mm" | "cm" | "m" | "km" | "in" | "ft" | "yd" | "mi";
export type MassUnit = "mg" | "g" | "kg" | "oz" | "lb" | "t";
export type TempUnit = "celsius" | "fahrenheit" | "kelvin";
export type DataUnit = "B" | "KB" | "MB" | "GB" | "TB" | "KiB" | "MiB" | "GiB" | "TiB";

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
