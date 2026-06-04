// ============================================================
// GeneratedAsset Detail — GET, PATCH (status update), DELETE
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

const UpdateAssetSchema = z.object({
  imageUrl: z.string().url().optional().nullable(),
  thumbnailUrl: z.string().url().optional().nullable(),
  localPath: z.string().optional().nullable(),
  width: z.number().int().positive().optional().nullable(),
  height: z.number().int().positive().optional().nullable(),
  fileSize: z.number().int().positive().optional().nullable(),
  format: z.string().max(10).optional().nullable(),
  status: z.string().optional(),
  errorMessage: z.string().max(5000).optional().nullable(),
  generationTimeMs: z.number().int().positive().optional().nullable(),
  sortOrder: z.number().int().optional(),
});

function parseId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的素材ID" } }, { status: 400 });

    const asset = await prisma.generatedAsset.findUnique({
      where: { id },
      include: {
        characterBible: { select: { id: true, name: true } },
        propBible: { select: { id: true, name: true } },
        worldBible: { select: { id: true, name: true } },
        storyboardShot: { select: { id: true, shotNumber: true, sceneNumber: true } },
        renderTasks: { orderBy: { createdAt: "desc" } },
      },
    });

    if (!asset) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "素材不存在" } }, { status: 404 });

    return NextResponse.json({ success: true, data: asset } satisfies ApiResponse<typeof asset>);
  } catch (error) {
    console.error("Error fetching asset:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取素材详情失败" } }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的素材ID" } }, { status: 400 });

    const existing = await prisma.generatedAsset.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "素材不存在" } }, { status: 404 });

    const body = await request.json();
    const validation = UpdateAssetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const fields = ["imageUrl", "thumbnailUrl", "localPath", "width", "height", "fileSize", "format", "status", "errorMessage", "generationTimeMs", "sortOrder"];
    const updateData: Record<string, unknown> = {};
    for (const f of fields) {
      const val = (validation.data as Record<string, unknown>)[f];
      if (val !== undefined) updateData[f] = val;
    }

    const updated = await prisma.generatedAsset.update({ where: { id }, data: updateData });
    return NextResponse.json({ success: true, data: updated } satisfies ApiResponse<typeof updated>);
  } catch (error) {
    console.error("Error updating asset:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "更新素材失败" } }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string; assetId: string }> }
) {
  try {
    const { assetId: rawId } = await context.params;
    const id = parseId(rawId);
    if (!id) return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的素材ID" } }, { status: 400 });

    const existing = await prisma.generatedAsset.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "素材不存在" } }, { status: 404 });

    await prisma.generatedAsset.delete({ where: { id } });
    return NextResponse.json({ success: true, data: { id }, message: "素材已删除" } satisfies ApiResponse<{ id: string }>);
  } catch (error) {
    console.error("Error deleting asset:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "删除素材失败" } }, { status: 500 });
  }
}
