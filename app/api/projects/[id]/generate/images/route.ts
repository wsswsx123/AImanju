import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { generateImageWithDoubao } from "@/lib/doubao";

export const runtime = "nodejs";

const Schema = z.object({
  shotIds: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const validation = Schema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "请求参数无效。" } },
      { status: 400 }
    );
  }

  const shots = await prisma.storyboardShot.findMany({
    where: {
      projectId,
      id: validation.data.shotIds?.length ? { in: validation.data.shotIds } : undefined,
    },
    orderBy: { shotNumber: "asc" },
  });

  if (shots.length === 0) {
    return NextResponse.json(
      { success: false, error: { code: "EMPTY", message: "没有可生成的分镜，请先完成剧本解析。" } },
      { status: 400 }
    );
  }

  const results = [];
  let fallbackCount = 0;

  for (const shot of shots) {
    const prompt = shot.imagePrompt ?? shot.description ?? `分镜 ${shot.shotNumber}`;
    const task = await prisma.renderTask.create({
      data: {
        projectId,
        taskType: "SHOT_IMAGE",
        status: "PROCESSING",
        progress: 10,
        inputPayload: { shotId: shot.id, prompt, provider: "doubao" },
      },
    });

    const asset = await prisma.generatedAsset.create({
      data: {
        projectId,
        assetType: "STORYBOARD_SHOT",
        status: "GENERATING",
        prompt,
        negativePrompt: shot.negativePrompt,
        sourceTaskId: task.id,
        storyboardShotId: shot.id,
      },
    });

    let imageUrl: string | null = null;
    let model = process.env.IMAGE_MODEL ?? "doubao-image";
    let warning: string | undefined;

    try {
      const image = await generateImageWithDoubao(prompt);
      imageUrl = image.imageUrl;
      model = image.model;
      if (!imageUrl && image.base64) {
        imageUrl = `data:image/png;base64,${image.base64}`;
      }
    } catch (error) {
      fallbackCount += 1;
      warning = error instanceof Error ? error.message : "豆包图片生成失败";
      model = "local-svg-placeholder";
      imageUrl = makePlaceholderImage(shot.shotNumber, shot.description ?? prompt);
    }

    const updatedAsset = await prisma.generatedAsset.update({
      where: { id: asset.id },
      data: {
        status: "COMPLETED",
        imageUrl,
        model,
        errorMessage: warning,
        metadata: warning ? { fallback: true, warning } : { provider: "doubao" },
      },
    });

    await prisma.storyboardShot.update({
      where: { id: shot.id },
      data: { imageAssetId: asset.id, status: "COMPLETED" },
    });

    await prisma.renderTask.update({
      where: { id: task.id },
      data: {
        generatedAssetId: asset.id,
        status: "COMPLETED",
        progress: 100,
        outputPayload: {
          assetId: asset.id,
          imageUrl: updatedAsset.imageUrl,
          fallback: Boolean(warning),
          warning,
        },
        completedAt: new Date(),
      },
    });

    results.push({
      shotId: shot.id,
      assetId: asset.id,
      status: "COMPLETED",
      fallback: Boolean(warning),
      warning,
    });
  }

  await prisma.project.update({
    where: { id: projectId },
    data: { status: "ASSET_GENERATED" },
  });

  return NextResponse.json({
    success: true,
    data: {
      count: results.length,
      fallbackCount,
      results,
      message:
        fallbackCount > 0
          ? `镜头画面已处理，其中 ${fallbackCount} 张使用本地占位图。`
          : "镜头画面已由豆包生成完成。",
    },
  });
}

function makePlaceholderImage(shotNumber: number, description: string) {
  const safeText = escapeXml(description.slice(0, 90));
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#1c1917"/>
          <stop offset="55%" stop-color="#31515a"/>
          <stop offset="100%" stop-color="#c2410c"/>
        </linearGradient>
      </defs>
      <rect width="1280" height="720" fill="url(#bg)"/>
      <rect x="70" y="70" width="1140" height="580" rx="36" fill="rgba(255,250,242,0.92)"/>
      <text x="120" y="180" font-family="Microsoft YaHei, sans-serif" font-size="64" font-weight="800" fill="#1c1917">镜头 ${shotNumber}</text>
      <text x="120" y="280" font-family="Microsoft YaHei, sans-serif" font-size="34" font-weight="700" fill="#7c2d12">本地占位画面</text>
      <foreignObject x="120" y="330" width="1040" height="220">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Microsoft YaHei, sans-serif; font-size: 34px; line-height: 1.5; color: #44403c; font-weight: 700;">${safeText}</div>
      </foreignObject>
    </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
