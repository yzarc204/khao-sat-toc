import { NextResponse } from "next/server";
import { deleteAllResponses, getAdminDashboardData } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getAdminDashboardData().responses);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không thể tải kết quả" }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await requireAdmin();
    deleteAllResponses();
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không thể xóa toàn bộ kết quả" }, { status: 400 });
  }
}
