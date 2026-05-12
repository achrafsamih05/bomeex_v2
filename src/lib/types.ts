// Shared domain types for the Nova e-commerce app.

export type Locale = "en" | "ar" | "fr";

export type LocalizedString = Record<Locale, string>;

export interface Category {
  id: string;
  slug: string;
  name: LocalizedString;
  icon: string; // lucide icon name
}

export interface Product {
  id: string;
  sku: string;
  name: LocalizedString;
  description: LocalizedString;
  price: number; // in smallest unit is fine, but for demo we use decimals
  currency: "USD";
  categoryId: string;
  stock: number;
  image: string;
  rating: number;
  createdAt: string;
}

export interface CartItem {
  productId: string;
  quantity: number;
}

export type OrderStatus =
  | "pending"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  customer: {
    name: string;
    email: string;
    address: string;
    phone: string;
  };
  items: {
    productId: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
}

export interface Invoice {
  id: string;
  orderId: string;
  number: string;
  issuedAt: string;
  dueAt: string;
  status: "paid" | "unpaid" | "overdue";
  amount: number;
}
