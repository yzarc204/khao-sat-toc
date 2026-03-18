import { NextResponse } from "next/server";
import { z } from "zod";
import { reorderOptions } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const schema = z.object({
  orderedIds: z.array(z.number().int()).min(1),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const payload = schema.parse(await request.json());
    reorderOptions(payload.orderedIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
