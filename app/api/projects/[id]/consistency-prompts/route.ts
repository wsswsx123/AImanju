// ============================================================
// ConsistencyPrompt API — POST (create) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreatePromptSchema = z.object({
  name: z.string().min(1).max(200),
  promptType: z.string().optional(),
  description: z.string().max(5000).optional(),
  content: z.string().min(1),
  variables: z.array(z.object({
    name: z.string(),
    type: z.enum(["string", "number", "boolean", "select"]),
    defaultValue: z.string(),
    options: z.array(z.string()).optional(),
    description: z.string().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
});

const ListPromptsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(50),
  sortBy: z.enum(["name", "promptType", "createdAt"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  promptType: z.string().optional(),
  tags: z.string().optional(), // comma-separated
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
    const validation = CreatePromptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const data = validation.data;
    const prompt = await prisma.consistencyPrompt.create({
      data: {
        projectId,
        name: data.name,
        promptType: (data.promptType || "CUSTOM") as
          | "CHARACTER"
          | "SCENE"
          | "STYLE"
          | "LIGHTING"
          | "COMPOSITION"
          | "COLOR_PALETTE"
          | "CUSTOM",
        description: data.description,
        content: data.content,
        variables: data.variables
          ? JSON.parse(JSON.stringify(data.variables))
          : [],
        tags: data.tags ?? [],
      },
    });

    return NextResponse.json({ success: true, data: prompt } satisfies ApiResponse<typeof prompt>, { status: 201 });
  } catch (error) {
    console.error("Error creating consistency prompt:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建一致性提示词失败" } },
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
    if (!projectId) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });

    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      promptType: searchParams.get("promptType") ?? undefined,
      tags: searchParams.get("tags") ?? undefined,
    };

    const validation = ListPromptsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, promptType, tags } = validation.data;

    const where: Record<string, unknown> = { projectId };
    if (promptType) where.promptType = promptType;

    const total = await prisma.consistencyPrompt.count({ where });
    const prompts = await prisma.consistencyPrompt.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Client-side tag filtering if tags param is provided
    let filtered = prompts;
    if (tags) {
      const tagList = tags.split(",").map((t) => t.trim().toLowerCase());
      filtered = prompts.filter((p) => {
        const promptTags = (p.tags as string[] | undefined) ?? [];
        return tagList.some((t) => promptTags.some((pt) => pt.toLowerCase() === t));
      });
    }

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: filtered,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof prompts[number]>);
  } catch (error) {
    console.error("Error fetching consistency prompts:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取一致性提示词列表失败" } },
      { status: 500 }
    );
  }
}
