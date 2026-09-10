import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  ChartColumn,
  Download,
  History,
  KeyRound,
  Layers,
  PanelLeftClose,
  Pencil,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Users,
  Wallet,
  Warehouse,
} from "lucide-react";

export type AdminIcon = (props: LucideProps) => React.JSX.Element;

function refine(Icon: LucideIcon, name: string): AdminIcon {
  function RefinedIcon({ size = 18, strokeWidth = 1.5, ...props }: LucideProps) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" {...props} />;
  }
  RefinedIcon.displayName = name;
  return RefinedIcon;
}

export const ArrowDownIcon = refine(ArrowDown, "ArrowDownIcon");
export const ArrowUpSortIcon = refine(ArrowUp, "ArrowUpSortIcon");
export const SortIcon = refine(ArrowUpDown, "SortIcon");
export const BellIcon = refine(Bell, "BellIcon");
export const ChartIcon = refine(ChartColumn, "ChartIcon");
export const DownloadIcon = refine(Download, "DownloadIcon");
export const HistoryIcon = refine(History, "HistoryIcon");
export const KeyIcon = refine(KeyRound, "KeyIcon");
export const LayersIcon = refine(Layers, "LayersIcon");
export const CollapseIcon = refine(PanelLeftClose, "CollapseIcon");
export const EditIcon = refine(Pencil, "EditIcon");
export const PrintIcon = refine(Printer, "PrintIcon");
export const RefreshIcon = refine(RefreshCw, "RefreshIcon");
export const SaveIcon = refine(Save, "SaveIcon");
export const TrashIcon = refine(Trash2, "TrashIcon");
export const UsersIcon = refine(Users, "UsersIcon");
export const WalletIcon = refine(Wallet, "WalletIcon");
export const WarehouseIcon = refine(Warehouse, "WarehouseIcon");
