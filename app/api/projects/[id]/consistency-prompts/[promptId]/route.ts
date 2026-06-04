// ============================================================
// ConsistencyPrompt Detail — GET, PATCH, DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdatePromptSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  promptType: z.string().optional(),
  description: z.string().max(5000).optional().nullable(),
  content: z.string().min(1).optional(),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean", "select"]),
    defaultValue: z.string(),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
});

function parseId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; promptId: string }> }
) {
  try {
    const { promptId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的提示词ID" } }, { status: 400 });

    const prompt = await prisma.consistencyPrompt.findUnique({
      where: { id },
      include: { storyboardShots: { select: { id: true, shotNumber: true, sceneNumber: true } } },
    });

    if (!prompt) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "提示词不存在" } }, { status: 404 });

    return NextResponse.json({ success: true, data: prompt } satisfies ApiResponse<typeof prompt>);
  } catch (error) {
    console.error("Error fetching consistency prompt:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取提示词详情失败" } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; promptId: string }> }
) {
  try {
    const { promptId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的提示词ID" } }, { status: 400 });

    const existing = await prisma.consistencyPrompt.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "提示词不存在" } }, { status: 404 });

    const body = await request.json();
    const validation = UpdatePromptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const fields = ["name", "promptType", "description", "content", "variables", "tags"];
    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      const val = (validation.data as Record<string, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }
    updateData.version = existing.version + 1;

    const updated = await prisma.consistencyPrompt.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating consistency prompt:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "更新提示词失败" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; promptId: string }> }
) {
  try {
    const { promptId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的提示词ID" } }, { status: 400 });

    const existing = await prisma.consistencyPrompt.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "提示词不存在" } }, { status: 404 });

    await prisma.consistencyPrompt.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "提示词已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting consistency prompt:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "删除提示词失败" } }, { status: 500 });
  }
}
