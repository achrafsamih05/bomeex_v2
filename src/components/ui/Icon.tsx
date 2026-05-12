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
  type LucideIcon,
} from "lucide-react";

// Central registry so we can reference icons by name (e.g. from the DB).
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
