// ============================================================
// Script Detail API Route — GET (detail), PATCH (update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

// ============================================================
// Validation Schema
// ============================================================

const UpdateScriptSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  content: z.string().min(1).optional(),
  notes: z.string().max(5000).optional().nullable(),
  parsedData: z.record(z.string(), z.unknown()).optional().nullable(),
  version: z.number().int().positive().optional(),
});

// ============================================================
// Helpers
// ============================================================

function parseId(rawId: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(rawId) ? rawId : null;
}

// ============================================================
// GET — Fetch script detail with relations
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
        { success: false, error: { code: "INVALID_ID", message: "无效的剧本ID格式" } },
        { status: 400 }
      );
    }

    const script = await prisma.script.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, name: true, status: true } },
        characterBibles: {
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, displayName: true, roleType: true, imagePrompt: true },
        },
        propBibles: {
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, category: true },
        },
        worldBibles: {
          orderBy: { createdAt: "desc" },
          select: { id: true, name: true, description: true },
        },
        storyboardShots: {
          orderBy: [{ sceneNumber: "asc" }, { shotNumber: "asc" }],
          select: { id: true, shotNumber: true, sceneNumber: true, description: true, status: true, dialogue: true },
        },
      },
    });

    if (!script) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "剧本不存在" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: script } satisfies ApiResponse<typeof script>);
  } catch (error) {
    console.error("Error fetching script:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取剧本详情失败" } },
      { status: 500 }
    );
  }
}

// ============================================================
// PATCH — Update script
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
        { success: false, error: { code: "INVALID_ID", message: "无效的剧本ID格式" } },
        { status: 400 }
      );
    }

    const existing = await prisma.script.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "剧本不存在" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = UpdateScriptSchema.safeParse(body);

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

    const updateData: Record<string, unknown> = {};
    const { title, content, notes, parsedData, version } = validation.data;

    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (notes !== undefined) updateData.notes = notes;
    if (parsedData !== undefined) updateData.parsedData = parsedData;
    if (version !== undefined) updateData.version = version;

    // If content changed, auto-increment version
    if (content !== undefined) {
      updateData.version = existing.version + 1;
    }

    const updated = await prisma.script.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating script:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新剧本失败" } },
      { status: 500 }
    );
  }
}

// ============================================================
// DELETE — Delete script (cascade deletes all related data)
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
        { success: false, error: { code: "INVALID_ID", message: "无效的剧本ID格式" } },
        { status: 400 }
      );
    }

    const existing = await prisma.script.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "剧本不存在" } },
        { status: 404 }
      );
    }

    await prisma.script.delete({ where: { id } });

    return NextResponse.json(
      { success: true, data: { id }, message: "剧本已删除" } satisfies ApiResponse<{ id: string }>
    );
  } catch (error) {
    console.error("Error deleting script:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除剧本失败" } },
      { status: 500 }
    );
  }
}
