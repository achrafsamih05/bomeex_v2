import { NextRequest, NextResponse } from "next/server";
import { nextProductId, products } from "@/lib/db";
import type { Product } from "@/lib/types";

// GET /api/products?category=slug&q=text
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";

  let list = products;
  if (category && category !== "all") {
    list = list.filter((p) => p.categoryId === `c-${category}` || p.categoryId === category);
  }
  if (q) {
    list = list.filter((p) =>
      [p.name.en, p.name.ar, p.name.fr, p.description.en, p.sku]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  return NextResponse.json({ data: list });
}

// POST /api/products  — create
export async function POST(req: NextRequest) {
  const body = (await req.json()) as Partial<Product>;
  if (!body.name || !body.price || !body.categoryId) {
    return NextResponse.json(
      { error: "name, price, and categoryId are required" },
      { status: 400 }
    );
  }
  const product: Product = {
    id: nextProductId(),
    sku: body.sku ?? `NVA-${Date.now()}`,
    name: body.name as Product["name"],
    description:
      body.description ??
      ({ en: "", ar: "", fr: "" } as Product["description"]),
    price: Number(body.price),
    currency: "USD",
    categoryId: body.categoryId,
    stock: Number(body.stock ?? 0),
    image: body.image ?? "https://picsum.photos/seed/nova/800/800",
    rating: Number(body.rating ?? 4.5),
    createdAt: new Date().toISOString(),
  };
  products.push(product);
  return NextResponse.json({ data: product }, { status: 201 });
}
