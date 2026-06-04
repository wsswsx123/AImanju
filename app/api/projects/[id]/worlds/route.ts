// ============================================================
// WorldBible API — POST (create) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { ensureUniqueSceneId } from "@/lib/services/bible";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreateWorldSchema = z.object({
  scriptId: z.string().optional().nullable(),
  name: z.string().min(1, "场景名称不能为空").max(200),
  description: z.string().max(5000).optional(),
  setting: z.string().max(5000).optional(),
  atmosphere: z.string().max(5000).optional(),
  timePeriod: z.string().max(200).optional(),
  location: z.string().max(500).optional(),
  architecture: z.string().max(5000).optional(),
  floraAndFauna: z.string().max(5000).optional(),
  cultureAndSociety: z.string().max(5000).optional(),
  imagePrompt: z.string().max(5000).optional(),
  negativePrompt: z.string().max(5000).optional(),
  referenceImageUrls: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const ListWorldsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(["name", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  scriptId: z.string().optional(),
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
    if (!projectId) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "项目不存在" } }, { status: 404 });
    }

    const body = await request.json();
    const validation = CreateWorldSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求数据验证失败",
            details: validation.error.issues.reduce(
              (acc, issue) => { const path = issue.path.join("."); if (!acc[path]) acc[path] = []; acc[path].push(issue.message); return acc; },
              {} as Record<string, string[]>
            ),
          },
        },
        { status: 400 }
      );
    }

    const data = validation.data;
    const sceneId = await ensureUniqueSceneId(projectId, data.name);
    const world = await prisma.worldBible.create({
      data: {
        projectId,
        sceneId,
        scriptId: data.scriptId ?? null,
        name: data.name,
        description: data.description,
        setting: data.setting,
        atmosphere: data.atmosphere,
        timePeriod: data.timePeriod,
        location: data.location,
        architecture: data.architecture,
        floraAndFauna: data.floraAndFauna,
        cultureAndSociety: data.cultureAndSociety,
        imagePrompt: data.imagePrompt,
        negativePrompt: data.negativePrompt,
        referenceImageUrls: data.referenceImageUrls ?? [],
        customFields: data.customFields
          ? JSON.parse(JSON.stringify(data.customFields))
          : {},
      },
    });

    return NextResponse.json({ success: true, data: world } satisfies ApiResponse<typeof world>, { status: 201 });
  } catch (error) {
    console.error("Error creating world:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建世界观设定失败" } },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const projectId = parseProjectId(rawId);
    if (!projectId) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      scriptId: searchParams.get("scriptId") ?? undefined,
    };

    const validation = ListWorldsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, search, scriptId } = validation.data;

    const where: Record<string, unknown> = { projectId };
    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }
    if (scriptId) where.scriptId = scriptId;

    const total = await prisma.worldBible.count({ where });
    const worlds = await prisma.worldBible.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { generatedAssets: true } } },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: worlds,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof worlds[number]>);
  } catch (error) {
    console.error("Error fetching worlds:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取世界观列表失败" } },
      { status: 500 }
    );
  }
}
