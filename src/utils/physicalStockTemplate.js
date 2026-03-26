/**
 * Daily Distributors Physical Stocks template (FIFO lots 1–3).
 * Lot 1 = oldest / first-in, Lot 2 = next, Lot 3 = newest.
 */

export const PHYSICAL_STOCK_TEMPLATE_GROUPS = [
  { category: "300ML", skus: ["KO", "FX", "SP"] },
  { category: "500ML", skus: ["KO", "FX", "SP"] },
  { category: "1.25LTR", skus: ["KO", "FX", "SP"] },
  { category: "T-UP CHARGED", skus: ["T-UP", "CHARGED"] },
  { category: "KINLEY WATER", skus: ["200 ML", "500 ML", "1L"] },
  { category: "CANS", skus: ["CZS", "DIET KO", "LIMCA", "SODA", "TONIC WATER"] },
];

export function emptyLot() {
  return { qty: 0, mfgDate: "", batchNo: "", bbdDate: "" };
}

export function createEmptyPhysicalStockRows() {
  return PHYSICAL_STOCK_TEMPLATE_GROUPS.flatMap((g) =>
    g.skus.map((sku) => ({
      category: g.category,
      sku,
      lots: [emptyLot(), emptyLot(), emptyLot()],
    }))
  );
}

export function rowTotal(row) {
  if (!row?.lots) return 0;
  return row.lots.reduce((s, l) => s + (Number(l.qty) || 0), 0);
}

/**
 * Merge saved rows with current template (new SKUs appear; matched SKUs keep values).
 */
export function mergePhysicalStockRows(savedRows) {
  const template = createEmptyPhysicalStockRows();
  if (!Array.isArray(savedRows) || savedRows.length === 0) return template;

  const key = (r) => `${r.category}|${r.sku}`;
  const map = new Map();
  savedRows.forEach((r) => {
    if (r && r.category && r.sku) map.set(key(r), r);
  });

  return template.map((t) => {
    const s = map.get(key(t));
    if (!s || !Array.isArray(s.lots)) return { ...t };
    return {
      ...t,
      lots: [0, 1, 2].map((i) => ({
        qty: Number(s.lots[i]?.qty) || 0,
        mfgDate: s.lots[i]?.mfgDate != null ? String(s.lots[i].mfgDate) : "",
        batchNo: s.lots[i]?.batchNo != null ? String(s.lots[i].batchNo) : "",
        bbdDate: s.lots[i]?.bbdDate != null ? String(s.lots[i].bbdDate) : "",
      })),
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
