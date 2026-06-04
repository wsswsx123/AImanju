// ============================================================
// RenderTask API — POST (create) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreateRenderSchema = z.object({
  generatedAssetId: z.string().optional().nullable(),
  priority: z.number().int().min(0).max(100).optional().default(0),
  settings: z.record(z.string(), z.unknown()).optional(),
  outputFormat: z.string().optional(),
  outputPath: z.string().optional(),
  maxRetries: z.number().int().min(0).max(10).optional().default(3),
  estimatedTimeMs: z.number().int().positive().optional(),
});

const ListRenderSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(["priority", "status", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  status: z.string().optional(),
  generatedAssetId: z.string().optional(),
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
    const validation = CreateRenderSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const data = validation.data;
    const task = await prisma.renderTask.create({
      data: {
        projectId,
        generatedAssetId: data.generatedAssetId ?? null,
        priority: data.priority,
        settings: data.settings ? JSON.parse(JSON.stringify(data.settings)) : {},
        outputFormat: data.outputFormat,
        outputPath: data.outputPath,
        maxRetries: data.maxRetries,
        estimatedTimeMs: data.estimatedTimeMs,
        status: "QUEUED",
      },
    });

    return NextResponse.json({ success: true, data: task } satisfies ApiResponse<typeof task>, { status: 201 });
  } catch (error) {
    console.error("Error creating render task:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "创建渲染任务失败" } }, { status: 500 });
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
    for (const key of ["page", "pageSize", "sortBy", "sortOrder", "status", "generatedAssetId"]) {
      rawParams[key] = searchParams.get(key) ?? undefined;
    }

    const validation = ListRenderSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, ...filters } = validation.data;

    const where: Record<string, unknown> = { projectId };
    if (filters.status) where.status = filters.status;
    if (filters.generatedAssetId) where.generatedAssetId = filters.generatedAssetId;

    const total = await prisma.renderTask.count({ where });
    const tasks = await prisma.renderTask.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        generatedAsset: { select: { id: true, assetType: true, imageUrl: true } },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: tasks,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof tasks[number]>);
  } catch (error) {
    console.error("Error fetching render tasks:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取渲染任务列表失败" } }, { status: 500 });
  }
}
