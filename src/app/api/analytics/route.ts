import { NextResponse } from "next/server";
import { invoices, orders, products } from "@/lib/db";

// GET /api/analytics — summary for the admin dashboard
export async function GET() {
  const revenue = orders.reduce((s, o) => s + o.total, 0);
  const pending = orders.filter((o) => o.status === "pending").length;
  const shipped = orders.filter((o) => o.status === "shipped").length;
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const unpaid = invoices.filter((i) => i.status !== "paid").length;

  // Build top-products by order line quantity.
  const totals = new Map<string, { name: string; qty: number; revenue: number }>();
  for (const o of orders) {
    for (const it of o.items) {
      const cur =
        totals.get(it.productId) ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.quantity;
      cur.revenue += it.price * it.quantity;
      totals.set(it.productId, cur);
    }
  }
  const topProducts = Array.from(totals.entries())
    .map(([productId, v]) => ({ productId, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const lowStock = products
    .filter((p) => p.stock <= 20)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5)
    .map((p) => ({ id: p.id, name: p.name.en, stock: p.stock }));

  return NextResponse.json({
    data: {
      revenue,
      orders: orders.length,
      products: products.length,
      pending,
      shipped,
      delivered,
      unpaid,
      topProducts,
      lowStock,
    },
  });
}
