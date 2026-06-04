// ============================================================
// ExportJob API — POST (create) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreateExportSchema = z.object({
  renderTaskId: z.string().optional().nullable(),
  name: z.string().max(300).optional(),
  format: z.string().optional(),
  settings: z.record(z.string(), z.unknown()).optional(),
  resolution: z.string().optional(),
  fps: z.number().int().min(1).max(120).optional().default(24),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
});

const ListExportsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(["format", "status", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  format: z.string().optional(),
  status: z.string().optional(),
  renderTaskId: z.string().optional(),
});

function parseProjectId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const projectId = parseProjectId(rawId);
    if (!projectId) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "项目不存在" } }, { status: 404 });

    const body = await request.json();
    const validation = CreateExportSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const data = validation.data;
    const exportJob = await prisma.exportJob.create({
      data: {
        projectId,
        renderTaskId: data.renderTaskId ?? null,
        name: data.name,
        format: (data.format || "MP4") as "MP4",
        settings: data.settings ? JSON.parse(JSON.stringify(data.settings)) : {},
        resolution: data.resolution,
        fps: data.fps,
        maxRetries: data.maxRetries,
        status: "PENDING",
      },
    });

    return NextResponse.json({ success: true, data: exportJob } satisfies ApiResponse<typeof exportJob>, { status: 201 });
  } catch (error) {
    console.error("Error creating export job:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "创建导出任务失败" } }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const projectId = parseProjectId(rawId);
    if (!projectId) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const rawParams: Record<string, string | undefined> = {};
    for (const key of ["page", "pageSize", "sortBy", "sortOrder", "format", "status", "renderTaskId"]) {
      rawParams[key] = searchParams.get(key) ?? undefined;
    }

    const validation = ListExportsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, ...filters } = validation.data;

    const where: Record<string, unknown> = { projectId };
    if (filters.format) where.format = filters.format;
    if (filters.status) where.status = filters.status;
    if (filters.renderTaskId) where.renderTaskId = filters.renderTaskId;

    const total = await prisma.exportJob.count({ where });
    const jobs = await prisma.exportJob.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        renderTask: { select: { id: true, status: true, progress: true } },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: jobs,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof jobs[number]>);
  } catch (error) {
    console.error("Error fetching export jobs:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取导出任务列表失败" } }, { status: 500 });
  }
}
