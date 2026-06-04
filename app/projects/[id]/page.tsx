import Link from "next/link";
import { notFound } from "next/navigation";
import { ASSET_TYPE_LABELS, PROJECT_STATUS_LABELS } from "@/types";
import ProjectActions from "./ProjectActions";

interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  status: string;
  coverUrl: string | null;
  genre: string | null;
  aspectRatio: string | null;
  visualStyle: string | null;
  targetDuration: number | null;
  createdAt: string;
  updatedAt: string;
  scripts: Array<{ id: string; title: string; version: number; createdAt: string }>;
  characterBibles: Array<{
    id: string;
    name: string;
    displayName: string | null;
    roleType: string | null;
    imagePrompt: string | null;
  }>;
  propBibles: Array<{ id: string; name: string; category: string | null }>;
  worldBibles: Array<{ id: string; name: string; description: string | null }>;
  storyboardShots: Array<{ id: string; shotNumber: number; sceneNumber: number; status: string; description?: string | null }>;
  generatedAssets: Array<{
    id: string;
    assetType: string;
    status: string;
    imageUrl: string | null;
  }>;
  exportJobs: Array<{ id: string; format: string; status: string; fileUrl: string | null }>;
}

async function getProject(id: string): Promise<ProjectDetail | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/projects/${id}`, {
      cache: "no-store",
    });

    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch project: ${res.statusText}`);

    const json = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error("Error fetching project:", error);
    return null;
  }
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-800"
      : status === "ARCHIVED"
        ? "bg-stone-200 text-stone-600"
        : status.includes("GENERATING") || status.includes("ANALYZING")
          ? "bg-sky-100 text-sky-800"
          : "bg-amber-100 text-amber-900";

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-black ${className}`}>
      {PROJECT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const card = (
    <div className="rounded-2xl border border-stone-200 bg-[#fffaf2] p-5 shadow-[0_12px_30px_rgba(28,25,23,0.06)] transition hover:border-orange-300">
      <p className="text-3xl font-black text-stone-950">{value}</p>
      <p className="mt-1 text-sm font-bold text-stone-500">{label}</p>
    </div>
  );

  return href ? <Link href={href}>{card}</Link> : card;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);

  if (!project) notFound();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-4 flex items-center gap-2 text-sm font-semibold text-stone-500">
        <Link href="/" className="transition hover:text-stone-950">
          项目
        </Link>
        <span>/</span>
        <span className="truncate text-stone-950">{project.name}</span>
      </nav>

      <div className="mb-8">
        <ProjectActions
          projectId={id}
          hasScript={project.scripts.length > 0}
          latestScriptId={project.scripts[0]?.id}
        />
      </div>

      <section className="mb-8 overflow-hidden rounded-3xl border border-stone-200 bg-[#fffaf2] shadow-[0_18px_45px_rgba(28,25,23,0.08)]">
        <div className="grid lg:grid-cols-[360px_1fr]">
          <div className="relative min-h-64 bg-stone-950">
            {project.coverUrl ? (
              <img
                src={project.coverUrl}
                alt={project.name}
                className="h-full min-h-64 w-full object-cover"
              />
            ) : (
              <div className="flex h-full min-h-64 items-end bg-[linear-gradient(135deg,#1c1917,#31515a_55%,#c2410c)] p-8">
                <p className="text-5xl font-black text-amber-100">MANGA</p>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <StatusBadge status={project.status} />
              <span className="text-xs font-bold text-stone-400">
                更新于{" "}
                {new Date(project.updatedAt).toLocaleDateString("zh-CN")}
              </span>
            </div>
            <h1 className="text-4xl font-black leading-tight text-stone-950">
              {project.name}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600">
              {project.description || "暂未填写项目简介。"}
            </p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black text-stone-600">
              <span className="rounded-full bg-white px-3 py-1">类型：{project.genre ?? "未设置"}</span>
              <span className="rounded-full bg-white px-3 py-1">风格：{project.visualStyle ?? "国漫"}</span>
              <span className="rounded-full bg-white px-3 py-1">画幅：{project.aspectRatio ?? "9:16"}</span>
              <span className="rounded-full bg-white px-3 py-1">时长：{project.targetDuration ?? 180}s</span>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/projects/${id}/scripts/new`}
                className="rounded-xl bg-[#c2410c] px-5 py-3 text-sm font-black text-white transition hover:bg-[#9a3412]"
              >
                添加剧本
              </Link>
              <Link
                href={`/projects/${id}/edit`}
                className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
              >
                编辑项目
              </Link>
              {project.storyboardShots.length > 0 && (
                <Link
                  href={`/projects/${id}/storyboard`}
                  className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
                >
                  查看分镜
                </Link>
              )}
              <Link
                href={`/projects/${id}/video`}
                className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-black text-stone-700 transition hover:bg-white"
              >
                视频生成
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-5">
        <StatCard
          label="剧本"
          value={project.scripts.length}
          href={`/projects/${id}/scripts/new`}
        />
        <StatCard label="角色" value={project.characterBibles.length} />
        <StatCard label="道具" value={project.propBibles.length} />
        <StatCard
          label="分镜"
          value={project.storyboardShots.length}
          href={
            project.storyboardShots.length > 0
              ? `/projects/${id}/storyboard`
              : undefined
          }
        />
        <StatCard label="素材" value={project.generatedAssets.length} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-xl font-black text-stone-950">剧本</h2>
            <Link
              href={`/projects/${id}/scripts/new`}
              className="text-sm font-black text-[#c2410c] hover:text-[#9a3412]"
            >
              添加
            </Link>
          </div>

          {project.scripts.length === 0 ? (
            <Empty text="还没有剧本，先添加一版故事文本。" />
          ) : (
            <div className="space-y-3">
              {project.scripts.map((script) => (
                <Link
                  key={script.id}
                  href={`/projects/${id}/scripts/${script.id}`}
                  className="flex items-center justify-between rounded-2xl border border-stone-200 bg-white/70 p-4 transition hover:border-orange-300"
                >
                  <div>
                    <p className="font-black text-stone-950">{script.title}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-400">
                      v{script.version} ·{" "}
                      {new Date(script.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <span className="text-sm font-black text-stone-400">查看</span>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <h2 className="mb-5 text-xl font-black text-stone-950">道具设定</h2>
          {project.propBibles.length === 0 ? (
            <Empty text="剧本分析后会在这里显示道具、武器、工具和关键物品。" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {project.propBibles.slice(0, 6).map((prop) => (
                <div
                  key={prop.id}
                  className="rounded-2xl border border-stone-200 bg-white/70 p-4"
                >
                  <p className="font-black text-stone-950">{prop.name}</p>
                  <p className="mt-1 text-xs font-semibold text-stone-400">
                    {prop.category ?? "道具"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <h2 className="mb-5 text-xl font-black text-stone-950">背景 / 场景</h2>
          {project.worldBibles.length === 0 ? (
            <Empty text="剧本分析后会在这里显示场景和世界观设定。" />
          ) : (
            <div className="space-y-3">
              {project.worldBibles.slice(0, 6).map((world) => (
                <div
                  key={world.id}
                  className="rounded-2xl border border-stone-200 bg-white/70 p-4"
                >
                  <p className="font-black text-stone-950">{world.name}</p>
                  <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-stone-400">
                    {world.description ?? "场景设定"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6 lg:col-span-2">
          <h2 className="mb-5 text-xl font-black text-stone-950">分镜预览</h2>
          {project.storyboardShots.length === 0 ? (
            <Empty text="自动解析剧本后会生成分镜列表。" />
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {project.storyboardShots.slice(0, 8).map((shot) => (
                <div
                  key={shot.id}
                  className="rounded-2xl border border-stone-200 bg-white/70 p-4"
                >
                  <p className="text-sm font-black text-stone-950">
                    镜头 {shot.shotNumber} · 场景 {shot.sceneNumber}
                  </p>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-stone-500">
                    {shot.description ?? "暂无描述"}
                  </p>
                  <p className="mt-2 text-xs font-black text-[#c2410c]">
                    {shot.status}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <h2 className="mb-5 text-xl font-black text-stone-950">角色设定</h2>
          {project.characterBibles.length === 0 ? (
            <Empty text="剧本分析后会在这里显示角色设定。" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {project.characterBibles.slice(0, 6).map((character) => (
                <Link
                  key={character.id}
                  href={`/projects/${id}/characters/${character.id}`}
                  className="rounded-2xl border border-stone-200 bg-white/70 p-4 transition hover:border-orange-300"
                >
                  <p className="font-black text-stone-950">
                    {character.displayName ?? character.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-stone-400">
                    {character.roleType ?? "角色"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6 lg:col-span-2">
          <h2 className="mb-5 text-xl font-black text-stone-950">生成素材</h2>
          {project.generatedAssets.length === 0 ? (
            <Empty text="生成后的角色图、分镜图和参考素材会集中在这里。" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {project.generatedAssets.slice(0, 10).map((asset) => (
                <div
                  key={asset.id}
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white"
                >
                  <div className="aspect-square bg-stone-200">
                    {asset.imageUrl ? (
                      <img
                        src={asset.imageUrl}
                        alt={asset.assetType}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm font-black text-stone-400">
                        素材
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-xs font-black text-stone-700">
                      {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-stone-400">
                      {asset.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6 lg:col-span-2">
          <h2 className="mb-5 text-xl font-black text-stone-950">视频导出</h2>
          {project.exportJobs.length === 0 ? (
            <Empty text="点击「合成视频 / MP4」后，导出任务会显示在这里。" />
          ) : (
            <div className="space-y-3">
              {project.exportJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-white/70 p-4"
                >
                  <div>
                    <p className="font-black text-stone-950">{job.format}</p>
                    <p className="mt-1 text-xs font-semibold text-stone-400">
                      {job.status}
                    </p>
                  </div>
                  {job.fileUrl ? (
                    <a
                      href={job.fileUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg bg-stone-950 px-4 py-2 text-sm font-black text-amber-100"
                    >
                      下载
                    </a>
                  ) : (
                    <span className="text-sm font-semibold text-stone-400">
                      等待生成
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-stone-300 bg-white/50 p-8 text-center text-sm font-semibold text-stone-500">
      {text}
    </div>
  );
}
