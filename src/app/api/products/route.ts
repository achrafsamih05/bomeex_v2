import { NextRequest, NextResponse } from "next/server";
import { createProduct, listProducts, nextProductId } from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import type { Product } from "@/lib/types";

// GET /api/products?category=slug&q=text — public.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const q = searchParams.get("q")?.toLowerCase().trim() ?? "";

  let list = await listProducts();
  if (category && category !== "all") {
    list = list.filter(
      (p) => p.categoryId === `c-${category}` || p.categoryId === category
    );
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

// POST /api/products — admin only.
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as Partial<Product>;
  if (!body.name || body.price == null || !body.categoryId) {
    return NextResponse.json(
      { error: "name, price, and categoryId are required" },
      { status: 400 }
    );
  }
  const id = await nextProductId();
  const product: Product = {
    id,
    sku: body.sku ?? `NVA-${Date.now()}`,
    name: body.name as Product["name"],
    description:
      body.description ?? ({ en: "", ar: "", fr: "" } as Product["description"]),
    price: Number(body.price),
    categoryId: body.categoryId,
    stock: Number(body.stock ?? 0),
    image: body.image ?? "https://picsum.photos/seed/nova/800/800",
    rating: Number(body.rating ?? 4.5),
    createdAt: new Date().toISOString(),
  };
  await createProduct(product);
  emit({ channel: "products", action: "created", id: product.id });

  return NextResponse.json({ data: product }, { status: 201 });
}
