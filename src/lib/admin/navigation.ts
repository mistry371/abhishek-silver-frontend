import {
  BagIcon,
  CardIcon,
  ClipboardIcon,
  GemIcon,
  GridIcon,
  InvoiceIcon,
  ListIcon,
  MessageIcon,
  OfferIcon,
  PackageIcon,
  PenIcon,
  ReceiptIcon,
  ScaleIcon,
  SettingsIcon,
  SparkleIcon,
  StoreIcon,
  TagIcon,
  TruckIcon,
  UploadIcon,
  UserIcon,
} from "@/components/icons";

type IconLike = (props: { size?: number; className?: string }) => React.JSX.Element;

export interface AdminNavItem {
  label: string;
  href: string;
  icon: IconLike;
  /** Visible when the admin holds ANY of these permissions. */
  permissions: string[];
}

export interface AdminNavGroup {
  title: string;
  items: AdminNavItem[];
}

const REPORT_PERMISSIONS = ["reports:sales", "reports:orders", "reports:customers", "reports:products", "reports:inventory", "reports:purchases", "reports:billing", "reports:expenses"];

/** Any permission that unlocks at least one bulk import. */
const IMPORT_PERMISSIONS = ["products:create", "inventory:adjust", "customers:manage", "vendors:manage", "expenses:create", "catalog:manage_taxonomy", "marketing:manage", "pricing:manage"];

export const adminNav: AdminNavGroup[] = [
  {
    title: "Overview",
    items: [{ label: "Dashboard", href: "/admin", icon: GridIcon, permissions: ["dashboard:view"] }],
  },
  {
    title: "Sales",
    items: [
      { label: "Orders", href: "/admin/orders", icon: BagIcon, permissions: ["orders:view"] },
      { label: "Sales", href: "/admin/sales", icon: ReceiptIcon, permissions: ["sales:view"] },
      { label: "Billing", href: "/admin/billing", icon: InvoiceIcon, permissions: ["billing:view"] },
      { label: "Customers", href: "/admin/customers", icon: UserIcon, permissions: ["customers:view"] },
      { label: "Enquiries", href: "/admin/enquiries", icon: MessageIcon, permissions: ["enquiries:view"] },
    ],
  },
  {
    title: "Catalogue",
    items: [
      { label: "Products", href: "/admin/products", icon: GemIcon, permissions: ["products:view"] },
      { label: "Categories", href: "/admin/categories", icon: ListIcon, permissions: ["products:view", "catalog:manage_taxonomy"] },
      { label: "Collections", href: "/admin/collections", icon: SparkleIcon, permissions: ["products:view", "catalog:manage_taxonomy"] },
      { label: "Pricing", href: "/admin/pricing", icon: ScaleIcon, permissions: ["pricing:view"] },
      { label: "Coupons", href: "/admin/coupons", icon: TagIcon, permissions: ["marketing:view"] },
      { label: "Offers", href: "/admin/offers", icon: OfferIcon, permissions: ["marketing:view"] },
    ],
  },
  {
    title: "Stock & purchasing",
    items: [
      { label: "Inventory", href: "/admin/inventory", icon: PackageIcon, permissions: ["inventory:view"] },
      { label: "Purchases", href: "/admin/purchases", icon: TruckIcon, permissions: ["purchases:view"] },
      { label: "Vendors", href: "/admin/vendors", icon: StoreIcon, permissions: ["vendors:view"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Expenses", href: "/admin/expenses", icon: CardIcon, permissions: ["expenses:view"] },
      { label: "Reports", href: "/admin/reports", icon: ClipboardIcon, permissions: REPORT_PERMISSIONS },
    ],
  },
  {
    title: "Website",
    items: [{ label: "Content", href: "/admin/content", icon: PenIcon, permissions: ["content:view"] }],
  },
  {
    title: "Administration",
    items: [
      { label: "Bulk import", href: "/admin/imports", icon: UploadIcon, permissions: IMPORT_PERMISSIONS },
      { label: "Settings", href: "/admin/settings", icon: SettingsIcon, permissions: ["settings:view", "settings:manage_users", "audit:view"] },
    ],
  },
];

export function isNavActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" || pathname === "/admin/dashboard" : pathname === href || pathname.startsWith(`${href}/`);
}
