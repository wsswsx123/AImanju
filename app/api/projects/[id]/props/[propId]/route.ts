// ============================================================
// PropBible Detail — GET (detail), PATCH (update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdatePropSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(5000).optional().nullable(),
  appearance: z.string().max(5000).optional().nullable(),
  significance: z.string().max(5000).optional().nullable(),
  category: z.string().max(50).optional().nullable(),
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
  context: { params: Promise<{ id: string; propId: string }> }
) {
  try {
    const { propId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的道具ID" } }, { status: 400 });
    }

    const prop = await prisma.propBible.findUnique({
      where: { id },
      include: { generatedAssets: { orderBy: { createdAt: "desc" }, take: 20 } },
    });

    if (!prop) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "道具不存在" } }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: prop } satisfies ApiResponse<typeof prop>);
  } catch (error) {
    console.error("Error fetching prop:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取道具详情失败" } },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; propId: string }> }
) {
  try {
    const { propId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的道具ID" } }, { status: 400 });
    }

    const existing = await prisma.propBible.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "道具不存在" } }, { status: 404 });
    }

    const body = await request.json();
    const validation = UpdatePropSchema.safeParse(body);
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

    const fields = ["name", "description", "appearance", "significance", "category", "imagePrompt", "negativePrompt", "referenceImageUrls", "customFields"];
    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      const val = (validation.data as Record<string, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }
    updateData.version = existing.version + 1;

    const updated = await prisma.propBible.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating prop:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "更新道具设定失败" } },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; propId: string }> }
) {
  try {
    const { propId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的道具ID" } }, { status: 400 });
    }

    const existing = await prisma.propBible.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "道具不存在" } }, { status: 404 });
    }

    await prisma.propBible.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "道具已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting prop:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "删除道具失败" } },
      { status: 500 }
    );
  }
}
