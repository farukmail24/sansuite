/**
 * Universal Date & Time Formatting Utilities for SanSuite (UK Standard)
 * 
 * Provides consistent, localized formatting across all modules:
 * Practice Management, Bookkeeping, Payroll, Accounts Production, etc.
 */

/**
 * Formats a date string/timestamp into UK Standard Date & Time with 12-hour AM/PM:
 * e.g. "05/09/2026 07:24 AM"
 */
export function formatDateTime(dStr: string | Date | null | undefined): string {
  if (!dStr) return "-";
  const d = dStr instanceof Date ? dStr : new Date(dStr);
  if (isNaN(d.getTime())) return String(dStr);

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${dd}/${mm}/${yyyy} ${hh}:${min} ${ampm}`;
}

/**
 * Formats a date string/timestamp into UK Standard Date Only:
 * e.g. "05/09/2026"
 */
export function formatDateOnly(dStr: string | Date | null | undefined): string {
  if (!dStr) return "-";
  if (dStr instanceof Date) {
    if (isNaN(dStr.getTime())) return "-";
    const dd = String(dStr.getUTCDate()).padStart(2, "0");
    const mm = String(dStr.getUTCMonth() + 1).padStart(2, "0");
    const yyyy = dStr.getUTCFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  const str = String(dStr).trim();
  if (!str || str === "—" || str === "-") return "-";

  // Direct ISO date pattern match (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss...) to avoid timezone shift
  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }

  const d = new Date(str);
  if (isNaN(d.getTime())) return str;

  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();

  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Formats a date string/timestamp into 12-hour Time Only with AM/PM:
 * e.g. "07:24 AM"
 */
export function formatTimeOnly(dStr: string | null | undefined): string {
  if (!dStr) return "-";
  const d = new Date(dStr);
  if (isNaN(d.getTime())) return dStr;

  let hours = d.getHours();
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hh = String(hours).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");

  return `${hh}:${min} ${ampm}`;
}

/**
 * Standard alias for backward-compatibility with pages importing or calling `formatDate`
 */
export const formatDate = formatDateTime;
