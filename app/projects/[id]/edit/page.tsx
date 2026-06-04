"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PROJECT_STATUS_LABELS } from "@/types";

export default function EditProjectPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    status: "DRAFT",
    coverUrl: "",
  });

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await fetch(`/api/projects/${id}`);
        if (!res.ok) throw new Error("项目不存在或加载失败。");

        const json = await res.json();
        const project = json.data;
        setForm({
          name: project.name,
          description: project.description ?? "",
          status: project.status,
          coverUrl: project.coverUrl ?? "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败。");
      } finally {
        setIsLoading(false);
      }
    }

    loadProject();
  }, [id]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim()) {
      setError("请输入项目名称。");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          description: form.description.trim() || null,
          status: form.status,
          coverUrl: form.coverUrl.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "保存失败。");
      }

      router.push(`/projects/${id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("确定删除这个项目吗？此操作不可撤销。")) return;

    setIsDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? "删除失败。");
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败。");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="animate-pulse space-y-4 rounded-3xl border border-stone-200 bg-[#fffaf2] p-8">
          <div className="h-8 w-1/3 rounded bg-stone-200" />
          <div className="h-12 rounded bg-stone-200" />
          <div className="h-32 rounded bg-stone-200" />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-2 text-sm font-semibold text-stone-500">
        <Link href="/" className="transition hover:text-stone-950">
          项目
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${id}`}
          className="max-w-52 truncate transition hover:text-stone-950"
        >
          {form.name}
        </Link>
        <span>/</span>
        <span className="text-stone-950">编辑</span>
      </nav>

      <section className="mb-8">
        <p className="mb-3 text-sm font-black uppercase tracking-normal text-[#c2410c]">
          Project Settings
        </p>
        <h1 className="text-4xl font-black text-stone-950">编辑项目</h1>
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
              id="name"
              type="text"
              value={form.name}
              onChange={(event) =>
                setForm({ ...form, name: event.target.value })
              }
              maxLength={200}
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            />
          </Field>

          <Field label="项目简介">
            <textarea
              id="description"
              value={form.description}
              onChange={(event) =>
                setForm({ ...form, description: event.target.value })
              }
              rows={5}
              maxLength={2000}
              className="w-full resize-none rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm leading-6 text-stone-950 outline-none transition focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            />
          </Field>

          <Field label="项目状态">
            <select
              id="status"
              value={form.status}
              onChange={(event) =>
                setForm({ ...form, status: event.target.value })
              }
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            >
              {Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="封面图片 URL">
            <input
              id="coverUrl"
              type="url"
              value={form.coverUrl}
              onChange={(event) =>
                setForm({ ...form, coverUrl: event.target.value })
              }
              placeholder="https://..."
              className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 text-sm text-stone-950 outline-none transition placeholder:text-stone-400 focus:border-[#c2410c] focus:ring-4 focus:ring-orange-100"
            />
          </Field>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-stone-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center justify-center rounded-xl border border-red-200 px-5 py-3 text-sm font-black text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "删除中..." : "删除项目"}
          </button>

          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Link
              href={`/projects/${id}`}
              className="inline-flex items-center justify-center rounded-xl border border-stone-300 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
            >
              取消
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-xl bg-[#c2410c] px-6 py-3 text-sm font-black text-white transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? "保存中..." : "保存更改"}
            </button>
          </div>
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
