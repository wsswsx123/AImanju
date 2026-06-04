import Link from "next/link";
import { prisma } from "@/lib/prisma";
import ProjectActions from "../ProjectActions";

export default async function VideoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      storyboardShots: { orderBy: { shotNumber: "asc" } },
      exportJobs: { orderBy: { createdAt: "desc" } },
      renderTasks: {
        where: { taskType: { in: ["VOICE", "VIDEO_RENDER", "EXPORT"] } },
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!project) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm font-bold text-stone-500">项目不存在。</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <nav className="mb-8 flex items-center gap-2 text-sm font-semibold text-stone-500">
        <Link href="/" className="transition hover:text-stone-950">
          项目
        </Link>
        <span>/</span>
        <Link href={`/projects/${id}`} className="transition hover:text-stone-950">
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-stone-950">视频生成</span>
      </nav>

      <section className="mb-8">
        <p className="mb-3 text-sm font-black uppercase tracking-normal text-[#c2410c]">
          Video Render
        </p>
        <h1 className="text-4xl font-black text-stone-950">视频生成与导出</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">
          这里管理配音、字幕、镜头画面检查、视频合成任务和 MP4 导出结果。
        </p>
      </section>

      <div className="mb-8">
        <ProjectActions projectId={id} hasScript={project.storyboardShots.length > 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <h2 className="mb-5 text-xl font-black text-stone-950">镜头准备状态</h2>
          <div className="space-y-3">
            {project.storyboardShots.map((shot) => (
              <div
                key={shot.id}
                className="rounded-2xl border border-stone-200 bg-white/70 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black text-stone-950">镜头 {shot.shotNumber}</p>
                  <p className="text-xs font-black text-[#c2410c]">{shot.status}</p>
                </div>
                <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-stone-500">
                  {shot.description || "暂无描述"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-stone-500">
                  <span className="rounded-full bg-stone-100 px-3 py-1">
                    画面：{shot.imageAssetId ? "已关联" : "缺失"}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1">
                    配音：{shot.audioAssetId ? "已关联" : "缺失"}
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1">
                    字幕：{shot.subtitle ? "已生成" : "缺失"}
                  </span>
                </div>
              </div>
            ))}
            {project.storyboardShots.length === 0 && (
              <Empty text="请先输入剧本并自动生成分镜。" />
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-[#fffaf2] p-6">
          <h2 className="mb-5 text-xl font-black text-stone-950">导出任务</h2>
          <div className="space-y-3">
            {project.exportJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-2xl border border-stone-200 bg-white/70 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <p className="font-black text-stone-950">
                    {job.name || "MP4 导出"}
                  </p>
                  <p className="text-xs font-black text-[#c2410c]">{job.status}</p>
                </div>
                <p className="mt-2 text-xs font-semibold text-stone-500">
                  格式：{job.format} · 进度：{Math.round(job.progress)}%
                </p>
                {job.errorMessage && (
                  <p className="mt-2 text-xs font-semibold text-red-600">
                    {job.errorMessage}
                  </p>
                )}
                {job.fileUrl && (
                  <a
                    href={job.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex rounded-lg bg-stone-950 px-4 py-2 text-sm font-black text-amber-100"
                  >
                    下载 MP4
                  </a>
                )}
              </div>
            ))}
            {project.exportJobs.length === 0 && (
              <Empty text="还没有视频导出任务。" />
            )}
          </div>
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
