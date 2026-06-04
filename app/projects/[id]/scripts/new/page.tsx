"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

type Mode = "script" | "novel";

export default function NewScriptPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params.id as string;

  const [projectName, setProjectName] = useState("");
  const [mode, setMode] = useState<Mode>("novel");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    novelText: "",
    content: "",
    notes: "",
  });

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${projectId}`);
        if (res.ok) {
          const json = await res.json();
          setProjectName(json.data.name);
        }
      } catch {
        // Ignore title lookup failures; the form can still work.
      }
    }
    loadProject();
  }, [projectId]);

  const handleFileUpload = async (file: File | null) => {
    if (!file) return;
    setError(null);
    setWarning(null);

    if (!file.name.endsWith(".txt")) {
      setError("请上传 .txt 小说原文文件。");
      return;
    }

    const text = await file.text();
    setForm((current) => ({
      ...current,
      novelText: text,
      title: current.title || file.name.replace(/\.txt$/i, ""),
    }));
  };

  const generateScriptDraft = async () => {
    setError(null);
    setSuccess(null);
    setWarning(null);

    if (!form.title.trim()) {
      setError("请输入标题。");
      return;
    }
    if (!form.novelText.trim()) {
      setError("请粘贴或上传小说原文。");
      return;
    }

    setIsGenerating(true);
    try {
      const res = await fetch("/api/generate-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          novelText: form.novelText,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "生成剧本失败。");

      setForm((current) => ({ ...current, content: data.data.content }));
      setSuccess("剧本草稿已生成，你可以继续编辑后保存。");
      setWarning(data.data.warning ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "生成剧本失败。");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setWarning(null);

    if (!form.title.trim()) {
      setError("请输入剧本标题。");
      return;
    }
    if (!form.content.trim()) {
      setError(mode === "novel" ? "请先生成或填写剧本草稿。" : "请输入剧本内容。");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/scripts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title: form.title.trim(),
          content: form.content,
          scriptType: mode === "novel" ? "SYNOPSIS" : "FULL_SCRIPT",
          notes: form.notes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "创建剧本失败。");

      if (autoAnalyze) {
        setSuccess("剧本已保存，正在生成角色、道具、背景和分镜...");
        const analyzeRes = await fetch("/api/analyze-script", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scriptId: data.data.id,
            options: { generatePrompts: true, generateStoryboard: true },
          }),
        });
        const analyzeData = await analyzeRes.json();
        if (!analyzeRes.ok) {
          setWarning(
            analyzeData.error?.message
              ? `剧本已保存，但自动分析失败：${analyzeData.error.message}`
              : "剧本已保存，但自动分析失败。"
          );
          setTimeout(() => {
            router.push(`/projects/${projectId}`);
            router.refresh();
          }, 1200);
          return;
        }
        setSuccess("AI 生产资料已生成，正在返回项目工作台...");
      } else {
        setSuccess("剧本已保存，正在返回项目工作台...");
      }

      setTimeout(() => {
        router.push(`/projects/${projectId}`);
        router.refresh();
      }, 900);
    } catch (err) {
      setSuccess(null);
      setError(err instanceof Error ? err.message : "创建剧本失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-2 text-sm font-semibold text-stone-500">
        <Link href="/" className="transition hover:text-stone-950">
          项目
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="transition hover:text-stone-950">
          {projectName || "项目详情"}
        </Link>
        <span>/</span>
        <span className="text-stone-950">添加剧本</span>
      </nav>

      <section className="mb-8">
        <p className="mb-3 text-sm font-black uppercase tracking-normal text-[#c2410c]">
          Script Studio
        </p>
        <h1 className="text-4xl font-black text-stone-950">添加剧本</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          可以直接上传小说原文生成分场剧本，也可以粘贴已有剧本进入角色、道具、背景和分镜生成流程。
        </p>
      </section>

      <div className="mb-6 flex rounded-2xl border border-stone-200 bg-[#fffaf2] p-1">
        <button
          type="button"
          onClick={() => setMode("novel")}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${
            mode === "novel" ? "bg-stone-950 text-amber-100" : "text-stone-600"
          }`}
        >
          上传小说原文生成剧本
        </button>
        <button
          type="button"
          onClick={() => setMode("script")}
          className={`flex-1 rounded-xl px-4 py-3 text-sm font-black transition ${
            mode === "script" ? "bg-stone-950 text-amber-100" : "text-stone-600"
          }`}
        >
          直接输入剧本
        </button>
      </div>

      {error && <Notice tone="error" text={error} />}
      {warning && <Notice tone="warning" text={warning} />}
      {success && <Notice tone="success" text={success} />}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6 shadow-[0_18px_45px_rgba(28,25,23,0.08)]">
          <div className="grid gap-5 md:grid-cols-[1fr_auto] md:items-end">
            <Field label={mode === "novel" ? "小说 / 剧本标题" : "剧本标题"} required>
              <input
                value={form.title}
                onChange={(event) =>
                  setForm({ ...form, title: event.target.value })
                }
                placeholder="例如：第一话 命运的相遇"
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
                maxLength={300}
              />
            </Field>

            {mode === "novel" && (
              <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-stone-300 bg-white px-5 py-3 text-sm font-black text-stone-800 transition hover:border-[#c2410c]">
                上传 .txt
                <input
                  type="file"
                  accept=".txt,text/plain"
                  className="hidden"
                  onChange={(event) => handleFileUpload(event.target.files?.[0] ?? null)}
                />
              </label>
            )}
          </div>

          {mode === "novel" && (
            <div className="mt-6">
              <Field label="小说原文" required>
                <textarea
                  value={form.novelText}
                  onChange={(event) =>
                    setForm({ ...form, novelText: event.target.value })
                  }
                  placeholder="粘贴小说原文，或上传 .txt 文件。系统会先改写成适合分镜拆解的剧本。"
                  rows={10}
                  className="w-full resize-y rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
                />
              </Field>
              <button
                type="button"
                onClick={generateScriptDraft}
                disabled={isGenerating}
                className="mt-4 rounded-xl bg-[#c2410c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isGenerating ? "正在生成剧本..." : "从小说生成剧本草稿"}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <Field label="剧本内容" required>
            <textarea
              value={form.content}
              onChange={(event) => setForm({ ...form, content: event.target.value })}
              placeholder="生成后的剧本会出现在这里，你也可以直接编辑。"
              rows={18}
              className="w-full resize-y rounded-xl border border-stone-300 bg-white px-4 py-3 font-mono text-sm leading-6 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            />
          </Field>

          <div className="mt-5">
            <Field label="备注">
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                placeholder="特殊要求、角色保留、改编方向等。"
                rows={3}
                className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
              />
            </Field>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(event) => setAutoAnalyze(event.target.checked)}
              className="mt-1"
            />
            <span>
              <span className="block font-black">保存后自动生成生产资料</span>
              <span className="mt-1 block leading-6">
                自动拆解角色、道具、背景场景和分镜，并生成一致性提示词。
              </span>
            </span>
          </label>
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Link
            href={`/projects/${projectId}`}
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isGenerating}
            className="inline-flex items-center justify-center rounded-xl bg-stone-950 px-6 py-3 text-sm font-black text-amber-100 transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "保存中..." : "保存剧本"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-stone-950">
        {label} {required && <span className="text-[#c2410c]">*</span>}
      </label>
      {children}
    </div>
  );
}

function Notice({
  tone,
  text,
}: {
  tone: "error" | "success" | "warning";
  text: string;
}) {
  const className =
    tone === "error"
      ? "border-red-200 bg-red-50 text-red-700"
      : tone === "success"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-amber-200 bg-amber-50 text-amber-900";

  return (
    <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-semibold ${className}`}>
      {text}
    </div>
  );
}
