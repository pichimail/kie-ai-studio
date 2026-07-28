import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[KIE Webhook]", JSON.stringify(body).slice(0, 500));
    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }
}
