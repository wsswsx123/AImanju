// ============================================================
// CharacterBible Detail — GET (detail), PATCH (update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdateCharacterSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  displayName: z.string().max(200).optional().nullable(),
  roleType: z.string().max(50).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
  appearance: z.string().max(5000).optional().nullable(),
  personality: z.string().max(5000).optional().nullable(),
  background: z.string().max(5000).optional().nullable(),
  relationships: z.array(z.record(z.string(), z.unknown())).optional(),
  age: z.number().int().positive().optional().nullable(),
  gender: z.string().max(20).optional().nullable(),
  imagePrompt: z.string().max(5000).optional().nullable(),
  negativePrompt: z.string().max(5000).optional().nullable(),
  referenceImageUrls: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

function parseId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "无效的角色ID" } },
        { status: 400 }
      );
    }

    const character = await prisma.characterBible.findUnique({
      where: { id },
      include: {
        generatedAssets: { orderBy: { createdAt: "desc" }, take: 20 },
      },
    });

    if (!character) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "角色不存在" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: character } satisfies ApiResponse<typeof character>);
  } catch (error) {
    console.error("Error fetching character:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取角色详情失败" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "无效的角色ID" } },
        { status: 400 }
      );
    }

    const existing = await prisma.characterBible.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "角色不存在" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validation = UpdateCharacterSchema.safeParse(body);
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
    const fields = [
      "name", "displayName", "roleType", "description", "appearance",
      "personality", "background", "relationships", "age", "gender",
      "imagePrompt", "negativePrompt", "referenceImageUrls", "customFields",
    ];

    for (const f of fields) {
      const val = (validation.data as Record<string, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }

    // Auto-increment version
    updateData.version = existing.version + 1;

    const updated = await prisma.characterBible.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating character:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新角色设定失败" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; characterId: string }> }
) {
  try {
    const { characterId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ID", message: "无效的角色ID" } },
        { status: 400 }
      );
    }

    const existing = await prisma.characterBible.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "角色不存在" } },
        { status: 404 }
      );
    }

    await prisma.characterBible.delete({ where: { id } });

    return NextResponse.json(
      { success: true, data: { id }, message: "角色已删除" } satisfies ApiResponse<{ id: string }>
    );
  } catch (error) {
    console.error("Error deleting character:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除角色失败" } },
      { status: 500 }
    );
  }
}
