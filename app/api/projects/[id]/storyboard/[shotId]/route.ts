// ============================================================
// StoryboardShot Detail — GET, PATCH, DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdateShotSchema = z.object({
  shotNumber: z.number().int().positive().optional(),
  sceneNumber: z.number().int().positive().optional(),
  panelNumber: z.number().int().optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  dialogue: z.string().max(5000).optional().nullable(),
  dialogueEmotion: z.string().optional().nullable(),
  camera: z.string().max(100).optional().nullable(),
  cameraAngle: z.string().max(100).optional().nullable(),
  lighting: z.string().max(500).optional().nullable(),
  moodPrompt: z.string().max(5000).optional().nullable(),
  compositionNotes: z.string().max(5000).optional().nullable(),
  duration: z.number().positive().optional().nullable(),
  status: z.string().optional(),
  consistencyPromptId: z.string().optional().nullable(),
  referenceImageUrls: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

function parseId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const { shotId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的分镜ID" } }, { status: 400 });

    const shot = await prisma.storyboardShot.findUnique({
      where: { id },
      include: {
        consistencyPrompt: true,
        generatedAssets: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!shot) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "分镜不存在" } }, { status: 404 });

    return NextResponse.json({ success: true, data: shot } satisfies ApiResponse<typeof shot>);
  } catch (error) {
    console.error("Error fetching shot:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取分镜详情失败" } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const { shotId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的分镜ID" } }, { status: 400 });

    const existing = await prisma.storyboardShot.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "分镜不存在" } }, { status: 404 });

    const body = await request.json();
    const validation = UpdateShotSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json({
        success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues },
      }, { status: 400 });
    }

    const fields = ["shotNumber", "sceneNumber", "panelNumber", "description", "dialogue", "dialogueEmotion", "camera", "cameraAngle", "lighting", "moodPrompt", "compositionNotes", "duration", "status", "consistencyPromptId", "referenceImageUrls", "customFields"];
    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      const val = (validation.data as Record<string, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }
    updateData.version = existing.version + 1;

    const updated = await prisma.storyboardShot.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating shot:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "更新分镜失败" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; shotId: string }> }
) {
  try {
    const { shotId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的分镜ID" } }, { status: 400 });

    const existing = await prisma.storyboardShot.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "分镜不存在" } }, { status: 404 });

    await prisma.storyboardShot.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "分镜已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting shot:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "删除分镜失败" } }, { status: 500 });
  }
}
