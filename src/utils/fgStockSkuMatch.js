/**
 * Normalize labels from Excel (e.g. "COKE 500 ML") and calculator SKUs ("Coca Cola 500ml") for matching.
 */
export function normalizeForStockMatch(s) {
  let x = String(s || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  x = x.replace(/\./g, "");
  x = x.replace(/\b(\d+(?:\.\d+)?)\s*(ML|L)\b/gi, (_, n, u) => `${n}${String(u).toUpperCase()}`);
  x = x.replace(/\b1\.25\s*L\b/gi, "1.25L");
  x = x.replace(/\b1\s*L\b/gi, "1L");
  x = x.replace(/\bML\b/g, "ML");
  x = x.replace(/\bCOKE\b/g, "COCA COLA");
  x = x.replace(/\bCOCA\s*COLA\b/g, "COCA COLA");
  x = x.replace(/\bTHUMS\s*UP\b/g, "THUMS UP");
  x = x.replace(/\bDIET\b/g, "DIET");
  x = x.replace(/\bZERO\b/g, "ZERO");
  return x.trim();
}

/** e.g. "500ML", "1.25L" — used to avoid matching 300ml SKU to 500ml stock lines */
export function extractSizeToken(normalized) {
  const n = String(normalized || "");
  const m = n.match(/\b(\d+(?:\.\d+)?)(ML|L)\b/);
  return m ? `${m[1]}${m[2]}` : null;
}

function tokens(s) {
  return normalizeForStockMatch(s)
    .split(" ")
    .filter((t) => t.length > 1);
}

export function tokenOverlapScore(skuNorm, excelNorm) {
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
 * Sum quantity per normalized description (multiple batches / rows with same text → one bucket).
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

function linesMatchForSku(skuNorm, skuSize, excelK) {
  if (skuNorm === excelK) return true;
  const exSize = extractSizeToken(excelK);
  if (skuSize && exSize && skuSize !== exSize) return false;

  if (tokenOverlapScore(skuNorm, excelK) >= 2) return true;

  if (skuNorm.includes(excelK) || excelK.includes(skuNorm)) {
    return Math.min(skuNorm.length, excelK.length) >= 6;
  }
  return false;
}

/**
 * Sum opening qty from every Excel aggregate key that matches this calculator SKU
 * (same product, different batch rows collapse into one key; variant spellings may be multiple keys).
 */
export function sumOpeningQtyForSku(skuName, aggregateMap) {
  if (!skuName || !aggregateMap || aggregateMap.size === 0) return null;
  const skuN = normalizeForStockMatch(skuName);
  const skuSize = extractSizeToken(skuN);

  let sum = 0;
  let matched = false;
  for (const [excelK, qty] of aggregateMap) {
    if (!linesMatchForSku(skuN, skuSize, excelK)) continue;
    sum += qty;
    matched = true;
  }
  return matched ? sum : null;
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
    const q = sumOpeningQtyForSku(name, agg);
    if (q != null && Number.isFinite(q)) out[name] = Math.round(q);
  }
  return out;
}
