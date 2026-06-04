// ============================================================
// StoryboardShot API — POST (create/batch) & GET (list) by project
// ============================================================

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import type { DialogueEmotion, StoryboardShotStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ApiResponse, PaginatedResponse } from "@/types";

const CreateShotSchema = z.object({
  scriptId: z.string().optional().nullable(),
  shotNumber: z.number().int().positive(),
  sceneNumber: z.number().int().positive(),
  panelNumber: z.number().int().optional(),
  description: z.string().max(5000).optional(),
  dialogue: z.string().max(5000).optional(),
  dialogueEmotion: z.string().optional(),
  camera: z.string().max(100).optional(),
  cameraAngle: z.string().max(100).optional(),
  lighting: z.string().max(500).optional(),
  moodPrompt: z.string().max(5000).optional(),
  compositionNotes: z.string().max(5000).optional(),
  duration: z.number().positive().optional(),
  status: z.string().optional(),
  consistencyPromptId: z.string().optional().nullable(),
  referenceImageUrls: z.array(z.string()).optional(),
  customFields: z.record(z.string(), z.unknown()).optional(),
});

const BatchCreateSchema = z.object({
  scriptId: z.string().optional(),
  shots: z.array(CreateShotSchema).min(1, "至少需要一个分镜"),
});

const ListShotsSchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(500).optional().default(100),
  sortBy: z.enum(["shotNumber", "sceneNumber", "createdAt"]).optional().default("shotNumber"),
  sortOrder: z.enum(["asc", "desc"]).optional().default("asc"),
  status: z.string().optional(),
  scriptId: z.string().optional(),
  sceneNumber: z.coerce.number().int().positive().optional(),
});

function parseProjectId(raw: string): string | null {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(raw) ? raw : null;
}

// POST — Create single or batch of storyboard shots
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const projectId = parseProjectId(rawId);
    if (!projectId) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      return NextResponse.json({ success: false, error: { code: "NOT_FOUND", message: "项目不存在" } }, { status: 404 });
    }

    const body = await request.json();

    // Check if it's a batch create
    if (Array.isArray(body.shots)) {
      const validation = BatchCreateSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { success: false, error: { code: "VALIDATION_ERROR", message: "请求数据验证失败", details: validation.error.issues } },
          { status: 400 }
        );
      }

      const shots = await prisma.$transaction(
        validation.data.shots.map((shot) =>
          prisma.storyboardShot.create({
            data: {
              projectId,
              scriptId: validation.data.scriptId ?? shot.scriptId ?? null,
              shotNumber: shot.shotNumber,
              sceneNumber: shot.sceneNumber,
              panelNumber: shot.panelNumber,
              description: shot.description,
              dialogue: shot.dialogue,
              dialogueEmotion: shot.dialogueEmotion as DialogueEmotion | undefined,
              camera: shot.camera,
              cameraAngle: shot.cameraAngle,
              lighting: shot.lighting,
              moodPrompt: shot.moodPrompt,
              compositionNotes: shot.compositionNotes,
              duration: shot.duration,
              status: (shot.status || "DRAFT") as StoryboardShotStatus,
              consistencyPromptId: shot.consistencyPromptId,
              referenceImageUrls: shot.referenceImageUrls ?? [],
              customFields: shot.customFields
                ? JSON.parse(JSON.stringify(shot.customFields))
                : {},
            },
          })
        )
      );

      return NextResponse.json({ success: true, data: shots } satisfies ApiResponse<typeof shots>, { status: 201 });
    }

    // Single create
    const validation = CreateShotSchema.safeParse(body);
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

    const data = validation.data;
    const shot = await prisma.storyboardShot.create({
      data: {
        projectId,
        scriptId: data.scriptId ?? null,
        shotNumber: data.shotNumber,
        sceneNumber: data.sceneNumber,
        panelNumber: data.panelNumber,
        description: data.description,
        dialogue: data.dialogue,
        dialogueEmotion: data.dialogueEmotion as DialogueEmotion | undefined,
        camera: data.camera,
        cameraAngle: data.cameraAngle,
        lighting: data.lighting,
        moodPrompt: data.moodPrompt,
        compositionNotes: data.compositionNotes,
        duration: data.duration,
        status: (data.status || "DRAFT") as StoryboardShotStatus,
        consistencyPromptId: data.consistencyPromptId,
        referenceImageUrls: data.referenceImageUrls ?? [],
        customFields: data.customFields
          ? JSON.parse(JSON.stringify(data.customFields))
          : {},
      },
    });

    return NextResponse.json({ success: true, data: shot } satisfies ApiResponse<typeof shot>, { status: 201 });
  } catch (error) {
    console.error("Error creating storyboard shot:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "创建分镜失败" } },
      { status: 500 }
    );
  }
}

// GET — List storyboard shots
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const projectId = parseProjectId(rawId);
    if (!projectId) {
      return NextResponse.json({ success: false, error: { code: "INVALID_ID", message: "无效的项目ID" } }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const rawParams = {
      page: searchParams.get("page") ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
      sortBy: searchParams.get("sortBy") ?? undefined,
      sortOrder: searchParams.get("sortOrder") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      scriptId: searchParams.get("scriptId") ?? undefined,
      sceneNumber: searchParams.get("sceneNumber") ?? undefined,
    };

    const validation = ListShotsSchema.safeParse(rawParams);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "查询参数验证失败" } },
        { status: 400 }
      );
    }

    const { page, pageSize, sortBy, sortOrder, status, scriptId, sceneNumber } = validation.data;

    const where: Record<string, unknown> = { projectId };
    if (status) where.status = status;
    if (scriptId) where.scriptId = scriptId;
    if (sceneNumber) where.sceneNumber = sceneNumber;

    const total = await prisma.storyboardShot.count({ where });
    const shots = await prisma.storyboardShot.findMany({
      where,
      orderBy: sortBy === "shotNumber" || sortBy === "sceneNumber"
        ? [{ sceneNumber: sortOrder }, { shotNumber: sortOrder }]
        : { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        generatedAssets: {
          select: { id: true, imageUrl: true, thumbnailUrl: true, status: true },
        },
      },
    });

    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: shots,
      pagination: { page, pageSize, total, totalPages, hasNext: page < totalPages, hasPrev: page > 1 },
    } satisfies PaginatedResponse<typeof shots[number]>);
  } catch (error) {
    console.error("Error fetching storyboard shots:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "获取分镜列表失败" } },
      { status: 500 }
    );
  }
}
