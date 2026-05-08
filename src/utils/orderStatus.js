export const ORDER_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  APPROVED: "approved",
  REJECTED: "rejected",
  CANCELED: "canceled",
  PENDING_EMAIL_FAILED: "pending_email_failed",
};

/** Default hours GM has to reply before we treat the order as overdue (admin reminders). */
export const DEFAULT_ORDER_APPROVAL_SLA_HOURS = 48;

const SLA_HOURS_STORAGE_KEY = "order_approval_sla_hours";

/**
 * Configurable SLA (hours). Stored in localStorage; clamped to a sane range.
 * @returns {number}
 */
export function getOrderApprovalSlaHours() {
  try {
    const raw = localStorage.getItem(SLA_HOURS_STORAGE_KEY);
    const n = Number(raw);
    if (Number.isFinite(n) && n >= 1 && n <= 720) return Math.floor(n);
  } catch {
    /* ignore */
  }
  return DEFAULT_ORDER_APPROVAL_SLA_HOURS;
}

/**
 * ISO timestamp for deadline = now + hours.
 * @param {number} hours
 * @returns {string}
 */
export function isoDeadlineFromNowHours(hours) {
  const h = Number(hours);
  const safe = Number.isFinite(h) && h > 0 ? h : DEFAULT_ORDER_APPROVAL_SLA_HOURS;
  return new Date(Date.now() + safe * 3600000).toISOString();
}

/**
 * Parse approval due time from order row (Supabase snake_case or camelCase).
 * @param {object} order
 * @param {number} [slaHoursFallback]
 * @returns {number|null} epoch ms, or null if unknown
 */
export function getOrderApprovalDueMs(order, slaHoursFallback = getOrderApprovalSlaHours()) {
  if (!order || typeof order !== "object") return null;
  const dueRaw = order.approval_due_at ?? order.approvalDueAt;
  if (dueRaw) {
    const t = Date.parse(dueRaw);
    if (!Number.isNaN(t)) return t;
  }
  const sentRaw = order.approval_sent_at ?? order.approvalSentAt;
  if (sentRaw) {
    const t = Date.parse(sentRaw);
    if (!Number.isNaN(t)) return t + Number(slaHoursFallback) * 3600000;
  }
  return null;
}

const TERMINAL_STATUSES = new Set([
  ORDER_STATUS.APPROVED,
  ORDER_STATUS.REJECTED,
  ORDER_STATUS.CANCELED,
]);

const STATUS_LABELS = {
  [ORDER_STATUS.PENDING]: "Pending",
  [ORDER_STATUS.SENT]: "Sent",
  [ORDER_STATUS.APPROVED]: "Approved",
  [ORDER_STATUS.REJECTED]: "Rejected",
  [ORDER_STATUS.CANCELED]: "Canceled",
  [ORDER_STATUS.PENDING_EMAIL_FAILED]: "Email Failed",
};

export function normalizeOrderStatus(status) {
  const normalized = String(status || "").trim().toLowerCase();
  if (!normalized) return ORDER_STATUS.PENDING;
  return Object.values(ORDER_STATUS).includes(normalized)
    ? normalized
    : ORDER_STATUS.PENDING;
}

export function getOrderStatusLabel(status) {
  const normalized = normalizeOrderStatus(status);
  return STATUS_LABELS[normalized] || "Pending";
}

export function canTransitionOrderStatus(currentStatus, nextStatus) {
  const current = normalizeOrderStatus(currentStatus);
  const next = normalizeOrderStatus(nextStatus);

  if (current === next) return true;
  if (TERMINAL_STATUSES.has(current)) return false;

  if (current === ORDER_STATUS.PENDING) {
    return (
      next === ORDER_STATUS.SENT ||
      next === ORDER_STATUS.APPROVED ||
      next === ORDER_STATUS.REJECTED ||
      next === ORDER_STATUS.CANCELED ||
      next === ORDER_STATUS.PENDING_EMAIL_FAILED
    );
  }

  if (current === ORDER_STATUS.PENDING_EMAIL_FAILED) {
    return (
      next === ORDER_STATUS.SENT ||
      next === ORDER_STATUS.APPROVED ||
      next === ORDER_STATUS.REJECTED ||
      next === ORDER_STATUS.CANCELED
    );
  }

  if (current === ORDER_STATUS.SENT) {
    return (
      next === ORDER_STATUS.APPROVED ||
      next === ORDER_STATUS.REJECTED ||
      next === ORDER_STATUS.CANCELED
    );
  }

  return false;
}

export function appendOrderStatusHistory(order, nextStatus, meta = {}) {
  const current = normalizeOrderStatus(order?.status);
  const next = normalizeOrderStatus(nextStatus);
  const history = Array.isArray(order?.statusHistory) ? [...order.statusHistory] : [];
  history.push({
    from: current,
    to: next,
    at: new Date().toISOString(),
    source: meta.source || "manual",
    actor: meta.actor || "",
    note: meta.note || "",
  });
  return history;
}
