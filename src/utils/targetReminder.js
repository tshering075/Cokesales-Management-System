/**
 * Twice-weekly target / stock-lift reminders (Monday & Thursday, local time).
 * Uses localStorage so each slot fires at most once per distributor per calendar week.
 */

const STORAGE_PREFIX = "coke_target_tw_reminder_v1";

/**
 * ISO week id for local calendar date, e.g. 2025-W11
 */
export function getIsoWeekKeyLocal(date = new Date()) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay() || 7;
  d.setDate(d.getDate() + 4 - day);
  const year = d.getFullYear();
  const yearStart = new Date(year, 0, 1);
  const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(weekNo).padStart(2, "0")}`;
}

/**
 * @returns {'mon'|'thu'|null}
 */
export function getTargetReminderSlotToday() {
  const day = new Date().getDay();
  if (day === 1) return "mon";
  if (day === 4) return "thu";
  return null;
}

/**
 * Atomically claim this week's reminder slot for the distributor (returns null if not due or already claimed).
 * @param {string} distributorCode
 * @returns {{ slot: 'mon'|'thu', weekKey: string } | null}
 */
export function tryClaimTwiceWeeklyTargetReminder(distributorCode) {
  if (!distributorCode || typeof distributorCode !== "string") return null;
  const slot = getTargetReminderSlotToday();
  if (!slot) return null;

  const weekKey = getIsoWeekKeyLocal(new Date());
  const key = `${STORAGE_PREFIX}_${distributorCode}_${weekKey}_${slot}`;

  try {
    if (localStorage.getItem(key)) return null;
    localStorage.setItem(key, String(Date.now()));
    return { slot, weekKey };
  } catch {
    return null;
  }
}

/**
 * @param {object} params
 * @param {number} params.remainingDays
 * @param {string} [params.periodEndYmd]
 * @param {Array<{ category: string, targetPC: number, targetUC: number, achievedPC: number, achievedUC: number }>} params.rows
 */
export function buildTargetBalanceReminderMessage({ remainingDays, periodEndYmd, rows }) {
  const lines = (rows || []).map((row) => {
    const balPC = (Number(row.targetPC) || 0) - (Number(row.achievedPC) || 0);
    const balUC = (Number(row.targetUC) || 0) - (Number(row.achievedUC) || 0);
    return `${row.category}: ${balPC.toLocaleString()} PC & ${Math.round(balUC).toLocaleString()} UC left`;
  });

  const endPart = periodEndYmd ? ` Period ends ${periodEndYmd}.` : "";
  const daysPart =
    remainingDays > 0
      ? `${remainingDays} day${remainingDays === 1 ? "" : "s"} left in the target period.${endPart}`
      : `Target period has ended or is on the last day.${endPart}`;

  return `${daysPart} Balance to lift: ${lines.join(" · ")} Keep lifting stock before the period closes.`;
}

export function getTargetReminderNotificationIconUrl() {
  try {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const path = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
    return `${base}${path}/app-logo.png`;
  } catch {
    return "/app-logo.png";
  }
}
