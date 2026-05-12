import { listCategories } from "@/lib/server/db";
import { handle } from "@/lib/server/http";

export const dynamic = "force-dynamic";

// GET /api/categories — public.
export const GET = () => handle(() => listCategories());
