// ============================================================
// Project Detail API Route — GET (detail), PATCH (update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

// ============================================================
// Validation Schemas
// ============================================================

const UpdateProjectSchema = z.object({
  name: z.string().min(1, "项目名称不能为空").max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  genre: z.string().max(50).optional().nullable(),
  aspectRatio: z.enum(["9:16", "16:9", "1:1"]).optional().nullable(),
  visualStyle: z.string().max(50).optional().nullable(),
  targetDuration: z.coerce.number().int().positive().optional().nullable(),
  status: z.string().optional(),
  coverUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// ============================================================
// Helper: Parse and validate project ID
// ============================================================

function parseId(rawId: string): string | null {
  // UUID validation
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(rawId)) {
    return null;
  }
  return rawId;
}

// ============================================================
// GET — Fetch project detail with all relations
// ============================================================

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ID", message: "无效的项目ID格式" },
        },
        { status: 400 }
      );
    }

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        scripts: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            version: true,
            createdAt: true,
          },
        },
        characterBibles: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            displayName: true,
            roleType: true,
            imagePrompt: true,
          },
        },
        propBibles: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            category: true,
            imagePrompt: true,
          },
        },
        worldBibles: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            name: true,
            description: true,
          },
        },
        storyboardShots: {
          orderBy: [{ sceneNumber: "asc" }, { shotNumber: "asc" }],
          select: {
            id: true,
            shotNumber: true,
            sceneNumber: true,
            description: true,
            status: true,
          },
        },
        generatedAssets: {
          orderBy: { createdAt: "desc" },
          take: 24,
          select: {
            id: true,
            assetType: true,
            status: true,
            imageUrl: true,
          },
        },
        renderTasks: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            status: true,
            progress: true,
            outputFormat: true,
          },
        },
        exportJobs: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            format: true,
            status: true,
            fileUrl: true,
          },
        },
      },
    });

    if (!project) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "项目不存在" },
        },
        { status: 404 }
      );
    }

    const response: ApiResponse<typeof project> = {
      success: true,
      data: project,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching project:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "获取项目详情失败",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH — Update project
// ============================================================

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ID", message: "无效的项目ID格式" },
        },
        { status: 400 }
      );
    }

    // Check project exists
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "项目不存在" },
        },
        { status: 404 }
      );
    }

    // Parse and validate body
    const body = await request.json();
    const validation = UpdateProjectSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "请求数据验证失败",
            details: validation.error.issues.reduce(
              (acc, issue) => {
                const path = issue.path.join(".");
                if (!acc[path]) acc[path] = [];
                acc[path].push(issue.message);
                return acc;
              },
              {} as Record<string, string[]>
            ),
          },
        },
        { status: 400 }
      );
    }

    // Build update data (only include provided fields)
    const updateData: Record<string, unknown> = {};
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

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (genre !== undefined) updateData.genre = genre;
    if (aspectRatio !== undefined) updateData.aspectRatio = aspectRatio;
    if (visualStyle !== undefined) updateData.visualStyle = visualStyle;
    if (targetDuration !== undefined) updateData.targetDuration = targetDuration;
    if (status !== undefined) updateData.status = status;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;
    if (metadata !== undefined) updateData.metadata = metadata;

    const updated = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    const response: ApiResponse<typeof updated> = {
      success: true,
      data: updated,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error updating project:", error);

    // Handle Prisma not-found error
    if (
      error instanceof Error &&
      error.message.includes("Record to update not found")
    ) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "项目不存在" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "更新项目失败",
        },
      },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — Delete project (cascade deletes all related data)
// ============================================================

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (!id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "INVALID_ID", message: "无效的项目ID格式" },
        },
        { status: 400 }
      );
    }

    // Check project exists
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "项目不存在" },
        },
        { status: 404 }
      );
    }

    // Delete (cascade configured in Prisma schema)
    await prisma.project.delete({ where: { id } });

    return NextResponse.json(
      {
        success: true,
        data: { id },
        message: "项目已删除",
      } satisfies ApiResponse<{ id: string }>,
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "删除项目失败",
        },
      },
      { status: 500 }
    );
  }
}
