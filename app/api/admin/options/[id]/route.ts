import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteOption, updateOption } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

const imageSchema = z.string().refine(
  (value) => {
    const trimmed = value.trim();
    return (
      /^data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/.test(trimmed) ||
      z.url().safeParse(trimmed).success
    );
  },
  { message: "Ảnh phải là data URL base64 hoặc URL hợp lệ." }
);

const updateSchema = z.object({
  name: z.string().min(2).max(80),
  imageUrl: imageSchema,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const optionId = Number(id);

    if (!Number.isInteger(optionId)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    const payload = updateSchema.parse(await request.json());
    const updated = updateOption(optionId, payload);

    if (!updated) {
      return NextResponse.json({ error: "Không tìm thấy lựa chọn" }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await context.params;
    const optionId = Number(id);

    if (!Number.isInteger(optionId)) {
      return NextResponse.json({ error: "ID không hợp lệ" }, { status: 400 });
    }

    deleteOption(optionId);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không thể xóa lựa chọn" }, { status: 400 });
  }
}
