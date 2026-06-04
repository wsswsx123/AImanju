import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;

  const [characters, props, worlds, shots] = await Promise.all([
    prisma.characterBible.findMany({ where: { projectId } }),
    prisma.propBible.findMany({ where: { projectId } }),
    prisma.worldBible.findMany({ where: { projectId } }),
    prisma.storyboardShot.findMany({ where: { projectId }, orderBy: { shotNumber: "asc" } }),
  ]);

  const issues = [];
  if (characters.length === 0) {
    issues.push({ level: "blocker", message: "缺少角色设定卡。" });
  }
  if (worlds.length === 0) {
    issues.push({ level: "blocker", message: "缺少背景/场景设定卡。" });
  }
  if (shots.length === 0) {
    issues.push({ level: "blocker", message: "缺少分镜。" });
  }
  for (const character of characters) {
    if (!character.imagePrompt) {
      issues.push({ level: "warning", message: `角色「${character.name}」缺少图像提示词。` });
    }
  }
  for (const prop of props) {
    if (!prop.imagePrompt) {
      issues.push({ level: "warning", message: `道具「${prop.name}」缺少图像提示词。` });
    }
  }
  for (const shot of shots) {
    if (!shot.imagePrompt) {
      issues.push({ level: "warning", message: `分镜 ${shot.shotNumber} 缺少画面提示词。` });
    }
    if (!shot.imageAssetId) {
      issues.push({ level: "warning", message: `分镜 ${shot.shotNumber} 还没有生成画面。` });
    }
    if ((shot.dialogue || shot.voiceText) && !shot.audioAssetId) {
      issues.push({ level: "suggestion", message: `分镜 ${shot.shotNumber} 有台词但尚未生成配音。` });
    }
  }

  const task = await prisma.renderTask.create({
    data: {
      projectId,
      taskType: "CONSISTENCY_CHECK",
      status: "COMPLETED",
      progress: 100,
      inputPayload: {
        characters: characters.length,
        props: props.length,
        worlds: worlds.length,
        shots: shots.length,
      },
      outputPayload: { issues },
      completedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      taskId: task.id,
      issues,
      passed: !issues.some((issue) => issue.level === "blocker"),
    },
  });
}
