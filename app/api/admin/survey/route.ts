import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { getSurveySettings, updateSurveySettings } from "@/lib/db";

const schema = z
  .object({
    surveyTitle: z.string().trim().min(3).max(80),
    questionTitle: z.string().min(5).max(200),
    minSelect: z.number().int().min(1).max(20),
    maxSelect: z.number().int().min(1).max(20),
    isOpen: z.boolean(),
  })
  .refine((value) => value.minSelect <= value.maxSelect, {
    message: "Số chọn tối thiểu không thể lớn hơn tối đa",
    path: ["maxSelect"],
  });

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json(getSurveySettings());
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Không thể tải cài đặt" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdmin();
    const payload = schema.parse(await request.json());
    return NextResponse.json(updateSurveySettings(payload));
  } catch (error) {
    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
