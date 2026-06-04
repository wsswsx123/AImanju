// ============================================================
// ExportJob Detail — GET, PATCH (status update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdateExportSchema = z.object({
  name: z.string().max(300).optional().nullable(),
  status: z.string().optional(),
  progress: z.number().min(0).max(100).optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  fileUrl: z.string().url().optional().nullable(),
  filePath: z.string().optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  duration: z.number().positive().optional().nullable(),
  frameCount: z.number().int().positive().optional().nullable(),
  resolution: z.string().optional().nullable(),
  fps: z.number().int().min(1).max(120).optional(),
  errorMessage: z.string().max(5000).optional().nullable(),
  retryCount: z.number().int().min(0).optional(),
  startedAt: z.string().datetime().optional().nullable(),
  completedAt: z.string().datetime().optional().nullable(),
});

function parseId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { jobId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的导出任务ID" } }, { status: 400 });

    const job = await prisma.exportJob.findUnique({
      where: { id },
      include: { renderTask: true },
    });

    if (!job) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "导出任务不存在" } }, { status: 404 });

    return NextResponse.json({ success: true, data: job } satisfies ApiResponse<typeof job>);
  } catch (error) {
    console.error("Error fetching export job:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取导出任务详情失败" } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { jobId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的导出任务ID" } }, { status: 400 });

    const existing = await prisma.exportJob.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "导出任务不存在" } }, { status: 404 });

    const body = await request.json();
    const validation = UpdateExportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const { startedAt, completedAt, ...rest } = validation.data;
    const updateData: Record<string, unknown> = {};

    for (const [k, v] of Object.entries(rest)) {
      if (v !== undefined) updateData[k] = v;
    }

    // Auto-timestamps
    if (rest.status === "PROCESSING" && !existing.startedAt) {
      updateData.startedAt = new Date();
    }
    if ((rest.status === "COMPLETED" || rest.status === "FAILED") && !existing.completedAt) {
      updateData.completedAt = new Date();
    }
    if (startedAt !== undefined) updateData.startedAt = startedAt ? new Date(startedAt) : null;
    if (completedAt !== undefined) updateData.completedAt = completedAt ? new Date(completedAt) : null;

    const updated = await prisma.exportJob.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating export job:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "更新导出任务失败" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; jobId: string }> }
) {
  try {
    const { jobId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的导出任务ID" } }, { status: 400 });

    const existing = await prisma.exportJob.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "导出任务不存在" } }, { status: 404 });

    await prisma.exportJob.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "导出任务已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting export job:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "删除导出任务失败" } }, { status: 500 });
  }
}
