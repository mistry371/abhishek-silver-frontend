import type { LucideIcon, LucideProps } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Award,
  BadgePercent,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  CircleCheck,
  CircleUser,
  ClipboardList,
  Clock,
  Copy,
  CreditCard,
  Expand,
  ExternalLink,
  Eye,
  FileText,
  Gem,
  Gift,
  GitCompareArrows,
  Hammer,
  Heart,
  House,
  ImageOff,
  Inbox,
  Info,
  LayoutGrid,
  LayoutList,
  LoaderCircle,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  Navigation,
  Package,
  PackageCheck,
  Pause,
  PenTool,
  Phone,
  Play,
  Plus,
  Receipt,
  RotateCcw,
  Ruler,
  Scale,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Star,
  Store,
  Tag,
  Truck,
  Upload,
  User,
  WifiOff,
  X,
  ZoomIn,
} from "lucide-react";
import type { SVGProps } from "react";

export type IconProps = LucideProps;
export type IconComponent = (props: IconProps) => React.JSX.Element;

/** Thin, consistent stroke across the whole interface. */
function refine(Icon: LucideIcon, name: string): IconComponent {
  function RefinedIcon({ size = 20, strokeWidth = 1.25, ...props }: LucideProps) {
    return <Icon size={size} strokeWidth={strokeWidth} aria-hidden="true" focusable="false" {...props} />;
  }
  RefinedIcon.displayName = name;
  return RefinedIcon;
}

export const ArrowLeftIcon = refine(ArrowLeft, "ArrowLeftIcon");
export const ArrowRightIcon = refine(ArrowRight, "ArrowRightIcon");
export const ArrowUpIcon = refine(ArrowUp, "ArrowUpIcon");
export const AwardIcon = refine(Award, "AwardIcon");
export const OfferIcon = refine(BadgePercent, "OfferIcon");
export const CalendarIcon = refine(Calendar, "CalendarIcon");
export const CheckIcon = refine(Check, "CheckIcon");
export const ChevronDownIcon = refine(ChevronDown, "ChevronDownIcon");
export const ChevronLeftIcon = refine(ChevronLeft, "ChevronLeftIcon");
export const ChevronRightIcon = refine(ChevronRight, "ChevronRightIcon");
export const ChevronUpIcon = refine(ChevronUp, "ChevronUpIcon");
export const AlertIcon = refine(CircleAlert, "AlertIcon");
export const SuccessIcon = refine(CircleCheck, "SuccessIcon");
export const AccountCircleIcon = refine(CircleUser, "AccountCircleIcon");
export const ClipboardIcon = refine(ClipboardList, "ClipboardIcon");
export const ClockIcon = refine(Clock, "ClockIcon");
export const CopyIcon = refine(Copy, "CopyIcon");
export const CardIcon = refine(CreditCard, "CardIcon");
export const ExpandIcon = refine(Expand, "ExpandIcon");
export const ExternalLinkIcon = refine(ExternalLink, "ExternalLinkIcon");
export const EyeIcon = refine(Eye, "EyeIcon");
export const InvoiceIcon = refine(FileText, "InvoiceIcon");
export const GemIcon = refine(Gem, "GemIcon");
export const GiftIcon = refine(Gift, "GiftIcon");
export const CompareIcon = refine(GitCompareArrows, "CompareIcon");
export const CraftIcon = refine(Hammer, "CraftIcon");
export const HeartIcon = refine(Heart, "HeartIcon");
export const HomeIcon = refine(House, "HomeIcon");
export const ImageOffIcon = refine(ImageOff, "ImageOffIcon");
export const InboxIcon = refine(Inbox, "InboxIcon");
export const InfoIcon = refine(Info, "InfoIcon");
export const GridIcon = refine(LayoutGrid, "GridIcon");
export const ListIcon = refine(LayoutList, "ListIcon");
export const SpinnerIcon = refine(LoaderCircle, "SpinnerIcon");
export const LockIcon = refine(Lock, "LockIcon");
export const LogOutIcon = refine(LogOut, "LogOutIcon");
export const MailIcon = refine(Mail, "MailIcon");
export const MapPinIcon = refine(MapPin, "MapPinIcon");
export const MenuIcon = refine(Menu, "MenuIcon");
export const MessageIcon = refine(MessageCircle, "MessageIcon");
export const MinusIcon = refine(Minus, "MinusIcon");
export const DirectionsIcon = refine(Navigation, "DirectionsIcon");
export const PackageIcon = refine(Package, "PackageIcon");
export const PackageCheckIcon = refine(PackageCheck, "PackageCheckIcon");
export const PauseIcon = refine(Pause, "PauseIcon");
export const PenIcon = refine(PenTool, "PenIcon");
export const PhoneIcon = refine(Phone, "PhoneIcon");
export const PlayIcon = refine(Play, "PlayIcon");
export const PlusIcon = refine(Plus, "PlusIcon");
export const ReceiptIcon = refine(Receipt, "ReceiptIcon");
export const ReturnIcon = refine(RotateCcw, "ReturnIcon");
export const RulerIcon = refine(Ruler, "RulerIcon");
export const ScaleIcon = refine(Scale, "ScaleIcon");
export const SearchIcon = refine(Search, "SearchIcon");
export const SettingsIcon = refine(Settings, "SettingsIcon");
export const ShareIcon = refine(Share2, "ShareIcon");
export const ShieldIcon = refine(ShieldCheck, "ShieldIcon");
export const BagIcon = refine(ShoppingBag, "BagIcon");
export const FilterIcon = refine(SlidersHorizontal, "FilterIcon");
export const SparkleIcon = refine(Sparkles, "SparkleIcon");
export const StarIcon = refine(Star, "StarIcon");
export const StoreIcon = refine(Store, "StoreIcon");
export const TagIcon = refine(Tag, "TagIcon");
export const TruckIcon = refine(Truck, "TruckIcon");
export const UploadIcon = refine(Upload, "UploadIcon");
export const UserIcon = refine(User, "UserIcon");
export const OfflineIcon = refine(WifiOff, "OfflineIcon");
export const CloseIcon = refine(X, "CloseIcon");
export const ZoomIcon = refine(ZoomIn, "ZoomIcon");

