import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createVideoTaskWithDoubao } from "@/lib/doubao";

export const runtime = "nodejs";

function buildVideoPrompt(
  shots: Array<{
    shotNumber: number;
    description: string | null;
    action: string | null;
    camera: string | null;
  }>
) {
  return shots
    .slice(0, 8)
    .map((shot) => {
      const parts = [
        `镜头${shot.shotNumber}`,
        shot.description,
        shot.action,
        shot.camera ? `镜头语言：${shot.camera}` : null,
      ].filter(Boolean);
      return parts.join("，");
    })
    .join("。");
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { aspectRatio: true, targetDuration: true },
  });

  const shots = await prisma.storyboardShot.findMany({
    where: { projectId },
    orderBy: { shotNumber: "asc" },
  });

  if (shots.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "EMPTY", message: "请先生成分镜。" } },
      { status: 400 }
    );
  }

  const duration = Math.min(
    Math.max(Math.round((project?.targetDuration ?? 30) / Math.max(shots.length, 1)), 2),
    12
  );
  const ratio = project?.aspectRatio ?? "9:16";
  const prompt = buildVideoPrompt(shots);

  const task = await prisma.renderTask.create({
    data: {
      projectId,
      taskType: "VIDEO_RENDER",
      status: "PROCESSING",
      progress: 10,
      outputFormat: "MP4",
      inputPayload: {
        shotIds: shots.map((shot) => shot.id),
        prompt,
        ratio,
        duration,
        provider: "doubao-video",
      },
      startedAt: new Date(),
    },
  });

  try {
    const doubaoTask = await createVideoTaskWithDoubao({
      prompt,
      ratio,
      duration,
      resolution: "720p",
    });

    const asset = await prisma.generatedAsset.create({
      data: {
        projectId,
        assetType: "VIDEO",
        status: "GENERATING",
        prompt,
        model: doubaoTask.model,
        sourceTaskId: task.id,
        format: "mp4",
        metadata: {
          provider: "doubao-video",
          arkTaskId: doubaoTask.taskId,
          arkStatus: doubaoTask.status,
        },
      },
    });

    const exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        renderTaskId: task.id,
        outputAssetId: asset.id,
        name: "豆包视频生成",
        format: "MP4",
        status: "PROCESSING",
        progress: 10,
        settings: {
          provider: "doubao-video",
          arkTaskId: doubaoTask.taskId,
          model: doubaoTask.model,
          ratio,
          duration,
          resolution: "720p",
        },
      },
    });

    const updatedTask = await prisma.renderTask.update({
      where: { id: task.id },
      data: {
        generatedAssetId: asset.id,
        progress: 20,
        outputPayload: {
          provider: "doubao-video",
          arkTaskId: doubaoTask.taskId,
          arkStatus: doubaoTask.status,
          assetId: asset.id,
          exportJobId: exportJob.id,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        task: updatedTask,
        exportJob,
        asset,
        message: `已提交豆包视频生成任务：${doubaoTask.taskId}。任务为异步生成，请稍后查看导出状态。`,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "豆包视频任务创建失败。";

    const failedTask = await prisma.renderTask.update({
      where: { id: task.id },
      data: {
        status: "FAILED",
        progress: 0,
        errorMessage: message,
        completedAt: new Date(),
      },
    });

    const exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        renderTaskId: task.id,
        name: "豆包视频生成",
        format: "MP4",
        status: "FAILED",
        progress: 0,
        errorMessage: message,
        settings: { provider: "doubao-video" },
      },
    });

    return NextResponse.json(
      {
        success: false,
        error: { code: "VIDEO_GENERATION_ERROR", message },
        data: { task: failedTask, exportJob },
      },
      { status: 500 }
    );
  }
}
