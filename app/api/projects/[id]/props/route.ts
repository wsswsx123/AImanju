// ============================================================
// PropBible API — POST (create) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { ensureUniquePropId } from "@/lib/services/bible";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreatePropSchema = z.object({
  scriptId: z.string().optional().nullable(),
  name: z.string().min(1, "道具名称不能为空").max(200),
  description: z.string().max(5000).optional(),
  appearance: z.string().max(5000).optional(),
  significance: z.string().max(5000).optional(),
  category: z.string().max(50).optional(),
  imagePrompt: z.string().max(5000).optional(),
  negativePrompt: z.string().max(5000).optional(),
  referenceImageUrls: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const ListPropsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(["name", "category", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  category: z.string().optional(),
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
    const validation = CreatePropSchema.safeParse(body);
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
    const propId = await ensureUniquePropId(projectId, data.name);
    const prop = await prisma.propBible.create({
      data: {
        projectId,
        propId,
        scriptId: data.scriptId ?? null,
        name: data.name,
        description: data.description,
        appearance: data.appearance,
        significance: data.significance,
        category: data.category,
        imagePrompt: data.imagePrompt,
        negativePrompt: data.negativePrompt,
        referenceImageUrls: data.referenceImageUrls ?? [],
        customFields: data.customFields
          ? JSON.parse(JSON.stringify(data.customFields))
          : {},
      },
    });

    return NextResponse.json({ success: true, data: prop } satisfies ApiResponse<typeof prop>, { status: 201 });
  } catch (error) {
    console.error("Error creating prop:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建道具设定失败" } },
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
      category: searchParams.get("category") ?? undefined,
      scriptId: searchParams.get("scriptId") ?? undefined,
    };

    const validation = ListPropsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, search, category, scriptId } = validation.data;

    const where: Record<string, unknown> = { projectId };
    if (search) {
      where.OR = [{ name: { contains: search } }, { description: { contains: search } }];
    }
    if (category) where.category = category;
    if (scriptId) where.scriptId = scriptId;

    const total = await prisma.propBible.count({ where });
    const props = await prisma.propBible.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { _count: { select: { generatedAssets: true } } },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: props,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof props[number]>);
  } catch (error) {
    console.error("Error fetching props:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取道具列表失败" } },
      { status: 500 }
    );
  }
}
