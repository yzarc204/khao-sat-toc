import { NextResponse } from "next/server";
import { z } from "zod";
import { createOption, getOptions } from "@/lib/db";
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

const createSchema = z.object({
  name: z.string().min(2).max(80),
  imageUrl: imageSchema,
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getOptions());
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không thể tải danh sách" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const payload = createSchema.parse(await request.json());
    return NextResponse.json(createOption(payload));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
