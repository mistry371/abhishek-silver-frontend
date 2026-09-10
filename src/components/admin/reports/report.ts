import { formatDate, humanize, money, number, percent, weight } from "@/lib/admin/format";

/* Response shapes of `GET /reports` and `GET /reports/:type`. */

export type ReportFormat = "number" | "currency" | "percent" | "weight" | "date" | "text";

export interface ReportColumn {
  key: string;
  label: string;
  format?: ReportFormat;
}

export interface ReportSection {
  key: string;
  title: string;
  columns: ReportColumn[];
  rows: Record<string, unknown>[];
}

export interface ReportChart {
  key: string;
  title: string;
  format?: ReportFormat;
  points: { label: string; value: number }[];
}

export interface ReportSummaryItem {
  label: string;
  value: number | string | null;
  format?: ReportFormat;
}

export interface Report {
  type: string;
  title: string;
  period: { from: string; to: string };
  groupBy: "day" | "month";
  generatedAt: string;
  summary: ReportSummaryItem[];
  sections: ReportSection[];
  charts: ReportChart[];
}

export interface ReportListItem {
  type: string;
  title: string;
}

/** Fallback titles (used before the report loads) and one-line descriptions per report type. */
export const REPORT_INFO: Record<string, { title: string; description: string }> = {
  sales: { title: "Sales Report", description: "Revenue and number of sales by day or month, split online vs in-store, with GST and discounts." },
  revenue: { title: "Revenue Overview", description: "Invoice value billed against payments collected and refunds processed." },
  "best-sellers": { title: "Best-Selling Products", description: "Top 50 products by units sold, with the number of sales and revenue." },
  orders: { title: "Order Report", description: "Online orders placed, paid, cancelled and returned, plus a breakdown by status." },
  customers: { title: "Customer Report", description: "New customers, repeat purchasers and the top customers by spend." },
  "customer-history": { title: "Customer Purchase History", description: "Every item a chosen customer bought in the selected period." },
  products: { title: "Product Report", description: "Units sold and last sale date for every product, grouped by category." },
  inventory: { title: "Inventory Report", description: "Units, net metal weight and valuation in stock by product, category, metal and location." },
  stock: { title: "Stock Report", description: "Stock movements in the period by type, and the products with the largest net change." },
  "low-stock": { title: "Low Stock Report", description: "Active products at or below their low-stock level right now." },
  purchases: { title: "Purchase Report", description: "Approved purchases by vendor and period, with units and net weight received." },
  billing: { title: "Billing & Invoice Report", description: "Invoices by status, billed vs collected, and outstanding balances." },
  expenses: { title: "Expense Report", description: "Approved and paid expenses by category, payee, date, payment method and status." },
};

/** Reports that describe stock as it is now — the date range does not apply. */
export const SNAPSHOT_REPORTS = new Set(["inventory", "low-stock"]);

/** Text columns holding enum codes that read better humanised ("partially_paid" → "Partially paid"). */
const ENUM_KEYS = new Set(["status", "paymentStatus", "channel", "type", "paymentMethod", "metal"]);

export const PERIOD_LABEL = /^\d{4}-\d{2}(-\d{2})?$/;

export function isNumericFormat(format?: ReportFormat) {
  return format === "number" || format === "currency" || format === "percent" || format === "weight";
}

/** Postgres text timestamps ("2026-09-01 10:00:00+00") → ISO so every browser parses them. */
function normaliseTimestamp(value: string) {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)) return value;
  return value.replace(" ", "T").replace(/([+-]\d{2})$/, "$1:00");
}

export function formatReportValue(value: unknown, format?: ReportFormat): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "currency":
      return money(value as number | string);
    case "number":
      return number(value as number | string);
    case "percent":
      return percent(value as number | string);
    case "weight":
      return weight(value as number | string);
    case "date":
      return formatDate(normaliseTimestamp(String(value)));
    default:
      return typeof value === "object" ? JSON.stringify(value) : String(value);
  }
}

export function formatReportCell(column: ReportColumn, value: unknown) {
  if ((!column.format || column.format === "text") && ENUM_KEYS.has(column.key) && typeof value === "string" && value) return humanize(value);
  return formatReportValue(value, column.format);
}

export function reportRowHref(row: Record<string, unknown>) {
  if (typeof row.productId === "string" && row.productId) return `/admin/inventory/${row.productId}`;
  if (typeof row.customerId === "string" && row.customerId) return `/admin/customers/${row.customerId}`;
  return undefined;
}

/** "2026-09-10" shifted by whole days, computed on calendar dates (no clock). */
export function shiftIsoDate(isoDate: string, days: number) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
