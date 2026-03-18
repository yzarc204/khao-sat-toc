import { NextResponse } from "next/server";
import { deleteResponse } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const responseId = Number(id);

    if (!Number.isInteger(responseId)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    deleteResponse(responseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không thể xóa kết quả" }, { status: 400 });
  }
}
