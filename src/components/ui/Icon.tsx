"use client";

import {
  ShoppingBag,
  Search,
  Globe,
  Home,
  LayoutGrid,
  User,
  X,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Star,
  Cpu,
  Smartphone,
  Wrench,
  Sofa,
  Shirt,
  Dumbbell,
  LayoutDashboard,
  Boxes,
  FileText,
  Settings,
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Edit,
  Save,
  ShoppingCart,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  LogOut,
  LogIn,
  ShieldCheck,
  Users,
  UserX,
  Ban,
  RefreshCw,
  Mail,
  Lock,
  Eye,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  Music2,
  Printer,
  Wallet,
  Receipt,
  Layers,
  Tag,
  Plane,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";
import { forwardRef } from "react";

// WhatsApp has no official Lucide glyph, so we ship a hand-built one that
// honours the same API as every Lucide icon (size / strokeWidth / className /
// currentColor). Drawn on the standard 24×24 Lucide viewBox with a filled
// glyph so it reads cleanly at small sizes in the monochrome footer.
const WhatsApp = forwardRef<SVGSVGElement, LucideProps>(function WhatsApp(
  { size = 24, className, ...props },
  ref
) {
  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2Zm0 1.82c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.72c0 4.46-3.63 8.09-8.1 8.09a8.1 8.1 0 0 1-4.12-1.13l-.3-.18-3.12.82.83-3.04-.19-.31a8.05 8.05 0 0 1-1.24-4.3c0-4.46 3.63-8.09 8.1-8.09Zm-4.56 4.9c-.16 0-.42.06-.64.3-.22.24-.85.83-.85 2.03s.87 2.35.99 2.51c.12.16 1.71 2.61 4.14 3.66.58.25 1.03.4 1.38.51.58.18 1.11.16 1.53.1.47-.07 1.43-.58 1.63-1.15.2-.56.2-1.05.14-1.15-.06-.1-.22-.16-.46-.28-.24-.12-1.43-.71-1.65-.79-.22-.08-.38-.12-.54.12-.16.24-.62.79-.76.95-.14.16-.28.18-.52.06-.24-.12-1.01-.37-1.93-1.19-.71-.64-1.19-1.42-1.33-1.66-.14-.24-.02-.37.1-.49.11-.11.24-.28.36-.42.12-.14.16-.24.24-.4.08-.16.04-.3-.02-.42-.06-.12-.54-1.31-.75-1.79-.19-.46-.39-.4-.54-.41-.14-.01-.3-.01-.46-.01Z" />
    </svg>
  );
}) as unknown as LucideIcon;

export const ICONS: Record<string, LucideIcon> = {
  ShoppingBag,
  ShoppingCart,
  Search,
  Globe,
  Home,
  LayoutGrid,
  User,
  X,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Star,
  Cpu,
  Smartphone,
  Wrench,
  Sofa,
  Shirt,
  Dumbbell,
  LayoutDashboard,
  Boxes,
  FileText,
  Settings,
  TrendingUp,
  Package,
  DollarSign,
  CheckCircle2,
  Clock,
  Truck,
  XCircle,
  Edit,
  Save,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  LogOut,
  LogIn,
  ShieldCheck,
  Users,
  UserX,
  Ban,
  RefreshCw,
  Mail,
  Lock,
  Eye,
  Phone,
  MapPin,
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  Linkedin,
  // TikTok has no dedicated lucide icon; Music2 is the closest stand-in.
  Music2,
  Printer,
  Wallet,
  Receipt,
  Layers,
  Tag,
  Plane,
  WhatsApp,
};

export function Icon({
  name,
  className,
  size = 18,
  strokeWidth = 2,
}: {
  name: keyof typeof ICONS | string;
  className?: string;
  size?: number;
  strokeWidth?: number;
}) {
  const Cmp = ICONS[name] ?? ICONS.LayoutGrid;
  return <Cmp className={className} size={size} strokeWidth={strokeWidth} />;
}
