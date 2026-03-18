import { NextResponse } from "next/server";
import { z } from "zod";
import { getParticipantWithResponse, upsertParticipant } from "@/lib/db";

const getSchema = z.object({
  participantId: z.string().uuid(),
});

const createSchema = z.object({
  participantId: z.string().uuid().optional(),
  name: z.string().trim().min(2).max(60).optional(),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const participantId = searchParams.get("participantId");

  try {
    const payload = getSchema.parse({ participantId });
    const participant = getParticipantWithResponse(payload.participantId);

    if (!participant) {
      return NextResponse.json({ error: "Không tìm thấy người dùng" }, { status: 404 });
    }

    return NextResponse.json(participant);
  } catch {
    return NextResponse.json({ error: "participantId không hợp lệ" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = createSchema.parse(await request.json());
    const participant = upsertParticipant(payload);
    const detail = getParticipantWithResponse(participant.participantId);

    return NextResponse.json(detail);
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
