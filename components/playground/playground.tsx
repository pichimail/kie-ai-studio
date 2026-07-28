"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Image as ImageIcon,
  Video,
  Music,
  MessageSquare,
  Sparkles,
  Loader2,
  Download,
  Copy,
  Check,
  Moon,
  Sun,
  Zap,
  RefreshCw,
  Upload,
  Link2,
  Info,
  AlertTriangle,
} from "lucide-react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Tab = "image" | "video" | "audio" | "chat";
type ImageSource = "upload" | "task";

const MODELS = {
  image: [
    { id: "grok-imagine/text-to-image", label: "Grok Imagine (Default)", group: "grok" },
    { id: "google/imagen4", label: "Google Imagen 4", group: "other" },
    { id: "gpt/gpt-image-2-text-to-image", label: "GPT Image 2", group: "gpt" },
    { id: "google/nanobanana2", label: "Nano Banana 2", group: "other" },
  ],
  video: [
    { id: "grok-imagine/text-to-video", label: "Grok Imagine T2V (Default)", group: "grok" },
    { id: "grok-imagine/image-to-video", label: "Grok Imagine I2V", group: "grok" },
    { id: "veo", label: "Veo 3.1 Fast", group: "veo" },
    { id: "veo-quality", label: "Veo 3.1 Quality", group: "veo" },
    { id: "kling/kling-3-0", label: "Kling 3.0", group: "kling" },
    { id: "bytedance/seedance-2", label: "Seedance 2.0", group: "seedance" },
  ],
  audio: [
    { id: "elevenlabs/text-to-speech-multilingual-v2", label: "ElevenLabs Multilingual" },
    { id: "elevenlabs/text-to-speech-turbo-2-5", label: "ElevenLabs Turbo" },
  ],
  chat: [
    { id: "gemini/gemini-2-5-pro", label: "Gemini 2.5 Pro" },
    { id: "gemini/gemini-2-5-flash", label: "Gemini 2.5 Flash" },
    { id: "claude/claude-sonnet-4-5", label: "Claude Sonnet 4.5" },
  ],
};

const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "2:3", "3:2"];
const DURATIONS = [
  { value: "6", label: "6s" },
  { value: "10", label: "10s" },
  { value: "15", label: "15s" },
  { value: "30", label: "30s" },
];
const RESOLUTIONS = [
  { value: "480p", label: "480p", cost: "1.6 cr/s" },
  { value: "720p", label: "720p", cost: "3.0 cr/s" },
];
const MODES = [
  { value: "normal", label: "Normal" },
  { value: "fun", label: "Fun" },
  { value: "spicy", label: "Spicy" },
];

