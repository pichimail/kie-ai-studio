import { NextRequest, NextResponse } from "next/server";
import { createTask, generateVeo, generateGptImage } from "@/lib/kie";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, model, prompt, options = {} } = body;
    if (!prompt && type !== "chat") {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }
    const callBackUrl = process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/kie/webhook`
      : undefined;
    let result: { code: number; msg: string; data: { taskId: string } };

    switch (type) {
      case "veo": {
        result = await generateVeo({
          prompt,
          model: options.model || "veo3_fast",
          aspect_ratio: options.aspectRatio || "16:9",
          imageUrls: options.imageUrls,
          generationType: options.generationType || "TEXT_2_VIDEO",
          callBackUrl,
          enableTranslation: true,
        });
        break;
      }
      case "gpt-image": {
        result = await generateGptImage({
          prompt,
          size: options.size || "1:1",
          filesUrl: options.imageUrls,
          callBackUrl,
        });
        break;
      }
      case "image": {
        result = await createTask({
          model: model || "grok-imagine/text-to-image",
          callBackUrl,
          input: {
            prompt,
            aspect_ratio: options.aspectRatio || "1:1",
            mode: options.mode || "normal",
            ...(options.extra || {}),
          },
        });
        break;
      }
      case "video": {
        const input: Record<string, unknown> = {
          prompt,
          aspect_ratio: options.aspectRatio || "16:9",
          duration: options.duration || "6",
          resolution: options.resolution || "720p",
          mode: options.mode || "normal",
        };
        if (options.imageUrls?.length) input.image_urls = options.imageUrls;
        if (options.taskId) {
          input.task_id = options.taskId;
          input.index = options.index ?? 0;
        }
        result = await createTask({
          model: model || "grok-imagine/text-to-video",
          callBackUrl,
          input: { ...input, ...(options.extra || {}) },
        });
        break;
      }
      case "audio": {
        result = await createTask({
          model: model || "elevenlabs/text-to-speech-multilingual-v2",
          callBackUrl,
          input: { text: prompt, voice: options.voice || "Rachel", ...(options.extra || {}) },
        });
        break;
      }
      case "chat": {
        result = await createTask({
          model: model || "gemini/gemini-2-5-pro",
          callBackUrl,
          input: { messages: options.messages || [{ role: "user", content: prompt }], ...(options.extra || {}) },
        });
        break;
      }
      default:
        return NextResponse.json({ error: `Unsupported generation type: ${type}` }, { status: 400 });
    }
    return NextResponse.json({ taskId: result.data.taskId, message: result.msg });
  } catch (err: any) {
    console.error("[KIE generate]", err);
    return NextResponse.json({ error: err.message || "Generation request failed", code: err.code }, { status: err.status || 500 });
  }
}
