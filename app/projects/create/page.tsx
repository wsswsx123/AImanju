"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const GENRES = ["玄幻", "都市", "悬疑", "恋爱", "科幻", "校园", "武侠"];
const STYLES = ["国漫", "日漫", "厚涂", "赛博朋克", "写实漫画", "水墨国风"];
const RATIOS = ["9:16", "16:9", "1:1"] as const;
const DURATIONS = [
  { label: "1 分钟", value: 60 },
  { label: "3 分钟", value: 180 },
  { label: "5 分钟", value: 300 },
];

export default function CreateProjectPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    genre: "玄幻",
    aspectRatio: "9:16" as (typeof RATIOS)[number],
    visualStyle: "国漫",
    targetDuration: 180,
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("请输入项目名称。");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || undefined,
          genre: form.genre,
          aspectRatio: form.aspectRatio,
          visualStyle: form.visualStyle,
          targetDuration: form.targetDuration,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message ?? "创建项目失败。");
      router.push(`/projects/${data.data.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "创建项目失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-2 text-sm font-semibold text-stone-500">
        <Link href="/" className="transition hover:text-stone-950">
          项目
        </Link>
        <span>/</span>
        <span className="text-stone-950">创建项目</span>
      </nav>

      <section className="mb-8">
        <p className="mb-3 text-sm font-black uppercase tracking-normal text-[#c2410c]">
          New Production
        </p>
        <h1 className="text-4xl font-black text-stone-950">创建 AI 漫剧项目</h1>
        <p className="mt-3 text-sm leading-6 text-stone-600">
          设置题材、画幅、动漫风格和目标时长，后续生成角色、道具、背景、分镜和视频都会沿用这些配置。
        </p>
      </section>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6 shadow-[0_18px_45px_rgba(28,25,23,0.08)] sm:p-8"
      >
        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <Field label="项目名称" required>
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              placeholder="例如：修罗剑仙"
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            />
          </Field>

          <Field label="项目简介">
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              placeholder="简要描述故事背景、视觉风格、目标成片形式等。"
              rows={5}
              className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              label="漫剧类型"
              value={form.genre}
              onChange={(genre) => setForm({ ...form, genre })}
              options={GENRES}
            />
            <SelectField
              label="动漫风格"
              value={form.visualStyle}
              onChange={(visualStyle) => setForm({ ...form, visualStyle })}
              options={STYLES}
            />
            <SelectField
              label="画面比例"
              value={form.aspectRatio}
              onChange={(aspectRatio) =>
                setForm({
                  ...form,
                  aspectRatio: aspectRatio as (typeof RATIOS)[number],
                })
              }
              options={RATIOS}
            />
            <div>
              <label className="mb-2 block text-sm font-black text-stone-950">
                目标时长
              </label>
              <select
                value={form.targetDuration}
                onChange={(event) =>
                  setForm({
                    ...form,
                    targetDuration: Number(event.target.value),
                  })
                }
                className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
              >
                {DURATIONS.map((duration) => (
                  <option key={duration.value} value={duration.value}>
                    {duration.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-3 text-sm font-black text-amber-950">
            创建后平台会继续支持
          </h2>
          <div className="grid gap-3 text-sm font-semibold text-amber-900 sm:grid-cols-2">
            <p>DeepSeek 剧本解析</p>
            <p>自动生成角色、道具、背景设定</p>
            <p>自动生成分镜和一致性提示词</p>
            <p>豆包图片/视频与讯飞配音任务</p>
          </div>
        </div>

        <div className="mt-8 flex flex-col-reverse gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:justify-end">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
          >
            取消
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-xl bg-[#c2410c] px-6 py-3 text-sm font-black text-white transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "创建中..." : "创建项目"}
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

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
}) {
  return (
    <div>
      <label className="mb-2 block text-sm font-black text-stone-950">
        {label}
      </label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </div>
  );
}
