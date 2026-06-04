"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface StoryboardShot {
  id: string;
  shotNumber: number;
  sceneNumber: number;
  panelNumber: number | null;
  description: string | null;
  dialogue: string | null;
  dialogueEmotion: string | null;
  camera: string | null;
  cameraAngle: string | null;
  lighting: string | null;
  duration: number | null;
  status: string;
  consistencyPromptId: string | null;
  generatedAssets: Array<{
    id: string;
    imageUrl: string | null;
    thumbnailUrl: string | null;
    status: string;
  }>;
}

export default function StoryboardPage() {
  const params = useParams();
  const projectId = params.id as string;

  const [projectName, setProjectName] = useState("");
  const [shots, setShots] = useState<StoryboardShot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedScene, setSelectedScene] = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Load project name
        const projRes = await fetch(`/api/projects/${projectId}`);
        if (projRes.ok) {
          const projJson = await projRes.json();
          setProjectName(projJson.data.name);
        }

        // Load all storyboard shots
        const res = await fetch(`/api/projects/${projectId}/storyboard?pageSize=500`);
        if (!res.ok) throw new Error("加载失败");
        const json = await res.json();
        setShots(json.data ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [projectId]);

  // Group shots by scene
  const scenes = new Map<number, StoryboardShot[]>();
  for (const shot of shots) {
    const list = scenes.get(shot.sceneNumber) ?? [];
    list.push(shot);
    scenes.set(shot.sceneNumber, list);
  }
  const sortedScenes = Array.from(scenes.entries()).sort(([a], [b]) => a - b);

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4" />
          <div className="grid grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-zinc-200 dark:bg-zinc-800 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link href="/" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">项目列表</Link>
        <span className="text-zinc-400">/</span>
        <Link href={`/projects/${projectId}`} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">{projectName || "项目"}</Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium">分镜故事板</span>
      </nav>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">分镜故事板</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            {sortedScenes.length} 个场景 · {shots.length} 个镜头
          </p>
        </div>
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          返回项目
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 mb-6">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {shots.length === 0 ? (
        <div className="text-center py-20">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-zinc-100 dark:bg-zinc-800 mb-4">
            <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 8.25V6a2.25 2.25 0 00-2.25-2.25H6A2.25 2.25 0 003.75 6v8.25A2.25 2.25 0 006 16.5h2.25m8.25-8.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-7.5A2.25 2.25 0 018.25 18v-1.5m8.25-8.25h-6a2.25 2.25 0 00-2.25 2.25v6" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">暂无分镜数据</h3>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">添加剧本后使用 AI 分析即可自动生成分镜</p>
          <Link
            href={`/projects/${projectId}/scripts/new`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700"
          >
            添加剧本
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          {sortedScenes.map(([sceneNum, sceneShots]) => (
            <section key={sceneNum} className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
              <div className="px-6 py-4 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-b border-zinc-200 dark:border-zinc-800">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center text-sm">
                    {sceneNum}
                  </span>
                  场景 {sceneNum}
                </h2>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1 ml-13">
                  {sceneShots[0]?.description ?? ""} · {sceneShots.length} 个镜头
                </p>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {sceneShots
                    .sort((a, b) => a.shotNumber - b.shotNumber)
                    .map((shot) => (
                      <div
                        key={shot.id}
                        className="group rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/30 overflow-hidden hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-md transition-all"
                      >
                        {/* Shot image placeholder */}
                        <div className="aspect-video bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-700 flex items-center justify-center relative">
                          {shot.generatedAssets?.[0]?.thumbnailUrl || shot.generatedAssets?.[0]?.imageUrl ? (
                            <img
                              src={shot.generatedAssets[0].thumbnailUrl ?? shot.generatedAssets[0].imageUrl!}
                              alt={`Shot ${shot.shotNumber}`}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-2xl font-bold text-zinc-300 dark:text-zinc-600">#{shot.shotNumber}</div>
                            </div>
                          )}
                          {/* Shot number badge */}
                          <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-medium">
                            #{shot.shotNumber}
                          </div>
                          {/* Status badge */}
                          <div className={`absolute top-2 right-2 px-2 py-1 rounded-md text-xs font-medium ${
                            shot.status === "COMPLETED" ? "bg-green-500/80 text-white" :
                            shot.status === "GENERATING" ? "bg-blue-500/80 text-white" :
                            shot.status === "DRAFT" ? "bg-zinc-500/80 text-white" :
                            "bg-zinc-500/80 text-white"
                          }`}>
                            {shot.status}
                          </div>
                        </div>

                        {/* Shot info */}
                        <div className="p-3 space-y-1.5">
                          {shot.dialogue && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 italic line-clamp-2">
                              "{shot.dialogue}"
                            </p>
                          )}
                          {shot.description && (
                            <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">
                              {shot.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 text-xs text-zinc-400 pt-1">
                            {shot.camera && <span>🎥 {shot.camera}</span>}
                            {shot.cameraAngle && <span>📐 {shot.cameraAngle}</span>}
                            {shot.duration && <span>⏱ {shot.duration}s</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
