"use client";

import { useState } from "react";
import Link from "next/link";

type ActionResponse = {
  data?: {
    message?: string;
    results?: Array<{ warning?: string; error?: string }>;
    tasks?: Array<{ warning?: string; error?: string }>;
  };
  error?: {
    message?: string;
  };
};

async function readActionResponse(res: Response): Promise<ActionResponse> {
  const contentType = res.headers.get("content-type") ?? "";
  const text = await res.text();

  if (!contentType.includes("application/json")) {
    const title = text.match(/<title>(.*?)<\/title>/i)?.[1];
    return {
      error: {
        message:
          title ||
          `接口返回了非 JSON 内容：HTTP ${res.status} ${res.statusText || ""}`.trim(),
      },
    };
  }

  try {
    return JSON.parse(text) as ActionResponse;
  } catch {
    return {
      error: { message: `接口 JSON 解析失败：HTTP ${res.status}` },
    };
  }
}

function firstDetail(items?: Array<{ warning?: string; error?: string }>) {
  return items?.find((item) => item.warning || item.error);
}

function pickActionMessage(data: ActionResponse) {
  const resultDetail = firstDetail(data.data?.results);
  const taskDetail = firstDetail(data.data?.tasks);
  const detail =
    resultDetail?.warning ??
    resultDetail?.error ??
    taskDetail?.warning ??
    taskDetail?.error;

  if (data.data?.message && detail) return `${data.data.message} 原因：${detail}`;
  return data.data?.message ?? detail ?? "任务已执行，请刷新页面查看最新结果。";
}

export default function ProjectActions({
  projectId,
  hasScript,
  latestScriptId,
}: {
  projectId: string;
  hasScript: boolean;
  latestScriptId?: string;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  async function run(action: string, url: string, payload?: unknown) {
    setBusyAction(action);
    setMessage(null);

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      const data = await readActionResponse(res);

      if (!res.ok) {
        throw new Error(data.error?.message ?? data.data?.message ?? "操作失败");
      }

      setMessage(pickActionMessage(data));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6 shadow-[0_18px_45px_rgba(28,25,23,0.08)]">
      <h2 className="text-xl font-black text-stone-950">AI 生成流水线</h2>
      <p className="mt-2 text-sm leading-6 text-stone-600">
        按顺序完成剧本解析、设定库确认、镜头图、配音和视频合成。DeepSeek、豆包或讯飞不可用时会显示真实错误原因。
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {latestScriptId ? (
          <button
            type="button"
            disabled={busyAction !== null}
            onClick={() =>
              run("analyze", "/api/analyze-script", {
                scriptId: latestScriptId,
                options: { generatePrompts: true, generateStoryboard: true },
              })
            }
            className="rounded-xl bg-stone-950 px-4 py-3 text-center text-sm font-black text-amber-100 transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busyAction === "analyze" ? "解析中..." : "1. 重新解析最新剧本"}
          </button>
        ) : (
          <Link
            href={`/projects/${projectId}/scripts/new`}
            className="rounded-xl bg-stone-950 px-4 py-3 text-center text-sm font-black text-amber-100 transition hover:bg-[#9a3412]"
          >
            1. 输入剧本并自动解析
          </Link>
        )}

        <button
          type="button"
          disabled={!hasScript || busyAction !== null}
          onClick={() => run("images", `/api/projects/${projectId}/generate/images`)}
          className="rounded-xl bg-[#c2410c] px-4 py-3 text-sm font-black text-white transition hover:bg-[#9a3412] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyAction === "images" ? "生成中..." : "2. 生成镜头画面"}
        </button>
        <button
          type="button"
          disabled={!hasScript || busyAction !== null}
          onClick={() => run("voices", `/api/projects/${projectId}/generate/voices`)}
          className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyAction === "voices" ? "生成中..." : "3. 生成配音"}
        </button>
        <button
          type="button"
          disabled={!hasScript || busyAction !== null}
          onClick={() => run("check", `/api/projects/${projectId}/consistency-check`)}
          className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyAction === "check" ? "检查中..." : "4. 一致性检查"}
        </button>
        <button
          type="button"
          disabled={!hasScript || busyAction !== null}
          onClick={() => run("render", `/api/projects/${projectId}/render`)}
          className="rounded-xl border border-stone-300 px-4 py-3 text-sm font-black text-stone-800 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busyAction === "render" ? "创建中..." : "5. 合成视频 / MP4"}
        </button>
      </div>

      {message && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold leading-6 text-amber-900">
          {message}
        </div>
      )}
    </div>
  );
}
