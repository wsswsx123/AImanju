import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreateScriptSchema = z.object({
  projectId: z.string().min(1),
  title: z.string().min(1).max(300),
  content: z.string().min(1),
  scriptType: z
    .enum(["FULL_SCRIPT", "SYNOPSIS", "SCENE_SCRIPT"])
    .optional()
    .default("FULL_SCRIPT"),
  notes: z.string().max(5000).optional(),
});

const ListScriptsSchema = z.object({
  projectId: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(["title", "createdAt", "updatedAt", "version"]).optional().default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateScriptSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const { projectId, title, content, scriptType, notes } = validation.data;
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Project not found" } },
        { status: 404 }
      );
    }

    const script = await prisma.script.create({
      data: {
        projectId,
        title,
        content,
        normalizedText: content.trim(),
        scriptType,
        analysisStatus: "PENDING",
        notes: notes ?? null,
      },
    });

    return NextResponse.json(
      { success: true, data: script } satisfies ApiResponse<typeof script>,
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating script:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Create failed" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = ListScriptsSchema.safeParse({
      projectId: searchParams.get("projectId") ?? undefined,
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      search: searchParams.get("search") ?? undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid query" } },
        { status: 400 }
      );
    }

    const { projectId, page, pageSize, sortBy, sortOrder, search } = validation.data;
    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const total = await prisma.script.count({ where });
    const scripts = await prisma.script.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);
    return NextResponse.json({
      success: true,
      data: scripts,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    } satisfies PaginatedResponse<(typeof scripts)[number]>);
  } catch (error) {
    console.error("Error fetching scripts:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "List failed" } },
      { status: 500 }
    );
  }
}
