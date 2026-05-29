import { NextRequest } from "next/server";
import {
  createExpense,
  getWalletBalance,
  listExpenses,
} from "@/lib/server/db";
import { getCurrentUser } from "@/lib/server/auth";
import { emit } from "@/lib/server/bus";
import { handle, httpError } from "@/lib/server/http";
import { EXPENSE_CATEGORIES, type ExpenseCategory } from "@/lib/types";

export const dynamic = "force-dynamic";

const MAX_TITLE = 120;
const MAX_DESCRIPTION = 500;
const MAX_AMOUNT = 100_000_000;

async function requireAdmin(): Promise<void> {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") httpError(401, "Unauthorized");
}

function isExpenseCategory(value: unknown): value is ExpenseCategory {
  return (
    typeof value === "string" &&
    (EXPENSE_CATEGORIES as readonly string[]).includes(value)
  );
}

// GET /api/admin/expenses — live wallet balance + every expense (newest first).
// Bundled so the finance dashboard renders from a single fetch and the wallet
// figure is read in the same request as the table.
export const GET = () =>
  handle(async () => {
    await requireAdmin();
    const [walletBalance, expenses] = await Promise.all([
      getWalletBalance(),
      listExpenses(),
    ]);
    return { walletBalance, expenses };
  });

// POST /api/admin/expenses — log a new business cost. We only INSERT; the
// `expenses_apply_wallet` DB trigger debits settings.wallet_balance in the same
// transaction. We then re-read the balance so the client can update instantly.
export const POST = (req: NextRequest) =>
  handle(async () => {
    await requireAdmin();

    const body = (await req.json().catch(() => ({}))) as {
      title?: unknown;
      category?: unknown;
      amount?: unknown;
      description?: unknown;
    };

    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) httpError(400, "Title is required");
    if (title.length > MAX_TITLE) httpError(400, "Title is too long");

    const category: ExpenseCategory = isExpenseCategory(body.category)
      ? body.category
      : "others";

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount < 0 || amount > MAX_AMOUNT) {
      httpError(400, "Amount must be a number between 0 and 100,000,000");
    }

    const description =
      typeof body.description === "string"
        ? body.description.trim().slice(0, MAX_DESCRIPTION)
        : "";

    const expense = await createExpense({ title, category, amount, description });
    emit({ channel: "expenses", action: "created", id: expense.id });

    // Re-read the wallet AFTER the trigger fired so the response reflects the
    // post-deduction balance.
    const walletBalance = await getWalletBalance();
    return { expense, walletBalance };
  });