/* ------------------------------------------------------------------ */
/* Brand marks — simplified line glyphs matching the icon weight.      */
/* ------------------------------------------------------------------ */

type BrandIconProps = SVGProps<SVGSVGElement> & { size?: number };

function brandProps({ size = 20, ...props }: BrandIconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export function WhatsAppIcon(props: BrandIconProps) {
  return (
    <svg {...brandProps(props)}>
      <path d="M3.6 20.4 4.8 16.3A8.4 8.4 0 1 1 8 19.5Z" />
      <path
        d="M9.1 8.2c.2-.4.5-.4.8-.4h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .5-.1.6l-.5.6c-.1.1-.1.3 0 .5.5.9 1.3 1.7 2.3 2.2.2.1.4.1.5 0l.6-.6c.2-.2.4-.2.6-.1l1.5.7c.2.1.3.3.3.5v.4c0 .4-.2.8-.6 1-.5.3-1.2.4-1.9.2-2.4-.7-4.4-2.6-5.2-5-.2-.7-.1-1.4.1-1.9Z"
        fill="currentColor"
        stroke="none"
      />
    </svg>
  );
}

export function InstagramIcon(props: BrandIconProps) {
  return (
    <svg {...brandProps(props)}>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />
      <circle cx="12" cy="12" r="3.9" />
      <circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function FacebookIcon(props: BrandIconProps) {
  return (
    <svg {...brandProps(props)}>
      <path d="M14.5 8.2h2V4.8h-2.4c-2.5 0-3.8 1.6-3.8 4v2H8v3.3h2.3v6.1h3.3v-6.1h2.5l.4-3.3h-2.9V9.2c0-.6.3-1 .9-1Z" />
    </svg>
  );
}

export function YouTubeIcon(props: BrandIconProps) {
  return (
    <svg {...brandProps(props)}>
      <rect x="2.8" y="5.8" width="18.4" height="12.4" rx="3.6" />
      <path d="m10.3 9.4 4.4 2.6-4.4 2.6Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function PinterestIcon(props: BrandIconProps) {
  return (
    <svg {...brandProps(props)}>
      <circle cx="12" cy="12" r="8.6" />
      <path d="M11.2 9.6c.2-1.2 1.2-1.9 2.4-1.8 1.4.1 2.3 1.2 2.1 2.8-.2 1.6-1.3 2.8-2.7 2.7-.8 0-1.3-.5-1.4-1M11.6 11.2 9.8 19.4" />
    </svg>
  );
}
