// ============================================================
// GeneratedAsset API — POST (create/batch) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import type { AssetStatus, AssetType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreateAssetSchema = z.object({
  assetType: z.string().min(1),
  prompt: z.string().max(10000).optional(),
  negativePrompt: z.string().max(5000).optional(),
  model: z.string().max(100).optional(),
  modelVersion: z.string().max(50).optional(),
  seed: z.number().int().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  imageUrl: z.string().url().optional(),
  thumbnailUrl: z.string().url().optional(),
  localPath: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  fileSize: z.number().int().positive().optional(),
  format: z.string().max(10).optional(),
  status: z.string().optional(),
  characterBibleId: z.string().optional().nullable(),
  propBibleId: z.string().optional().nullable(),
  worldBibleId: z.string().optional().nullable(),
  storyboardShotId: z.string().optional().nullable(),
  batchId: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

const BatchCreateAssetSchema = z.object({
  assets: z.array(CreateAssetSchema).min(1),
});

const ListAssetsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(24),
  sortBy: z.enum(["createdAt", "sortOrder"]).optional().default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  assetType: z.string().optional(),
  status: z.string().optional(),
  characterBibleId: z.string().optional(),
  propBibleId: z.string().optional(),
  worldBibleId: z.string().optional(),
  storyboardShotId: z.string().optional(),
  batchId: z.string().optional(),
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

    // Batch create
    if (Array.isArray(body.assets)) {
      const validation = BatchCreateAssetSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
          { status: 400 }
        );
      }

      const assets = await prisma.$transaction(
        validation.data.assets.map((a) =>
          prisma.generatedAsset.create({
            data: {
              projectId,
              assetType: a.assetType as AssetType,
              prompt: a.prompt,
              negativePrompt: a.negativePrompt,
              model: a.model,
              modelVersion: a.modelVersion,
              seed: a.seed,
              parameters: a.parameters
                ? JSON.parse(JSON.stringify(a.parameters))
                : {},
              imageUrl: a.imageUrl,
              thumbnailUrl: a.thumbnailUrl,
              localPath: a.localPath,
              width: a.width,
              height: a.height,
              fileSize: a.fileSize,
              format: a.format,
              status: (a.status || "PENDING") as AssetStatus,
              characterBibleId: a.characterBibleId,
              propBibleId: a.propBibleId,
              worldBibleId: a.worldBibleId,
              storyboardShotId: a.storyboardShotId,
              batchId: a.batchId,
              sortOrder: a.sortOrder ?? 0,
            },
          })
        )
      );

      return NextResponse.json({ success: true, data: assets } satisfies ApiResponse<typeof assets>, { status: 201 });
    }

    // Single create
    const validation = CreateAssetSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
        { status: 400 }
      );
    }

    const a = validation.data;
    const asset = await prisma.generatedAsset.create({
      data: {
        projectId,
        assetType: a.assetType as AssetType,
        prompt: a.prompt,
        negativePrompt: a.negativePrompt,
        model: a.model,
        modelVersion: a.modelVersion,
        seed: a.seed,
        parameters: a.parameters
          ? JSON.parse(JSON.stringify(a.parameters))
          : {},
        imageUrl: a.imageUrl,
        thumbnailUrl: a.thumbnailUrl,
        localPath: a.localPath,
        width: a.width,
        height: a.height,
        fileSize: a.fileSize,
        format: a.format,
        status: (a.status || "PENDING") as AssetStatus,
        characterBibleId: a.characterBibleId,
        propBibleId: a.propBibleId,
        worldBibleId: a.worldBibleId,
        storyboardShotId: a.storyboardShotId,
        batchId: a.batchId,
        sortOrder: a.sortOrder ?? 0,
      },
    });

    return NextResponse.json({ success: true, data: asset } satisfies ApiResponse<typeof asset>, { status: 201 });
  } catch (error) {
    console.error("Error creating asset:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "创建素材失败" } }, { status: 500 });
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
    const rawParams: Record<string, string | undefined> = {};
    for (const key of ["page", "pageSize", "sortBy", "sortOrder", "assetType", "status", "characterBibleId", "propBibleId", "worldBibleId", "storyboardShotId", "batchId"]) {
      rawParams[key] = searchParams.get(key) ?? undefined;
    }

    const validation = ListAssetsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, ...filters } = validation.data;

    const where: Record<string, unknown> = { projectId };
    for (const [k, v] of Object.entries(filters)) {
      if (v !== undefined) where[k] = v;
    }

    const total = await prisma.generatedAsset.count({ where });
    const assets = await prisma.generatedAsset.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: assets,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof assets[number]>);
  } catch (error) {
    console.error("Error fetching assets:", error);
    return NextResponse.json({ success: false, error: { code: "INTERNAL_ERROR", message: "获取素材列表失败" } }, { status: 500 });
  }
}
