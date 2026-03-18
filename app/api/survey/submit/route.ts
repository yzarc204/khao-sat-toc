import { NextResponse } from "next/server";
import { z } from "zod";
import { submitSurvey } from "@/lib/db";

const schema = z.object({
  participantId: z.string().uuid(),
  selectedOptionIds: z.array(z.number().int()).min(1),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());
    const result = submitSurvey(payload);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Không thể gửi khảo sát" }, { status: 400 });
  }
}
