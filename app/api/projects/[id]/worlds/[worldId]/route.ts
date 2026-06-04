// ============================================================
// WorldBible Detail — GET (detail), PATCH (update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdateWorldSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  setting: z.string().max(5000).optional().nullable(),
  atmosphere: z.string().max(5000).optional().nullable(),
  timePeriod: z.string().max(200).optional().nullable(),
  location: z.string().max(500).optional().nullable(),
  architecture: z.string().max(5000).optional().nullable(),
  floraAndFauna: z.string().max(5000).optional().nullable(),
  cultureAndSociety: z.string().max(5000).optional().nullable(),
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
  context: { params: Promise<{ id: string; worldId: string }> }
) {
  try {
    const { worldId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的世界观ID" } }, { status: 400 });
    }

    const world = await prisma.worldBible.findUnique({
      where: { id },
      include: { generatedAssets: { orderBy: { createdAt: "desc" }, take: 20 } },
    });

    if (!world) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "世界观不存在" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: world } satisfies ApiResponse<typeof world>);
  } catch (error) {
    console.error("Error fetching world:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取世界观详情失败" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; worldId: string }> }
) {
  try {
    const { worldId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的世界观ID" } }, { status: 400 });
    }

    const existing = await prisma.worldBible.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "世界观不存在" } }, { status: 404 });
    }

    const body = await request.json();
    const validation = UpdateWorldSchema.safeParse(body);
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

    const fields = ["name", "description", "setting", "atmosphere", "timePeriod", "location", "architecture", "floraAndFauna", "cultureAndSociety", "imagePrompt", "negativePrompt", "referenceImageUrls", "customFields"];
    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      const val = (validation.data as Record<string, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }
    updateData.version = existing.version + 1;

    const updated = await prisma.worldBible.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating world:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新世界观设定失败" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; worldId: string }> }
) {
  try {
    const { worldId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的世界观ID" } }, { status: 400 });
    }

    const existing = await prisma.worldBible.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "世界观不存在" } }, { status: 404 });
    }

    await prisma.worldBible.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "世界观已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting world:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除世界观失败" } },
      { status: 500 }
    );
  }
}
