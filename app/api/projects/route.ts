import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/api-utils";
import type { ApiResponse, PaginatedResponse, ProjectSummary } from "@/types";

const CreateProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  genre: z.string().max(50).optional(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional(),
  visualStyle: z.string().max(50).optional(),
  targetDuration: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  coverUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

const ListProjectsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z
    .enum(["name", "createdAt", "updatedAt", "status"])
    .optional()
    .default("updatedAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  search: z.string().optional(),
  status: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = CreateProjectSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid input" } },
        { status: 400 }
      );
    }

    const {
      name,
      description,
      genre,
      aspectRatio,
      visualStyle,
      targetDuration,
      status,
      coverUrl,
      metadata,
    } = validation.data;

    const project = await prisma.project.create({
      data: {
        name,
        description: description ?? null,
        genre: genre ?? null,
        aspectRatio: aspectRatio ?? "9:16",
        visualStyle: visualStyle ?? "Guoman",
        targetDuration: targetDuration ?? 180,
        status: (status as "DRAFT") ?? "DRAFT",
        coverUrl: coverUrl ?? null,
        metadata: metadata
          ? (toJsonValue(metadata) as object)
          : undefined,
      },
    });

    return NextResponse.json({ success: true, data: project } satisfies ApiResponse<typeof project>, {
      status: 201,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Create failed" } },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validation = ListProjectsSchema.safeParse({
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid query" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, search, status } = validation.data;
    const where: Record<string, unknown> = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;

    const total = await prisma.project.count({ where });
    const projects = await prisma.project.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: {
          select: {
            scripts: true,
            characterBibles: true,
            storyboardShots: true,
            generatedAssets: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);
    return NextResponse.json({
      success: true,
      data: projects.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
        updatedAt: p.updatedAt.toISOString(),
      })) as unknown as ProjectSummary[],
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    } satisfies PaginatedResponse<ProjectSummary>);
  } catch (error) {
    console.error("Error fetching projects:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "List failed" } },
      { status: 500 }
    );
  }
}
