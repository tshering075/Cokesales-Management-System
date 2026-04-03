/**
 * Normalize labels from Excel (e.g. "COKE 500 ML") and calculator SKUs ("Coca Cola 500ml") for matching.
 */
export function normalizeForStockMatch(s) {
  let x = String(s || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  x = x.replace(/\./g, "");
  x = x.replace(/\b1\.25\s*L\b/gi, "1.25L");
  x = x.replace(/\b1\s*L\b/gi, "1L");
  x = x.replace(/\bML\b/g, "ML");
  x = x.replace(/\bCOKE\b/g, "COCA COLA");
  x = x.replace(/\bCOCA\s*COLA\b/g, "COCA COLA");
  x = x.replace(/\bTHUMS\s*UP\b/g, "THUMS UP");
  return x.trim();
}

function tokens(s) {
  return normalizeForStockMatch(s)
    .split(" ")
    .filter((t) => t.length > 1);
}

function tokenOverlapScore(skuNorm, excelNorm) {
  const A = new Set(tokens(skuNorm));
  const B = new Set(tokens(excelNorm));
  if (A.size === 0 || B.size === 0) return 0;
  let n = 0;
  for (const t of A) {
    if (B.has(t)) n += 1;
  }
  return n;
}

/**
 * Sum quantity per normalized description (multiple batches → one availability number per product line).
 */
export function aggregateQuantitiesByNormalizedDescription(rows) {
  const map = new Map();
  for (const r of rows) {
    const desc = r?.description;
    if (desc == null || String(desc).trim() === "") continue;
    const k = normalizeForStockMatch(desc);
    if (!k) continue;
    const raw = r.quantity;
    const q =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : parseFloat(String(raw).replace(/,/g, "").trim());
    if (!Number.isFinite(q) || q < 0) continue;
    map.set(k, (map.get(k) || 0) + q);
  }
  return map;
}

/**
 * Best-effort match from aggregated opening-stock map to a calculator SKU name.
 */
export function resolveStockForSkuLine(skuName, aggregateMap) {
  if (!skuName || !aggregateMap || aggregateMap.size === 0) return null;
  const skuN = normalizeForStockMatch(skuName);
  if (aggregateMap.has(skuN)) return aggregateMap.get(skuN);

  let bestQty = null;
  let bestSc = 0;
  for (const [excelK, qty] of aggregateMap) {
    const sc = tokenOverlapScore(skuN, excelK);
    if (sc >= 2 && sc > bestSc) {
      bestSc = sc;
      bestQty = qty;
    }
  }
  if (bestQty != null) return bestQty;

  for (const [excelK, qty] of aggregateMap) {
    if (skuN.includes(excelK) || excelK.includes(skuN)) {
      const minLen = Math.min(skuN.length, excelK.length);
      if (minLen >= 6) return qty;
    }
  }
  return null;
}

/**
 * @param {string[]} skuNames
 * @param {Array<{ description: string, quantity: * }>} rows
 * @returns {Record<string, number>}
 */
export function buildFgStockMapForSkus(skuNames, rows) {
  const agg = aggregateQuantitiesByNormalizedDescription(rows);
  const out = {};
  const names = Array.isArray(skuNames) ? skuNames : [];
  for (const name of names) {
    const q = resolveStockForSkuLine(name, agg);
    if (q != null && Number.isFinite(q)) out[name] = Math.round(q);
  }
  return out;
}
