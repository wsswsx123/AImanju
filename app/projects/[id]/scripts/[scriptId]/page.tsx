import Link from "next/link";
import { notFound } from "next/navigation";
import type { ScriptParsedData } from "@/types";

interface ScriptDetail {
  id: string;
  title: string;
  content: string;
  version: number;
  notes: string | null;
  parsedData: ScriptParsedData | null;
  createdAt: string;
  updatedAt: string;
  project: { id: string; name: string; status: string };
  characterBibles: Array<{ id: string; name: string; displayName: string | null; roleType: string | null }>;
  propBibles: Array<{ id: string; name: string; category: string | null }>;
  worldBibles: Array<{ id: string; name: string; description: string | null }>;
  storyboardShots: Array<{ id: string; shotNumber: number; sceneNumber: number; description: string | null; status: string; dialogue: string | null }>;
}

async function getScript(id: string): Promise<ScriptDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/scripts/${id}`, { cache: "no-store" });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error("Error fetching script:", error);
    return null;
  }
}

export default async function ScriptDetailPage({ params }: { params: Promise<{ id: string; scriptId: string }> }) {
  const { id: projectId, scriptId } = await params;
  const script = await getScript(scriptId);

  if (!script) notFound();

  const hasAnalysis = !!script.parsedData;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-6">
        <Link href="/" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">项目列表</Link>
        <span className="text-zinc-400">/</span>
        <Link href={`/projects/${projectId}`} className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">{script.project.name}</Link>
        <span className="text-zinc-400">/</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-[300px]">{script.title}</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{script.title}</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            v{script.version} · 创建于 {new Date(script.createdAt).toLocaleDateString("zh-CN")}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!hasAnalysis && (
            <Link
              href={`/api/analyze-script`}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              // Note: Analysis should be triggered via a client component that makes a POST
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
              </svg>
              AI 分析剧本
            </Link>
          )}
        </div>
      </div>

      {/* Script Content */}
      <section className="mb-10">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">剧本内容</h2>
        <div className="p-6 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-auto">
          <pre className="text-sm text-zinc-700 dark:text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{script.content}</pre>
        </div>
      </section>

      {/* Notes */}
      {script.notes && (
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-3">备注</h2>
          <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-300">{script.notes}</p>
          </div>
        </section>
      )}

      {/* AI Analysis Results */}
      {script.parsedData && (
        <div className="space-y-8">
          <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
            AI 分析结果
          </h2>

          {/* Characters */}
          {script.parsedData.characters.length > 0 && (
            <section>
              <h3 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">角色 ({script.parsedData.characters.length})</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {script.parsedData.characters.map((char, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-white text-xs font-bold">
                        {char.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{char.name}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 capitalize">{char.roleType}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2">{char.description}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Props */}
          {script.parsedData.props.length > 0 && (
            <section>
              <h3 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">道具 ({script.parsedData.props.length})</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {script.parsedData.props.map((prop, i) => (
                  <div key={i} className="p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{prop.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{prop.category}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Worlds */}
          {script.parsedData.worlds.length > 0 && (
            <section>
              <h3 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">场景 ({script.parsedData.worlds.length})</h3>
              <div className="space-y-2">
                {script.parsedData.worlds.map((world, i) => (
                  <div key={i} className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{world.name}</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{world.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-zinc-400">
                      <span>📍 {world.location}</span>
                      <span>🕐 {world.timePeriod}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Scenes / Storyboard */}
          {script.parsedData.scenes.length > 0 && (
            <section>
              <h3 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
                分镜 ({script.parsedData.scenes.reduce((sum, s) => sum + s.shots.length, 0)} 个镜头)
              </h3>
              <div className="space-y-6">
                {script.parsedData.scenes.map((scene) => (
                  <div key={scene.sceneNumber} className="rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 overflow-hidden">
                    <div className="px-4 py-3 bg-zinc-50 dark:bg-zinc-800/50 border-b border-zinc-200 dark:border-zinc-800">
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        场景 {scene.sceneNumber} — {scene.location}
                      </p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{scene.description}</p>
                    </div>
                    <div className="p-4 space-y-3">
                      {scene.shots.map((shot) => (
                        <div key={shot.shotNumber} className="flex gap-4 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/30">
                          <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">#{shot.shotNumber}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-zinc-800 dark:text-zinc-200">{shot.description}</p>
                            {shot.dialogue && (
                              <p className="text-sm text-indigo-600 dark:text-indigo-400 italic mt-1">"{shot.dialogue}"</p>
                            )}
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-zinc-400">
                              <span>{shot.camera}</span>
                              <span>{shot.cameraAngle}</span>
                              <span>{shot.lighting}</span>
                              <span>{shot.duration}s</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Related Data (from database) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-10 pt-8 border-t border-zinc-200 dark:border-zinc-800">
        {/* Characters in DB */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            角色设定 ({script.characterBibles.length})
          </h3>
          <div className="space-y-2">
            {script.characterBibles.map((c) => (
              <Link
                key={c.id}
                href={`/projects/${projectId}/characters/${c.id}`}
                className="block p-3 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
              >
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{c.displayName ?? c.name}</p>
                <p className="text-xs text-zinc-500 capitalize">{c.roleType}</p>
              </Link>
            ))}
            {script.characterBibles.length === 0 && (
              <p className="text-xs text-zinc-400">暂无数据</p>
            )}
          </div>
        </div>

        {/* Storyboard in DB */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            分镜 ({script.storyboardShots.length})
          </h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {script.storyboardShots.map((s) => (
              <div key={s.id} className="flex items-center gap-2 p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <span className="text-xs font-mono text-zinc-400 w-8">S{s.sceneNumber}</span>
                <span className="text-xs font-mono text-zinc-400 w-8">#{s.shotNumber}</span>
                <span className="text-xs text-zinc-600 dark:text-zinc-400 truncate">{s.description ?? "-"}</span>
              </div>
            ))}
            {script.storyboardShots.length === 0 && (
              <p className="text-xs text-zinc-400">暂无数据</p>
            )}
          </div>
        </div>

        {/* Props + Worlds in DB */}
        <div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
            道具 ({script.propBibles.length}) · 场景 ({script.worldBibles.length})
          </h3>
          <div className="space-y-2">
            {script.propBibles.map((p) => (
              <div key={p.id} className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{p.name}</p>
                <p className="text-xs text-zinc-400">{p.category}</p>
              </div>
            ))}
            {script.worldBibles.map((w) => (
              <div key={w.id} className="p-2 rounded bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
                <p className="text-xs font-medium text-zinc-900 dark:text-zinc-100">{w.name}</p>
                <p className="text-xs text-zinc-400 truncate">{w.description}</p>
              </div>
            ))}
            {script.propBibles.length === 0 && script.worldBibles.length === 0 && (
              <p className="text-xs text-zinc-400">暂无数据</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
