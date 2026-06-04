import Link from "next/link";
import { PROJECT_STATUS_LABELS } from "@/types";

interface ProjectSummary {
  id: string;
  name: string;
  description: string | null;
  status: string;
  coverUrl: string | null;
  updatedAt: string;
  _count?: {
    scripts: number;
    characterBibles: number;
    storyboardShots: number;
    generatedAssets: number;
  };
}

async function getProjects(): Promise<ProjectSummary[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/projects`, { cache: "no-store" });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  const className =
    status === "COMPLETED"
      ? "bg-emerald-100 text-emerald-800"
      : status.includes("GENERATING") || status.includes("ANALYZING")
        ? "bg-sky-100 text-sky-800"
        : "bg-amber-100 text-amber-900";
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-bold ${className}`}>
      {PROJECT_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export default async function ProjectListPage() {
  const projects = await getProjects();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <section className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black text-stone-950">
            AI Manga Drama Workspace
          </h1>
          <p className="mt-3 text-stone-600">
            From script to characters, storyboard and exportable draft video.
          </p>
        </div>
        <Link
          href="/projects/create"
          className="rounded-xl bg-[#c2410c] px-6 py-3 text-sm font-black text-white"
        >
          Create Project
        </Link>
      </section>

      {projects.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-12 text-center text-stone-500">
          No projects yet.
        </p>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="rounded-2xl border border-stone-200 bg-[#fffaf2] p-6 shadow-sm hover:border-orange-300"
            >
              <div className="mb-3 flex justify-between gap-2">
                <h2 className="text-xl font-black">{project.name}</h2>
                <StatusBadge status={project.status} />
              </div>
              <p className="line-clamp-2 text-sm text-stone-500">
                {project.description || "No description"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
