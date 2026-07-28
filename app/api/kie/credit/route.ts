import { NextResponse } from "next/server";
import { getCredits } from "@/lib/kie";
export async function GET() {
  try {
    const credits = await getCredits();
    return NextResponse.json({ credits });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch credits" }, { status: err.status || 500 });
  }
}
