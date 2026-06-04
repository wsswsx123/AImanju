// ============================================================
// Project Stats API — GET project statistics
// ============================================================

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, ProjectStats } from "@/types";

function parseProjectId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const projectId = parseProjectId(rawId);
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "项目不存在" } },
        { status: 404 }
      );
    }

    // Run all counts in parallel
    const [
      totalScripts,
      totalCharacterBibles,
      totalPropBibles,
      totalWorldBibles,
      totalStoryboardShots,
      totalGeneratedAssets,
      completedAssets,
      failedAssets,
      pendingAssets,
      totalRenderTasks,
      completedRenderTasks,
      totalExportJobs,
      completedExportJobs,
    ] = await Promise.all([
      prisma.script.count({ where: { projectId } }),
      prisma.characterBible.count({ where: { projectId } }),
      prisma.propBible.count({ where: { projectId } }),
      prisma.worldBible.count({ where: { projectId } }),
      prisma.storyboardShot.count({ where: { projectId } }),
      prisma.generatedAsset.count({ where: { projectId } }),
      prisma.generatedAsset.count({ where: { projectId, status: "COMPLETED" } }),
      prisma.generatedAsset.count({ where: { projectId, status: "FAILED" } }),
      prisma.generatedAsset.count({ where: { projectId, status: "PENDING" } }),
      prisma.renderTask.count({ where: { projectId } }),
      prisma.renderTask.count({ where: { projectId, status: "COMPLETED" } }),
      prisma.exportJob.count({ where: { projectId } }),
      prisma.exportJob.count({ where: { projectId, status: "COMPLETED" } }),
    ]);

    const stats: ProjectStats = {
      projectId,
      totalScripts,
      totalCharacterBibles,
      totalPropBibles,
      totalWorldBibles,
      totalStoryboardShots,
      totalGeneratedAssets,
      completedAssets,
      failedAssets,
      pendingAssets,
      totalRenderTasks,
      completedRenderTasks,
      totalExportJobs,
      completedExportJobs,
    };

    return NextResponse.json({ success: true, data: stats } satisfies ApiResponse<ProjectStats>);
  } catch (error) {
    console.error("Error fetching project stats:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取项目统计失败" } },
      { status: 500 }
    );
  }
}
