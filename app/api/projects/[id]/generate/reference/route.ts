import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { generateImageWithDoubao } from "@/lib/doubao";

const Schema = z.object({
  targetType: z.enum(["character", "prop", "world"]),
  targetId: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;
  const body = await request.json();
  const validation = Schema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "请求参数无效。" } },
      { status: 400 }
    );
  }

  const { targetType, targetId } = validation.data;
  const target = await loadTarget(projectId, targetType, targetId);
  if (!target) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "设定卡不存在。" } },
      { status: 404 }
    );
  }

  const task = await prisma.renderTask.create({
    data: {
      projectId,
      taskType: "REFERENCE_IMAGE",
      status: "PROCESSING",
      progress: 10,
      inputPayload: { targetType, targetId, prompt: target.prompt },
    },
  });

  const asset = await prisma.generatedAsset.create({
    data: {
      projectId,
      assetType:
        targetType === "character"
          ? "CHARACTER_PORTRAIT"
          : targetType === "prop"
            ? "PROP_IMAGE"
            : "WORLD_BACKGROUND",
      status: "GENERATING",
      prompt: target.prompt,
      negativePrompt: target.negativePrompt,
      sourceTaskId: task.id,
      characterBibleId: targetType === "character" ? targetId : null,
      propBibleId: targetType === "prop" ? targetId : null,
      worldBibleId: targetType === "world" ? targetId : null,
    },
  });

  try {
    const image = await generateImageWithDoubao(target.prompt);
    const updatedAsset = await prisma.generatedAsset.update({
      where: { id: asset.id },
      data: {
        status: "COMPLETED",
        imageUrl: image.imageUrl,
        model: image.model,
        metadata: image.base64 ? { b64_json: image.base64 } : undefined,
      },
    });
    await prisma.renderTask.update({
      where: { id: task.id },
      data: {
        generatedAssetId: asset.id,
        status: "COMPLETED",
        progress: 100,
        outputPayload: { assetId: asset.id, imageUrl: updatedAsset.imageUrl },
        completedAt: new Date(),
      },
    });
    return NextResponse.json({ success: true, data: updatedAsset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "生成失败。";
    await prisma.generatedAsset.update({
      where: { id: asset.id },
      data: { status: "FAILED", errorMessage: message },
    });
    await prisma.renderTask.update({
      where: { id: task.id },
      data: {
        generatedAssetId: asset.id,
        status: "FAILED",
        progress: 100,
        errorMessage: message,
        completedAt: new Date(),
      },
    });
    return NextResponse.json(
      { success: false, error: { code: "GENERATION_FAILED", message } },
      { status: 502 }
    );
  }
}

async function loadTarget(projectId: string, type: string, id: string) {
  if (type === "character") {
    const item = await prisma.characterBible.findFirst({ where: { id, projectId } });
    return item
      ? {
          prompt: item.imagePrompt ?? item.appearance ?? item.description ?? item.name,
          negativePrompt: item.negativePrompt,
        }
      : null;
  }
  if (type === "prop") {
    const item = await prisma.propBible.findFirst({ where: { id, projectId } });
    return item
      ? {
          prompt: item.imagePrompt ?? item.appearance ?? item.description ?? item.name,
          negativePrompt: item.negativePrompt,
        }
      : null;
  }
  const item = await prisma.worldBible.findFirst({ where: { id, projectId } });
  return item
    ? {
        prompt: item.imagePrompt ?? item.description ?? item.name,
        negativePrompt: item.negativePrompt,
      }
    : null;
}
