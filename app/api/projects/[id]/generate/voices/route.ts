import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { XunfeiConfigError, synthesizeWithXunfeiTts } from "@/lib/xunfei-tts";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await context.params;

  try {
    const missing = [
      "XUNFEI_APPID",
      "XUNFEI_API_KEY",
      "XUNFEI_API_SECRET",
      "XUNFEI_TTS_URL",
    ].filter((key) => !process.env[key]);

    if (missing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "CONFIG_ERROR",
            message: `缺少讯飞语音配置：${missing.join(", ")}`,
          },
        },
        { status: 500 }
      );
    }

    const shots = await prisma.storyboardShot.findMany({
      where: {
        projectId,
        OR: [{ voiceText: { not: null } }, { dialogue: { not: null } }],
      },
      orderBy: { shotNumber: "asc" },
    });

    if (shots.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "EMPTY", message: "没有可配音的台词。" } },
        { status: 400 }
      );
    }

    const audioDir = path.join(process.cwd(), "public", "generated", "audio", projectId);
    await mkdir(audioDir, { recursive: true });

    const results = [];
    for (const shot of shots) {
      const text = shot.voiceText || shot.dialogue || shot.subtitle || "";
      if (!text.trim()) continue;

      const task = await prisma.renderTask.create({
        data: {
          projectId,
          taskType: "VOICE",
          status: "PROCESSING",
          progress: 10,
          startedAt: new Date(),
          inputPayload: {
            shotId: shot.id,
            text,
            provider: "xunfei",
            voiceProfile: process.env.XUNFEI_VOICE_NAME || "x4_xiaoyan",
          },
        },
      });

      const asset = await prisma.generatedAsset.create({
        data: {
          projectId,
          assetType: "AUDIO",
          status: "GENERATING",
          prompt: text,
          sourceTaskId: task.id,
          storyboardShotId: shot.id,
          model: "xunfei-tts",
          format: "mp3",
          metadata: {
            provider: "xunfei",
            voiceProfile: process.env.XUNFEI_VOICE_NAME || "x4_xiaoyan",
          },
        },
      });

      await prisma.renderTask.update({
        where: { id: task.id },
        data: { generatedAssetId: asset.id, progress: 30 },
      });

      try {
        const audioResult = await synthesizeWithXunfeiTts(text);
        const fileName = `${asset.id}.mp3`;
        const localPath = path.join(audioDir, fileName);
        const storageUrl = `/generated/audio/${projectId}/${fileName}`;
        await writeFile(localPath, audioResult.audio);

        await prisma.generatedAsset.update({
          where: { id: asset.id },
          data: {
            status: "COMPLETED",
            storageUrl,
            localPath,
            fileSize: audioResult.audio.length,
            generationTimeMs: audioResult.elapsedMs,
            metadata: {
              provider: "xunfei",
              voiceProfile: process.env.XUNFEI_VOICE_NAME || "x4_xiaoyan",
              sid: audioResult.sid,
            },
          },
        });

        await prisma.renderTask.update({
          where: { id: task.id },
          data: {
            status: "COMPLETED",
            progress: 100,
            outputPath: storageUrl,
            outputFormat: "mp3",
            outputPayload: {
              assetId: asset.id,
              storageUrl,
              fileSize: audioResult.audio.length,
            },
            completedAt: new Date(),
            actualTimeMs: audioResult.elapsedMs,
          },
        });

        await prisma.storyboardShot.update({
          where: { id: shot.id },
          data: { audioAssetId: asset.id },
        });

        results.push({
          taskId: task.id,
          assetId: asset.id,
          shotId: shot.id,
          status: "COMPLETED",
          storageUrl,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "讯飞 TTS 生成失败";
        await prisma.generatedAsset.update({
          where: { id: asset.id },
          data: { status: "FAILED", errorMessage: message },
        });
        await prisma.renderTask.update({
          where: { id: task.id },
          data: {
            status: "FAILED",
            progress: 0,
            errorMessage: message,
            completedAt: new Date(),
          },
        });
        results.push({
          taskId: task.id,
          assetId: asset.id,
          shotId: shot.id,
          status: "FAILED",
          error: message,
        });
      }
    }

    const failed = results.filter((item) => item.status === "FAILED");
    return NextResponse.json({
      success: failed.length === 0,
      data: {
        count: results.length,
        completed: results.length - failed.length,
        failed: failed.length,
        tasks: results,
        message:
          failed.length === 0
            ? "讯飞 TTS 配音已生成完成。"
            : `已完成 ${results.length - failed.length} 条配音，${failed.length} 条失败。`,
      },
    });
  } catch (error) {
    const message =
      error instanceof XunfeiConfigError || error instanceof Error
        ? error.message
        : "配音生成失败";
    return NextResponse.json(
      {
        success: false,
        error: { code: "VOICE_GENERATION_ERROR", message },
      },
      { status: 500 }
    );
  }
}
