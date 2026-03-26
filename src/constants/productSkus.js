/** UC = (cases × ucMultiplier) / UC_DIVISOR — divisor is fixed for all products. */
export const UC_DIVISOR = 5.678;

/** Built-in catalogue (names must stay stable for rate groups & history). */
export const DEFAULT_SKUS = [
  { name: "Coca Cola 300ml", category: "CSD", kgPerCase: 8.28, ucMultiplier: 7.2, rate: 480 },
  { name: "Coca Cola 500ml", category: "CSD", kgPerCase: 13.16, ucMultiplier: 12, rate: 625 },
  { name: "Coca Cola 1.25L", category: "CSD", kgPerCase: 15.85, ucMultiplier: 15, rate: 640 },
  { name: "Fanta 300ml", category: "CSD", kgPerCase: 8.28, ucMultiplier: 7.2, rate: 480 },
  { name: "Fanta 500ml", category: "CSD", kgPerCase: 13.16, ucMultiplier: 12, rate: 625 },
  { name: "Fanta 1.25L", category: "CSD", kgPerCase: 15.85, ucMultiplier: 15, rate: 640 },
  { name: "Sprite 300ml", category: "CSD", kgPerCase: 8.28, ucMultiplier: 7.2, rate: 480 },
  { name: "Sprite 500ml", category: "CSD", kgPerCase: 13.16, ucMultiplier: 12, rate: 625 },
  { name: "Sprite 1.25L", category: "CSD", kgPerCase: 15.85, ucMultiplier: 15, rate: 640 },
  { name: "Charge 300ml", category: "CSD", kgPerCase: 8.28, ucMultiplier: 7.2, rate: 480 },
  { name: "CAN 300ml", category: "CSD", kgPerCase: 8.28, ucMultiplier: null, rate: 750 },
  { name: "Kinley 200ml", category: "Water", kgPerCase: 5.4, ucMultiplier: 4.8, rate: 95 },
  { name: "Kinley 500ml", category: "Water", kgPerCase: 13.2, ucMultiplier: 12, rate: 135 },
  { name: "Kinley 1L", category: "Water", kgPerCase: 12.5, ucMultiplier: 12, rate: 115 },
];

export const DEFAULT_SKU_NAMES = new Set(DEFAULT_SKUS.map((s) => s.name));

/** Line key for calculator & rates: "Brand" + optional variant e.g. "300ml". */
export function customProductLineName(name, sku) {
  const n = String(name ?? "").trim();
  const s = String(sku ?? "").trim();
  if (!n && !s) return "";
  if (!s) return n;
  if (!n) return s;
  return `${n} ${s}`;
}