export function Playground() {
  const { theme, setTheme } = useTheme();
  const [tab, setTab] = useState<Tab>("video");
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(MODELS.video[0].id);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [duration, setDuration] = useState("6");
  const [resolution, setResolution] = useState("720p");
  const [mode, setMode] = useState("normal");
  const [imageSource, setImageSource] = useState<ImageSource>("upload");
  const [imageUrl, setImageUrl] = useState("");
  const [taskIdRef, setTaskIdRef] = useState("");
  const [index, setIndex] = useState(0);
  const [credits, setCredits] = useState<number | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [resultUrls, setResultUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [copied, setCopied] = useState(false);

  const isGrok = model.startsWith("grok-imagine");
  const isGrokI2V = model === "grok-imagine/image-to-video";
  const isVeo = model.startsWith("veo");
  const isExternalImage = imageSource === "upload" && !!imageUrl.trim();

  useEffect(() => {
    if (isGrok && isExternalImage && mode === "spicy") {
      setMode("normal");
      toast.message("Spicy mode disabled for external images — switched to Normal");
    }
  }, [isGrok, isExternalImage, mode]);

  useEffect(() => {
    setModel(MODELS[tab][0].id);
    setResultUrls([]);
    setTaskId(null);
    setStatus(null);
    setProgress(0);
  }, [tab]);

  useEffect(() => {
    fetchCredits();
  }, []);

  const estimatedCost = useMemo(() => {
    if (!isGrok || tab !== "video") return null;
    const rate = resolution === "720p" ? 3.0 : 1.6;
    return (rate * Number(duration)).toFixed(1);
  }, [isGrok, tab, resolution, duration]);

  const fetchCredits = async () => {
    try {
      const res = await fetch("/api/kie/credit");
      const data = await res.json();
      if (res.ok) setCredits(data.credits);
    } catch {}
  };

  const pollStatus = useCallback(async (id: string) => {
    setPolling(true);
    const maxAttempts = 120;
    let attempts = 0;
    const poll = async () => {
      try {
        const res = await fetch(`/api/kie/status?taskId=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (!res.ok) {
          toast.error(data.error || "Status check failed");
          setPolling(false);
          setLoading(false);
          return;
        }
        setStatus(data.state);
        setProgress(data.progress || 0);
        if (data.state === "success") {
          setResultUrls(data.resultUrls || []);
          setPolling(false);
          setLoading(false);
          toast.success("Generation complete!");
          fetchCredits();
          return;
        }
        if (data.state === "fail") {
          toast.error(data.failMsg || "Generation failed");
          setPolling(false);
          setLoading(false);
          return;
        }
        attempts++;
        if (attempts < maxAttempts) setTimeout(poll, 5000);
        else {
          toast.error("Timed out waiting for result");
          setPolling(false);
          setLoading(false);
        }
      } catch {
        toast.error("Polling error");
        setPolling(false);
        setLoading(false);
      }
    };
    poll();
  }, []);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (isGrokI2V && imageSource === "upload" && !imageUrl.trim()) {
      toast.error("Please provide an image URL for Image-to-Video");
      return;
    }
    if (isGrokI2V && imageSource === "task" && !taskIdRef.trim()) {
      toast.error("Please provide a previous Grok Task ID");
      return;
    }

    setLoading(true);
    setResultUrls([]);
    setTaskId(null);
    setStatus("queuing");
    setProgress(0);

    try {
      let type: string = tab;
      let selectedModel = model;
      let options: Record<string, any> = {
        aspectRatio,
        duration,
        resolution,
        mode: isExternalImage && mode === "spicy" ? "normal" : mode,
      };

      if (isGrokI2V) {
        type = "video";
        if (imageSource === "upload") {
          options.imageUrls = [imageUrl.trim()];
        } else {
          options.taskId = taskIdRef.trim();
          options.index = index;
        }
      } else if (isVeo) {
        type = "veo";
        options.model = model === "veo-quality" ? "veo3_quality" : "veo3_fast";
        options.aspectRatio = aspectRatio === "9:16" ? "9:16" : "16:9";
      } else if (tab === "image" && model.includes("gpt-image")) {
        type = "gpt-image";
        options.size = aspectRatio;
      }

      const res = await fetch("/api/kie/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, model: selectedModel, prompt, options }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      setTaskId(data.taskId);
      toast.info(`Task started: ${data.taskId.slice(0, 12)}…`);
      pollStatus(data.taskId);
    } catch (err: any) {
      toast.error(err.message || "Something went wrong");
      setLoading(false);
      setStatus(null);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("URL copied");
    setTimeout(() => setCopied(false), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "video", label: "Video", icon: <Video className="size-4" /> },
    { id: "image", label: "Image", icon: <ImageIcon className="size-4" /> },
    { id: "audio", label: "Audio / TTS", icon: <Music className="size-4" /> },
    { id: "chat", label: "LLM Chat", icon: <MessageSquare className="size-4" /> },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-zinc-950 to-zinc-950" />
      <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-10 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-600/20 text-violet-400 shadow-float">
              <Sparkles className="size-6" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">KIE.ai Studio</h1>
              <p className="text-sm text-zinc-400">Grok Imagine · Veo · Kling · Seedance · GPT Image</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-2xl border border-zinc-800/60 bg-zinc-900/60 px-4 py-2 text-sm shadow-float">
              <Zap className="size-4 text-amber-400" />
              <span className="text-zinc-400">Credits</span>
              <span className="font-semibold text-zinc-50">{credits === null ? "…" : credits.toLocaleString()}</span>
              <button onClick={fetchCredits} className="ml-1 rounded-lg p-1 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300" title="Refresh credits">
                <RefreshCw className="size-3.5" />
              </button>
            </div>
            <Button variant="outline" size="icon" onClick={() => setTheme(theme === "dark" ? "light" : "dark")} className="rounded-2xl border-zinc-800">
              {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </Button>
          </div>
        </header>

        <div className="mb-8 flex flex-wrap gap-2">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={cn(
              "flex items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-medium transition-all",
              tab === t.id ? "bg-violet-600 text-white shadow-lg shadow-violet-900/40" : "border border-zinc-800/60 bg-zinc-900/50 text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
            )}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="floating-card p-6">
              <label className="mb-2 block text-sm font-medium text-zinc-300">Model</label>
              <select value={model} onChange={(e) => setModel(e.target.value)} className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500">
                {MODELS[tab].map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
              {isGrok && <p className="mt-2 text-xs text-violet-400/80 flex items-center gap-1.5"><Sparkles className="size-3" /> Grok Imagine is the default model</p>}
            </div>

            {isGrok && (tab === "video" || tab === "image") && (
              <div className="floating-card p-6">
                <label className="mb-2 block text-sm font-medium text-zinc-300">Mode</label>
                <div className="flex flex-wrap gap-2">
                  {MODES.map((m) => {
                    const disabled = m.value === "spicy" && isExternalImage;
                    return (
                      <button key={m.value} disabled={disabled} onClick={() => setMode(m.value)} className={cn(
                        "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                        mode === m.value ? "bg-violet-600 text-white" : disabled ? "bg-zinc-900 text-zinc-600 cursor-not-allowed" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                      )}>
                        {m.label}{disabled && " (N/A)"}
                      </button>
                    );
                  })}
                </div>
                {isExternalImage && (
                  <p className="mt-2 flex items-start gap-1.5 text-xs text-amber-400/90">
                    <AlertTriangle className="size-3.5 shrink-0 mt-0.5" />
                    Spicy mode is not available with external images and will fall back to Normal.
                  </p>
                )}
              </div>
            )}

            {isGrokI2V && (
              <div className="floating-card p-6 space-y-4">
                <label className="block text-sm font-medium text-zinc-300">Image Source</label>
                <div className="flex gap-2">
                  <button onClick={() => setImageSource("upload")} className={cn("flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all", imageSource === "upload" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>
                    <Upload className="size-3.5" /> External URL
                  </button>
                  <button onClick={() => setImageSource("task")} className={cn("flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-medium transition-all", imageSource === "task" ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>
                    <Link2 className="size-3.5" /> Grok Task + Index
                  </button>
                </div>
                {imageSource === "upload" ? (
                  <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://… (public image URL)" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500" />
                ) : (
                  <div className="space-y-3">
                    <input type="text" value={taskIdRef} onChange={(e) => setTaskIdRef(e.target.value)} placeholder="Previous Grok task ID" className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500" />
                    <div>
                      <label className="mb-1.5 block text-xs text-zinc-400">Image Index (0–5 from batch of 6)</label>
                      <div className="flex gap-1.5">
                        {[0, 1, 2, 3, 4, 5].map((i) => (
                          <button key={i} onClick={() => setIndex(i)} className={cn("size-9 rounded-lg text-sm font-medium transition-all", index === i ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>{i}</button>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-zinc-500 flex items-center gap-1.5"><Info className="size-3.5" /> Spicy mode is fully supported when using Task ID + Index</p>
                  </div>
                )}
              </div>
            )}

            {(isGrok || isVeo) && tab === "video" && (
              <div className="floating-card p-6 space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Duration</label>
                  <div className="flex flex-wrap gap-2">
                    {DURATIONS.map((d) => (
                      <button key={d.value} onClick={() => setDuration(d.value)} className={cn("rounded-xl px-3 py-1.5 text-xs font-medium transition-all", duration === d.value ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>{d.label}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-zinc-300">Resolution</label>
                  <div className="flex flex-wrap gap-2">
                    {RESOLUTIONS.map((r) => (
                      <button key={r.value} onClick={() => setResolution(r.value)} className={cn("rounded-xl px-3 py-1.5 text-xs font-medium transition-all", resolution === r.value ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>
                        {r.label} <span className="opacity-70">({r.cost})</span>
                      </button>
                    ))}
                  </div>
                </div>
                {estimatedCost && <p className="text-xs text-zinc-400">Est. cost: <span className="text-amber-400 font-medium">{estimatedCost} credits</span></p>}
              </div>
            )}

            {(tab === "image" || tab === "video") && (
              <div className="floating-card p-6">
                <label className="mb-2 block text-sm font-medium text-zinc-300">Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                  {ASPECT_RATIOS.map((ar) => (
                    <button key={ar} onClick={() => setAspectRatio(ar)} className={cn("rounded-xl px-3 py-1.5 text-xs font-medium transition-all", aspectRatio === ar ? "bg-violet-600 text-white" : "bg-zinc-800 text-zinc-400 hover:bg-zinc-700")}>{ar}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="floating-card p-6">
              <label className="mb-2 block text-sm font-medium text-zinc-300">Prompt</label>
              <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={5}
                placeholder={isGrokI2V ? "Describe motion… Use @image1 to reference the input frame" : tab === "chat" ? "Ask anything…" : tab === "audio" ? "Text to speak…" : "Describe what you want to create…"}
                className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500"
              />
              {isGrok && <p className="mt-2 text-xs text-zinc-500 flex items-center gap-1.5"><Info className="size-3.5" /> Tip: use <code className="text-violet-400">@image1</code> … <code className="text-violet-400">@image6</code> to reference frames</p>}
            </div>

            <Button onClick={handleGenerate} disabled={loading || !prompt.trim()} size="lg" className="w-full rounded-2xl bg-violet-600 hover:bg-violet-500">
              {loading ? (<><Loader2 className="size-4 animate-spin" />Generating…</>) : (<><Sparkles className="size-4" />Generate {estimatedCost ? `· ~${estimatedCost} cr` : ""}</>)}
            </Button>
          </div>

          <div className="lg:col-span-3">
            <div className="floating-card min-h-[480px] p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-zinc-100">Result</h2>
                {taskId && <span className="rounded-lg bg-zinc-800 px-2.5 py-1 font-mono text-xs text-zinc-400">{taskId.slice(0, 16)}…</span>}
              </div>
              <AnimatePresence mode="wait">
                {loading || polling ? (
                  <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center gap-4 py-24">
                    <Loader2 className="size-10 animate-spin text-violet-400" />
                    <p className="text-sm text-zinc-400 capitalize">{status || "Starting"}…</p>
                    {progress > 0 && (
                      <div className="h-1.5 w-48 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-violet-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                      </div>
                    )}
                  </motion.div>
                ) : resultUrls.length > 0 ? (
                  <motion.div key="result" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {resultUrls.map((url, i) => (
                      <div key={i} className="space-y-3">
                        {tab === "video" || url.includes(".mp4") || url.includes("video") ? (
                          <video src={url} controls className="w-full rounded-2xl border border-zinc-800" />
                        ) : tab === "audio" || url.includes(".mp3") || url.includes("audio") ? (
                          <audio src={url} controls className="w-full" />
                        ) : (
                          <img src={url} alt={`Generated ${i + 1}`} className="w-full rounded-2xl border border-zinc-800 object-contain" />
                        )}
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => copyUrl(url)} className="rounded-xl">
                            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} Copy URL
                          </Button>
                          <a href={url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="rounded-xl"><Download className="size-3.5" /> Open</Button>
                          </a>
                        </div>
                      </div>
                    ))}
                  </motion.div>
                ) : (
                  <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-3 py-28 text-center">
                    <div className="rounded-3xl bg-zinc-800/50 p-5">
                      {tab === "video" && <Video className="size-8 text-zinc-600" />}
                      {tab === "image" && <ImageIcon className="size-8 text-zinc-600" />}
                      {tab === "audio" && <Music className="size-8 text-zinc-600" />}
                      {tab === "chat" && <MessageSquare className="size-8 text-zinc-600" />}
                    </div>
                    <p className="text-sm text-zinc-500">Your generated content will appear here</p>
                    {isGrok && <p className="text-xs text-zinc-600 max-w-xs">Grok Imagine supports up to 6 images per task and native ambient audio + lip-sync on video.</p>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-600">
          Powered by <a href="https://kie.ai" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:underline">KIE.ai</a> · Grok Imagine default · API key server-side only · Media retained 14 days
        </p>
      </div>
    </div>
  );
}
