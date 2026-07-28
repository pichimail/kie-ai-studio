import { NextRequest, NextResponse } from "next/server";
import { getDownloadUrl } from "@/lib/kie";
export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "url is required" }, { status: 400 });
    const result = await getDownloadUrl(url);
    return NextResponse.json({ downloadUrl: result.data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to get download URL" }, { status: err.status || 500 });
  }
}
