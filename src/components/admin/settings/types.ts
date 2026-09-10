import type { PermissionGroup } from "@/components/admin/AdminSession";

/* Shapes of the settings, locations, users, roles and audit-log endpoints. */

export interface GeneralSettings {
  businessName: string;
  legalName: string;
  gstin: string;
  stateCode: string;
  invoiceAddress: string;
  supportEmail: string;
  timezone: string;
}

export interface CommerceSettings {
  shippingFee: number;
  maxLineQuantity: number;
  guestCheckout: boolean;
}

export interface InventorySettings {
  defaultLocationId: string;
  onlineFulfilmentLocationId: string;
  defaultLowStockThreshold: number;
  unusualChangeThreshold: number;
}

export interface BillingSettings {
  invoicePrefix: string;
  footerNote: string;
}

export interface ExpenseSettings {
  approvalRequired: boolean;
  taxFieldsEnabled: boolean;
  paymentSources: string[];
}

export interface AllSettings {
  general: GeneralSettings;
  commerce: CommerceSettings;
  inventory: InventorySettings;
  billing: BillingSettings;
  expenses: ExpenseSettings;
}

export type SettingKey = keyof AllSettings;

export interface StockLocation {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
  createdAt: string;
  units: number;
}

export interface TeamUser {
  id: string;
  name: string;
  email: string;
  mobile: string | null;
  roleId: string;
  roleName: string;
  status: "active" | "disabled";
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
  userCount: number;
}

export interface RolesResponse {
  roles: Role[];
  permissionGroups: PermissionGroup[];
}

export interface AuditLogEntry {
  id: string;
  actorAdminId: string | null;
  actorName: string;
  actorRole: string | null;
  module: string;
  action: string;
  entityType: string;
  entityId: string | null;
  entityLabel: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  reference: string | null;
  sensitive: boolean;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

export const SUPER_ADMIN_ROLE = "super_admin";

/** Modules the API writes to the audit log. */
export const AUDIT_MODULES = ["billing", "content", "customers", "enquiries", "expenses", "inventory", "marketing", "orders", "pricing", "products", "purchases", "sales", "settings"];

export const PASSWORD_HINT = "At least 8 characters, including a letter and a number.";
