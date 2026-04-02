/**
 * Build smooth multi-stop CSS linear-gradients in RGB space (primary → secondary → tertiary).
 */

function hexToRgb(hex) {
  const h = String(hex).replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  if (Number.isNaN(n) || full.length !== 6) return [0, 0, 0];
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function mixRgb(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function rgbCss([r, g, b]) {
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * @param {string} primaryHex
 * @param {string} secondaryHex
 * @param {string} tertiaryHex
 * @param {number} [angleDeg] gradient angle
 * @returns {string} CSS `background` value
 */
export function themePresetRgbGradient(primaryHex, secondaryHex, tertiaryHex, angleDeg = 118) {
  const p = hexToRgb(primaryHex);
  const s = hexToRgb(secondaryHex);
  const t = hexToRgb(tertiaryHex);

  const nearP = mixRgb(p, s, 0.15);
  const midPS = mixRgb(p, s, 0.48);
  const nearSfromP = mixRgb(p, s, 0.82);
  const nearSfromT = mixRgb(s, t, 0.18);
  const midST = mixRgb(s, t, 0.52);
  const nearT = mixRgb(s, t, 0.85);

  const stops = [
    `${rgbCss(p)} 0%`,
    `${rgbCss(nearP)} 12%`,
    `${rgbCss(midPS)} 28%`,
    `${rgbCss(nearSfromP)} 42%`,
    `${rgbCss(s)} 50%`,
    `${rgbCss(nearSfromT)} 58%`,
    `${rgbCss(midST)} 72%`,
    `${rgbCss(nearT)} 88%`,
    `${rgbCss(t)} 100%`,
  ];
  return `linear-gradient(${angleDeg}deg, ${stops.join(", ")})`;
}
