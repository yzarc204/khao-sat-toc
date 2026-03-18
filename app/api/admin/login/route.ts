import { NextResponse } from "next/server";
import { z } from "zod";
import { setAdminSessionCookie, validateAdminPin } from "@/lib/auth";

const schema = z.object({
  pin: z.string().regex(/^\d{6}$/, "PIN phải gồm 6 chữ số"),
});

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const payload = schema.parse(await request.json());

    if (!validateAdminPin(payload.pin)) {
      return NextResponse.json({ error: "PIN không chính xác" }, { status: 401 });
    }

    await setAdminSessionCookie();
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Dữ liệu không hợp lệ" }, { status: 400 });
  }
}
