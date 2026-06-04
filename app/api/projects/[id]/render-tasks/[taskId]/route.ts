// ============================================================
// RenderTask Detail — GET, PATCH (status/progress update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdateRenderSchema = z.object({
  status: z.string().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  progress: z.number().min(0).max(100).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  outputFormat: z.string().optional().nullable(),
  outputPath: z.string().optional().nullable(),
  errorMessage: z.string().max(5000).optional().nullable(),
  retryCount: z.number().int().min(0).optional(),
  maxRetries: z.number().int().min(0).max(10).optional(),
  actualTimeMs: z.number().int().positive().optional().nullable(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

function parseId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的渲染任务ID" } }, { status: 400 });

    const task = await prisma.renderTask.findUnique({
      where: { id },
      include: {
        generatedAsset: true,
        exportJobs: true,
      },
    });

    if (!task) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "渲染任务不存在" } }, { status: 404 });

    return NextResponse.json({ success: true, data: task } satisfies ApiResponse<typeof task>);
  } catch (error) {
    console.error("Error fetching render task:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取渲染任务详情失败" } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的渲染任务ID" } }, { status: 400 });

    const existing = await prisma.renderTask.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "渲染任务不存在" } }, { status: 404 });

    const body = await request.json();
    const validation = UpdateRenderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    const { startedAt, completedAt, ...rest } = validation.data;

    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) updateData[k] = v;
    }

    // Handle auto-timestamps
    if (rest.status === "PROCESSING" && !existing.startedAt) {
      updateData.startedAt = new Date();
    }
    if ((rest.status === "COMPLETED" || rest.status === "FAILED") && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
    if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;

    const updated = await prisma.renderTask.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating render task:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "更新渲染任务失败" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; taskId: string }> }
) {
  try {
    const { taskId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的渲染任务ID" } }, { status: 400 });

    const existing = await prisma.renderTask.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "渲染任务不存在" } }, { status: 404 });

    await prisma.renderTask.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "渲染任务已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting render task:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "删除渲染任务失败" } }, { status: 500 });
  }
}
