/**
 * Utility functions for managing target periods
 */

const TARGET_PERIOD_KEY = "coke_target_period";

/** Format a Date as YYYY-MM-DD in local time (avoids UTC shift from toISOString). */
export function toLocalYmd(d) {
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${mo}-${da}`;
}

/** Fallback when nothing is saved: first through last day of the current calendar month (neutral default). */
function defaultTargetPeriodWhenUnset() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const start = new Date(year, month, 1, 0, 0, 0, 0);
  const end = new Date(year, month + 1, 0, 0, 0, 0, 0);
  return {
    start: toLocalYmd(start),
    end: toLocalYmd(end),
  };
}

/**
 * Parse saved period strings (YYYY-MM-DD) as local start-of-day / end-of-day.
 * Matches invoice dates parsed from Excel (local calendar dates) and avoids UTC-only Date parsing skew.
 */
export function parseTargetPeriodBounds(startYmd, endYmd) {
  if (!startYmd || !endYmd) return { start: null, end: null };
  const m1 = String(startYmd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  const m2 = String(endYmd).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m1 || !m2) {
    const start = new Date(startYmd);
    const end = new Date(endYmd);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { start: null, end: null };
    }
    const endInclusive = new Date(end);
    endInclusive.setHours(23, 59, 59, 999);
    return { start, end: endInclusive };
  }
  const start = new Date(Number(m1[1]), Number(m1[2]) - 1, Number(m1[3]), 0, 0, 0, 0);
  const end = new Date(Number(m2[1]), Number(m2[2]) - 1, Number(m2[3]), 23, 59, 59, 999);
  return { start, end };
}

export function getTargetPeriod() {
  try {
    const stored = localStorage.getItem(TARGET_PERIOD_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.start && parsed.end) {
        return parsed;
      }
    }
  } catch (error) {
    // Fall through to default
  }

  return defaultTargetPeriodWhenUnset();
}

/**
 * Save target period to localStorage
 */
export function saveTargetPeriod(start, end) {
  try {
    const period = { start, end };
    localStorage.setItem(TARGET_PERIOD_KEY, JSON.stringify(period));
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Format date for display (e.g., "Oct 2025")
 */
export function formatTargetPeriodDisplay(start, end) {
  try {
    const { start: startDate, end: endDate } = parseTargetPeriodBounds(start, end);
    if (!startDate || !endDate) return "Invalid Date";

    const sameMonth =
      startDate.getFullYear() === endDate.getFullYear() &&
      startDate.getMonth() === endDate.getMonth();
    if (sameMonth) {
      return startDate.toLocaleString("en-US", { month: "short", year: "numeric" });
    }
    const d1 = startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    const d2 = endDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
    return `${d1} – ${d2}`;
  } catch (error) {
    return "Invalid Date";
  }
}

/**
 * Calculate days remaining until target end date
 */
export function getDaysRemaining(endDate) {
  try {
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (error) {
    return 0;
  }
}
