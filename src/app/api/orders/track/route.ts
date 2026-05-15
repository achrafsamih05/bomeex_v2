import { NextRequest } from "next/server";
import { getOrder } from "@/lib/server/db";
import { handle, httpError } from "@/lib/server/http";

// ---------------------------------------------------------------------------
// Public order tracking endpoint.
//
//   GET /api/orders/track?id=<order_id>&email=<customer_email>
//
// Why a separate route from /api/orders/[id]?
//   - /api/orders/[id] requires an authenticated session (owner or admin).
//     That's the right policy for the account dashboard, but it's wrong for
//     the public "track my order" use case where the customer paid as a
//     guest and never created an account.
//   - The trade-off: we can't trust the caller's identity, so we use the
//     order id + customer email as a paired bearer secret. Both must match
//     a single row before we return anything. An attacker who knows the
//     order id alone gets `Not found`; one who guesses an email alone gets
//     `Not found`; only the legitimate owner has both.
//
// Response shape is intentionally TRIMMED — we drop the internal `userId`
// and item productIds so this endpoint can never be used to enumerate the
// catalog or reverse-look-up a user. The customer just needs to see status,
// shipping, and what they bought.
// ---------------------------------------------------------------------------

export const dynamic = "force-dynamic";

interface PublicOrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface PublicOrder {
  id: string;
  status: string;
  createdAt: string;
  customer: {
    name: string;
    // Echo the email back redacted so a screenshot of the tracking page
    // doesn't leak the full address. Format: "j***@example.com".
    email: string;
    address: string;
  };
  items: PublicOrderItem[];
  subtotal: number;
  tax: number;
  total: number;
}

function redactEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 1) return "***" + email.slice(at);
  return email[0] + "***" + email.slice(at);
}

export const GET = (req: NextRequest) =>
  handle(async () => {
    const { searchParams } = new URL(req.url);
    const idRaw = searchParams.get("id")?.trim() ?? "";
    const emailRaw = searchParams.get("email")?.trim().toLowerCase() ?? "";

    if (!idRaw || !emailRaw) {
      httpError(400, "Order id and email are required");
    }

    const order = await getOrder(idRaw);
    // Constant "Not found" message regardless of which check failed, so the
    // endpoint cannot be used to confirm whether an order id exists.
    if (!order) httpError(404, "Order not found");

    if ((order!.customer.email || "").toLowerCase().trim() !== emailRaw) {
      httpError(404, "Order not found");
    }

    const sanitized: PublicOrder = {
      id: order!.id,
      status: order!.status,
      createdAt: order!.createdAt,
      customer: {
        name: order!.customer.name,
        email: redactEmail(order!.customer.email),
        address: order!.customer.address,
      },
      items: order!.items.map((it) => ({
        name: it.name,
        quantity: it.quantity,
        price: it.price,
      })),
      subtotal: order!.subtotal,
      tax: order!.tax,
      total: order!.total,
    };
    return sanitized;
  });
