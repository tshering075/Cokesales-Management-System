/** Daily physical stock format: opening, secondary sale, closing by SKU line. */
export const PHYSICAL_STOCK_PRODUCT_LINES = [
  "KO 300ML",
  "FX 300ML",
  "SP 300ML",
  "CH 300ML",
  "KO 500ML",
  "FX 500ML",
  "SP 500ML",
  "KO 1.25ML",
  "FX 1.25ML",
  "SP 1.25ML",
  "KWAT 200ML",
  "KWAT 500ML",
  "KWAT 1L",
];

export function createEmptyPhysicalStockRows() {
  return PHYSICAL_STOCK_PRODUCT_LINES.map((productSku) => ({
    productSku,
    openingStockQty: "",
    secondarySale: "",
    closingStockQty: "",
  }));
}

export function rowTotal(row) {
  return Number(row?.closingStockQty) || 0;
}

/** Sum opening / secondary / closing across all SKU rows for one distributor. */
export function aggregatePhysicalStockTotals(rows) {
  if (!Array.isArray(rows)) return { opening: 0, secondary: 0, closing: 0 };
  return rows.reduce(
    (acc, r) => {
      acc.opening += Number(r?.openingStockQty) || 0;
      acc.secondary += Number(r?.secondarySale) || 0;
      acc.closing += Number(r?.closingStockQty) || 0;
      return acc;
    },
    { opening: 0, secondary: 0, closing: 0 }
  );
}

function normalizeRowShape(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return null;
  const normalizeQty = (value) => {
    if (value === "" || value == null) return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  };

  // New shape
  if (rawRow.productSku) {
    return {
      productSku: String(rawRow.productSku),
      openingStockQty: normalizeQty(rawRow.openingStockQty),
      secondarySale: normalizeQty(rawRow.secondarySale),
      closingStockQty: normalizeQty(rawRow.closingStockQty),
    };
  }

  // Legacy FIFO-lot shape fallback: preserve existing total in opening+closing.
  if (rawRow.category && rawRow.sku && Array.isArray(rawRow.lots)) {
    const total = rawRow.lots.reduce((s, l) => s + (Number(l?.qty) || 0), 0);
    return {
      productSku: `${String(rawRow.sku).trim()} ${String(rawRow.category).trim()}`.trim(),
      openingStockQty: total,
      secondarySale: "",
      closingStockQty: total,
    };
  }
  return null;
}

/** Merge saved rows with current template (new SKU lines appear; matches keep values). */
export function mergePhysicalStockRows(savedRows) {
  const template = createEmptyPhysicalStockRows();
  if (!Array.isArray(savedRows) || savedRows.length === 0) return template;

  const map = new Map();
  savedRows.forEach((r) => {
    const n = normalizeRowShape(r);
    if (!n?.productSku) return;
    map.set(String(n.productSku).trim().toUpperCase(), n);
  });

  return template.map((t) => {
    const saved = map.get(String(t.productSku).trim().toUpperCase());
    if (!saved) return { ...t };
    return {
      ...t,
      openingStockQty: saved.openingStockQty ?? "",
      secondarySale: saved.secondarySale ?? "",
      closingStockQty: saved.closingStockQty ?? "",
    };
  });
}

export function normalizePhysicalStockPayload(raw) {
  if (!raw || typeof raw !== "object") {
    return {
      reportDate: new Date().toISOString().slice(0, 10),
      rows: createEmptyPhysicalStockRows(),
    };
  }
  const reportDate =
    typeof raw.reportDate === "string" && raw.reportDate
      ? raw.reportDate.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
  return {
    reportDate,
    updatedAt: raw.updatedAt || new Date().toISOString(),
    rows: mergePhysicalStockRows(raw.rows),
  };
}

/** Supabase: `physical_stock`; legacy/local: `physicalStock` */
export function getRawPhysicalStockFromDistributor(d) {
  if (!d || typeof d !== "object") return null;
  return d.physical_stock ?? d.physicalStock ?? null;
}
