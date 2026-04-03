/**
 * Normalize labels from Excel (e.g. "COKE 500 ML") and calculator SKUs ("Coca Cola 500ml") for matching.
 */
export function normalizeForStockMatch(s) {
  let x = String(s || "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
  x = x.replace(/[_-]+/g, " ");
  x = x.replace(/\./g, "");
  x = x.replace(/\b(\d+(?:\.\d+)?)\s*(ML|L)\b/gi, (_, n, u) => `${n}${String(u).toUpperCase()}`);
  x = x.replace(/\b1\.25\s*L\b/gi, "1.25L");
  x = x.replace(/\b1\s*L\b/gi, "1L");
  x = x.replace(/\bML\b/g, "ML");
  x = x.replace(/\bCOCO\s+COLA\b/gi, "COCA COLA");
  x = x.replace(/\bTHUMSUP\b/gi, "THUMS UP");
  x = x.replace(/\bCC\b/g, "COCA COLA");
  x = x.replace(/\bKW\b/g, "KINLEY");
  x = x.replace(/\bCOKE\b/g, "COCA COLA");
  x = x.replace(/\bCOCA\s*COLA\b/g, "COCA COLA");
  x = x.replace(/\bTHUMS\s*UP\b/g, "THUMS UP");
  x = x.replace(/\bTHUMS\s+UP\s+CHARGE\b/gi, "CHARGE");
  x = x.replace(/\bTHUMS\s+CHARGE\b/gi, "CHARGE");
  x = x.replace(/\bTU\b/g, "THUMS UP");
  x = x.replace(/\bDIET\b/g, "DIET");
  x = x.replace(/\bZERO\b/g, "ZERO");
  return x.trim();
}

/** Stable key: same logical product text in the FG table sums here (all batches with same description). */
export function stockMatchFingerprint(s) {
  return normalizeForStockMatch(s).replace(/\s+/g, "");
}

/** e.g. "500ML", "1.25L" — avoid matching 300ml SKU to 500ml stock */
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
 * Sum quantity per normalized description (same description string → one bucket; matches FG table grouping).
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
 * Same totals as summing the admin FG table: all rows whose description normalizes the same way share one bucket.
 */
export function aggregateQuantitiesByFingerprint(rows) {
  const map = new Map();
  for (const r of rows) {
    const desc = r?.description;
    if (desc == null || String(desc).trim() === "") continue;
    const fp = stockMatchFingerprint(desc);
    if (!fp) continue;
    const raw = r.quantity;
    const q =
      typeof raw === "number" && Number.isFinite(raw)
        ? raw
        : parseFloat(String(raw).replace(/,/g, "").trim());
    if (!Number.isFinite(q) || q < 0) continue;
    map.set(fp, (map.get(fp) || 0) + q);
  }
  return map;
}

function linesMatchForSku(skuNorm, excelK) {
  if (skuNorm === excelK) return true;
  if (sizesRejectPair(skuNorm, excelK)) return false;

  if (tokenOverlapScore(skuNorm, excelK) >= 2) return true;

  if (skuNorm.includes(excelK) || excelK.includes(skuNorm)) {
    return Math.min(skuNorm.length, excelK.length) >= 6;
  }
  return false;
}

/** Kinley / Charge etc. when Excel uses longer descriptions (e.g. “Kinley mineral water 500 ml”). */
function sharedCoreBrand(skuNorm, excelNorm) {
  const sku = ` ${skuNorm} `;
  const ex = ` ${excelNorm} `;
  if (sku.includes(" KINLEY ") && ex.includes(" KINLEY ")) return true;
  if (sku.includes(" CHARGE ")) {
    if (ex.includes(" CHARGE ")) return true;
    if (ex.includes(" THUMS ") && ex.includes(" CHARGE ")) return true;
  }
  return false;
}

/** Fingerprints to try for file lookup (CAN lines in calculator often omit "CAN" on the Excel side). */
function skuFingerprintsForFileLookup(skuName) {
  const n = normalizeForStockMatch(skuName);
  const out = [];
  const push = (s) => {
    const fp = stockMatchFingerprint(s);
    if (fp && !out.includes(fp)) out.push(fp);
  };
  push(n);
  const stripped = n.replace(/\bCAN\b/g, " ").replace(/\s+/g, " ").trim();
  if (stripped && stripped !== n) push(stripped);
  return out;
}

/**
 * Opening cases for one calculator SKU: exact fingerprint match to aggregated file rows first (aligned with admin totals),
 * else a single best fuzzy bucket (no summing multiple buckets — avoids double-count).
 */
export function resolveOpeningQtyForSku(skuName, fpMap, normMap) {
  if (!skuName || !fpMap || !normMap) return null;
  for (const fp of skuFingerprintsForFileLookup(skuName)) {
    if (fpMap.has(fp)) return fpMap.get(fp);
  }

  const skuN = normalizeForStockMatch(skuName);
  const skuNFuzzy = skuN.replace(/\bCAN\b/g, " ").replace(/\s+/g, " ").trim();
  let bestQty = null;
  let bestSc = -1;
  for (const skuTry of [skuN, skuNFuzzy].filter((s, i, a) => s && a.indexOf(s) === i)) {
    const sizeTry = extractSizeToken(skuTry);
    for (const [excelK, qty] of normMap) {
      if (!linesMatchForSku(skuTry, sizeTry, excelK)) continue;
      const sc = tokenOverlapScore(skuTry, excelK);
      if (sc > bestSc) {
        bestSc = sc;
        bestQty = qty;
      }
    }
  }
  if (bestSc >= 2 && bestQty != null) return bestQty;

  for (const skuTry of [skuN, skuNFuzzy].filter((s, i, a) => s && a.indexOf(s) === i)) {
    const skuMl = parseSizeToMl(skuTry);
    if (skuMl == null) continue;
    for (const [excelK, qty] of normMap) {
      const exMl = parseSizeToMl(excelK);
      if (exMl == null || exMl !== skuMl) continue;
      if (!sharedCoreBrand(skuTry, excelK)) continue;
      return qty;
    }
  }

  return null;
}

/**
 * Sparse map: only SKUs that matched the FG file (non-zero opening or matched row).
 * @param {string[]} skuNames
 * @param {Array<{ description: string, quantity: * }>} rows
 * @returns {Record<string, number>}
 */
export function buildFgStockMapForSkus(skuNames, rows) {
  const fpMap = aggregateQuantitiesByFingerprint(rows);
  const normMap = aggregateQuantitiesByNormalizedDescription(rows);
  const out = {};
  const names = Array.isArray(skuNames) ? skuNames : [];
  for (const name of names) {
    const q = resolveOpeningQtyForSku(name, fpMap, normMap);
    if (q != null && Number.isFinite(q)) out[name] = Math.round(q);
  }
  return out;
}

/**
 * Every calculator SKU → opening cases from file (0 if no row matches). Use for UI hints on all lines.
 * @param {string[]} skuNames
 * @param {Array<{ description: string, quantity: * }>} rows
 */
export function buildFgStockOpeningAllSkus(skuNames, rows) {
  const names = Array.isArray(skuNames) ? skuNames : [];
  const out = {};
  if (!Array.isArray(rows) || rows.length === 0) {
    for (const name of names) out[name] = 0;
    return out;
  }
  const fpMap = aggregateQuantitiesByFingerprint(rows);
  const normMap = aggregateQuantitiesByNormalizedDescription(rows);
  for (const name of names) {
    const q = resolveOpeningQtyForSku(name, fpMap, normMap);
    out[name] = q != null && Number.isFinite(q) ? Math.round(q) : 0;
  }
  return out;
}
