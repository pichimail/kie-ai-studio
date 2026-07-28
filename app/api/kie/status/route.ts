import { NextRequest, NextResponse } from "next/server";
import { getTaskStatus } from "@/lib/kie";
export async function GET(req: NextRequest) {
  const taskId = req.nextUrl.searchParams.get("taskId");
  if (!taskId) return NextResponse.json({ error: "taskId is required" }, { status: 400 });
  try {
    const result = await getTaskStatus(taskId);
    const data = result.data;
    let resultUrls: string[] = [];
    if (data.resultJson) {
      try {
        const parsed = JSON.parse(data.resultJson);
        resultUrls = parsed.resultUrls || parsed.urls || [];
      } catch {}
    }
    return NextResponse.json({
      taskId: data.taskId, model: data.model, state: data.state,
      progress: data.progress ?? (data.state === "success" ? 100 : 0),
      resultUrls, failMsg: data.failMsg, creditsConsumed: data.creditsConsumed, costTime: data.costTime,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to fetch task status" }, { status: err.status || 500 });
  }
}
