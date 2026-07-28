const KIE_BASE = "https://api.kie.ai";
function getApiKey(): string {
  const key = process.env.KIE_AI_API_KEY;
  if (!key) throw new Error("KIE_AI_API_KEY is not set in environment variables");
  return key;
}
async function kieFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${KIE_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getApiKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as any)?.msg || (data as any)?.message || `KIE API error ${res.status}`;
    const err = new Error(msg) as Error & { status?: number; code?: number };
    err.status = res.status;
    err.code = (data as any)?.code;
    throw err;
  }
  return data as T;
}
export async function getCredits(): Promise<number> {
  const data = await kieFetch<{ code: number; data: number }>("/api/v1/chat/credit", { method: "GET" });
  return data.data ?? 0;
}
export async function createTask(payload: { model: string; callBackUrl?: string; input: Record<string, unknown> }) {
  return kieFetch<{ code: number; msg: string; data: { taskId: string } }>("/api/v1/jobs/createTask", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function generateVeo(payload: {
  prompt: string;
  model?: "veo3_quality" | "veo3_fast" | "veo3_lite";
  aspect_ratio?: "16:9" | "9:16";
  imageUrls?: string[];
  generationType?: "TEXT_2_VIDEO" | "FIRST_AND_LAST_FRAMES_2_VIDEO" | "REFERENCE_2_VIDEO";
  callBackUrl?: string;
  watermark?: string;
  enableTranslation?: boolean;
}) {
  return kieFetch<{ code: number; msg: string; data: { taskId: string } }>("/api/v1/veo/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function generateGptImage(payload: { prompt: string; size?: string; filesUrl?: string[]; callBackUrl?: string }) {
  return kieFetch<{ code: number; msg: string; data: { taskId: string } }>("/api/v1/gpt4o-image/generate", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
export async function getTaskStatus(taskId: string) {
  return kieFetch<{ code: number; msg: string; data: any }>(`/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`, { method: "GET" });
}
export async function getDownloadUrl(url: string) {
  return kieFetch<{ code: number; msg: string; data: string }>("/api/v1/common/download-url", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
}
