import { NextRequest, NextResponse } from "next/server";
import {
  invoices,
  nextInvoiceId,
  nextOrderId,
  orders,
  products,
} from "@/lib/db";
import type { Order } from "@/lib/types";

// GET /api/orders
export async function GET() {
  return NextResponse.json({ data: orders });
}

// POST /api/orders  — create a new order + matching invoice
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { customer, items } = body as {
    customer: Order["customer"];
    items: { productId: string; quantity: number }[];
  };

  if (!customer?.email || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "customer and non-empty items are required" },
      { status: 400 }
    );
  }

  const orderItems = items
    .map((it) => {
      const p = products.find((x) => x.id === it.productId);
      if (!p) return null;
      return {
        productId: p.id,
        name: p.name.en,
        quantity: it.quantity,
        price: p.price,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  const subtotal = orderItems.reduce((s, i) => s + i.price * i.quantity, 0);
  const tax = +(subtotal * 0.1).toFixed(2);
  const total = +(subtotal + tax).toFixed(2);

  const order: Order = {
    id: nextOrderId(),
    customer,
    items: orderItems,
    subtotal,
    tax,
    total,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  orders.unshift(order);

  // Auto-generate invoice on order creation.
  const now = new Date();
  const due = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  invoices.unshift({
    id: nextInvoiceId(),
    orderId: order.id,
    number: `INV-${now.getFullYear()}-${invoices.length + 5001}`,
    issuedAt: now.toISOString(),
    dueAt: due.toISOString(),
    status: "unpaid",
    amount: total,
  });

  return NextResponse.json({ data: order }, { status: 201 });
}
