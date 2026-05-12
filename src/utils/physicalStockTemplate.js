/** Daily physical stock: opening, secondary sale, closing by SKU, with FIFO lot lines (MFG / batch / BBD). */
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

export function createFifoLotId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `lot_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

/** One FIFO layer: manufacturing traceability + quantities (PC). */
export function createEmptyFifoLot() {
  return {
    lotId: createFifoLotId(),
    mfgDate: "",
    batchNo: "",
    bbdDate: "",
    openingStockQty: "",
    secondarySale: "",
    closingStockQty: "",
  };
}

function normalizeDateField(value) {
  if (value === "" || value == null) return "";
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

function normalizeBatchNo(value) {
  if (value === "" || value == null) return "";
  return String(value).trim();
}

export function normalizeFifoLot(raw) {
  if (!raw || typeof raw !== "object") return createEmptyFifoLot();
  const lotId = typeof raw.lotId === "string" && raw.lotId.trim() ? raw.lotId.trim() : createFifoLotId();
  const normalizeQty = (value) => {
    if (value === "" || value == null) return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  };
  return {
    lotId,
    mfgDate: normalizeDateField(raw.mfgDate),
    batchNo: normalizeBatchNo(raw.batchNo),
    bbdDate: normalizeDateField(raw.bbdDate),
    openingStockQty: normalizeQty(raw.openingStockQty),
    secondarySale: normalizeQty(raw.secondarySale),
    closingStockQty: normalizeQty(raw.closingStockQty),
  };
}

/** Return lots[] for a product row (migrates legacy flat row). */
export function getLotsFromProductRow(row) {
  if (!row || typeof row !== "object") return [createEmptyFifoLot()];
  if (Array.isArray(row.lots) && row.lots.length > 0) {
    return row.lots.map((l) => normalizeFifoLot(l));
  }
  // Legacy: single line of qtys on the row
  const lot = createEmptyFifoLot();
  lot.mfgDate = normalizeDateField(row.mfgDate);
  lot.batchNo = normalizeBatchNo(row.batchNo);
  lot.bbdDate = normalizeDateField(row.bbdDate);
  const normalizeQty = (value) => {
    if (value === "" || value == null) return "";
    const n = Number(value);
    return Number.isFinite(n) ? n : "";
  };
  lot.openingStockQty = normalizeQty(row.openingStockQty);
  lot.secondarySale = normalizeQty(row.secondarySale);
  lot.closingStockQty = normalizeQty(row.closingStockQty);
  return [lot];
}

export function createEmptyPhysicalStockRows() {
  return PHYSICAL_STOCK_PRODUCT_LINES.map((productSku) => ({
    productSku,
    lots: [createEmptyFifoLot()],
  }));
}

/** Sum closing across all lots in one SKU row (legacy helper). */
export function rowTotal(row) {
  return getLotsFromProductRow(row).reduce((s, l) => s + (Number(l?.closingStockQty) || 0), 0);
}

/** Sum opening / secondary / closing across all SKU rows and all FIFO lots. */
export function aggregatePhysicalStockTotals(rows) {
  if (!Array.isArray(rows)) return { opening: 0, secondary: 0, closing: 0 };
  return rows.reduce(
    (acc, r) => {
      for (const lot of getLotsFromProductRow(r)) {
        acc.opening += Number(lot?.openingStockQty) || 0;
        acc.secondary += Number(lot?.secondarySale) || 0;
        acc.closing += Number(lot?.closingStockQty) || 0;
      }
      return acc;
    },
    { opening: 0, secondary: 0, closing: 0 }
  );
}

function normalizeRowShape(rawRow) {
  if (!rawRow || typeof rawRow !== "object") return null;
  const productSku = rawRow.productSku ? String(rawRow.productSku).trim() : "";
  if (!productSku) return null;

  // Legacy FIFO-lot shape (category/sku/lots qty only) → single product line lump
  if (rawRow.category && rawRow.sku && Array.isArray(rawRow.lots) && !rawRow.productSku) {
    const total = rawRow.lots.reduce((s, l) => s + (Number(l?.qty) || 0), 0);
    return {
      productSku: `${String(rawRow.sku).trim()} ${String(rawRow.category).trim()}`.trim(),
      lots: [
        {
          ...createEmptyFifoLot(),
          openingStockQty: total,
          secondarySale: "",
          closingStockQty: total,
        },
      ],
    };
  }

  return {
    productSku,
    lots: getLotsFromProductRow(rawRow),
  };
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
    if (!saved) return { ...t, lots: (t.lots || [createEmptyFifoLot()]).map(normalizeFifoLot) };
    const mergedLots = getLotsFromProductRow(saved);
    return {
      productSku: t.productSku,
      lots: mergedLots.length > 0 ? mergedLots.map(normalizeFifoLot) : [createEmptyFifoLot()],
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

/**
 * Flat list for Excel / APIs: one record per product × FIFO lot.
 * @param {Array<{ productSku: string, lots?: unknown[] }>} rows
 * @returns {Array<{ product_sku: string, mfg_date: string, batch_no: string, bbd_date: string, opening_stock_qty: number, secondary_sale: number, closing_stock_qty: number }>}
 */
export function flattenPhysicalStockRowsForExport(rows) {
  const out = [];
  if (!Array.isArray(rows)) return out;
  for (const r of rows) {
    const sku = r?.productSku || "";
    const lots = getLotsFromProductRow(r);
    lots.forEach((lot, idx) => {
      out.push({
        product_sku: sku,
        fifo_lot_seq: idx + 1,
        mfg_date: lot.mfgDate || "",
        batch_no: lot.batchNo || "",
        bbd_date: lot.bbdDate || "",
        opening_stock_qty: Number(lot.openingStockQty) || 0,
        secondary_sale: Number(lot.secondarySale) || 0,
        closing_stock_qty: Number(lot.closingStockQty) || 0,
      });
    });
  }
  return out;
}

/** Supabase: `physical_stock`; legacy/local: `physicalStock` */
export function getRawPhysicalStockFromDistributor(d) {
  if (!d || typeof d !== "object") return null;
  return d.physical_stock ?? d.physicalStock ?? null;
}
