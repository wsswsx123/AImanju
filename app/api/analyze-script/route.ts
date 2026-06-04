import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import type { WorldBible } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toJsonValue } from "@/lib/api-utils";
import {
  batchGenerateCharacterBibles,
  batchGeneratePropBibles,
  batchGenerateWorldBibles,
  generateConsistencyPrompts,
  parseScript,
} from "@/lib/deepseek";
import { fallbackAnalyzeScript } from "@/lib/novel-script";
import {
  ensureUniqueCharacterId,
  ensureUniquePropId,
  ensureUniqueSceneId,
} from "@/lib/services/bible";

const Schema = z.object({
  scriptId: z.string().min(1),
  options: z
    .object({
      generatePrompts: z.boolean().optional().default(true),
      generateStoryboard: z.boolean().optional().default(true),
      artStyle: z.string().optional(),
    })
    .optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = Schema.safeParse(body);
  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "请求参数无效。" } },
      { status: 400 }
    );
  }

  const { scriptId, options } = validation.data;
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { project: true },
  });

  if (!script) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "剧本不存在。" } },
      { status: 404 }
    );
  }

  const artStyle = options?.artStyle ?? script.project.visualStyle ?? "国漫";
  let usedFallback = false;

  try {
    await prisma.project.update({
      where: { id: script.projectId },
      data: { status: "SCRIPT_ANALYZING" },
    });
    await prisma.script.update({
      where: { id: scriptId },
      data: { analysisStatus: "ANALYZING" },
    });

    let parsed;
    try {
      parsed = await parseScript(script.content, {
        generatePrompts: options?.generatePrompts ?? true,
        generateStoryboard: options?.generateStoryboard ?? true,
        artStyle,
        genre: script.project.genre ?? "漫剧",
        aspectRatio: script.project.aspectRatio ?? "9:16",
        targetDuration: script.project.targetDuration ?? 180,
      });
    } catch (error) {
      usedFallback = true;
      parsed = fallbackAnalyzeScript(script.content);
      console.warn("DeepSeek unavailable, using local fallback analysis:", error);
    }

    await prisma.script.update({
      where: { id: scriptId },
      data: {
        parsedData: toJsonValue(parsed),
        analysisStatus: "COMPLETED",
        normalizedText: script.content.trim(),
      },
    });

    await prisma.project.update({
      where: { id: script.projectId },
      data: { status: "BIBLE_GENERATING" },
    });

    await prisma.$transaction([
      prisma.characterBible.deleteMany({ where: { projectId: script.projectId, scriptId } }),
      prisma.propBible.deleteMany({ where: { projectId: script.projectId, scriptId } }),
      prisma.worldBible.deleteMany({ where: { projectId: script.projectId, scriptId } }),
      prisma.storyboardShot.deleteMany({ where: { projectId: script.projectId, scriptId } }),
    ]);

    const characterResults = usedFallback
      ? parsed.characters.map((character) => ({
          bible: {
            ...character,
            displayName: character.name,
            imagePrompt: [artStyle, character.appearance, character.description]
              .filter(Boolean)
              .join(", "),
            negativePrompt: "low quality, blurry, inconsistent face",
          },
          consistencyNotes: character.appearance,
        }))
      : await batchGenerateCharacterBibles(parsed.characters, artStyle);

    const createdCharacters = [];
    for (const result of characterResults) {
      const characterId = await ensureUniqueCharacterId(
        script.projectId,
        result.bible.name ?? "角色"
      );
      const character = await prisma.characterBible.create({
        data: {
          projectId: script.projectId,
          scriptId,
          characterId,
          name: result.bible.name ?? "未命名角色",
          displayName: result.bible.displayName,
          roleType: result.bible.roleType,
          description: result.bible.description,
          appearance: result.bible.appearance,
          personality: result.bible.personality,
          background: result.bible.background,
          imagePrompt: result.bible.imagePrompt,
          negativePrompt: result.bible.negativePrompt,
          aiCompletedFields: toJsonValue(["description", "appearance", "imagePrompt"]),
        },
      });
      createdCharacters.push(character);
    }

    const propResults = usedFallback
      ? parsed.props.map((prop) => ({
          bible: {
            ...prop,
            imagePrompt: [artStyle, prop.appearance, prop.description].filter(Boolean).join(", "),
            negativePrompt: "low quality, blurry, distorted object",
          },
        }))
      : await batchGeneratePropBibles(parsed.props, artStyle);

    const createdProps = [];
    for (const result of propResults) {
      const propId = await ensureUniquePropId(script.projectId, result.bible.name ?? "道具");
      const prop = await prisma.propBible.create({
        data: {
          projectId: script.projectId,
          scriptId,
          propId,
          name: result.bible.name ?? "未命名道具",
          category: result.bible.category,
          description: result.bible.description,
          appearance: result.bible.appearance,
          significance: result.bible.significance,
          imagePrompt: result.bible.imagePrompt,
          negativePrompt: result.bible.negativePrompt,
          aiCompletedFields: toJsonValue(["description", "appearance", "imagePrompt"]),
        },
      });
      createdProps.push(prop);
    }

    const worldResults = usedFallback
      ? parsed.worlds.map((world) => ({
          bible: {
            ...world,
            imagePrompt: [artStyle, world.location, world.description, world.atmosphere]
              .filter(Boolean)
              .join(", "),
            negativePrompt: "low quality, blurry, empty background",
          },
        }))
      : await batchGenerateWorldBibles(parsed.worlds, artStyle);

    const createdWorlds: WorldBible[] = [];
    for (const result of worldResults) {
      const sceneId = await ensureUniqueSceneId(script.projectId, result.bible.name ?? "场景");
      const world = await prisma.worldBible.create({
        data: {
          projectId: script.projectId,
          scriptId,
          sceneId,
          name: result.bible.name ?? "未命名场景",
          description: result.bible.description,
          setting: result.bible.setting,
          atmosphere: result.bible.atmosphere,
          timePeriod: result.bible.timePeriod,
          location: result.bible.location,
          imagePrompt: result.bible.imagePrompt,
          negativePrompt: result.bible.negativePrompt,
          aiCompletedFields: toJsonValue(["description", "imagePrompt"]),
        },
      });
      createdWorlds.push(world);
    }

    await prisma.consistencyPrompt.deleteMany({ where: { projectId: script.projectId } });
    const consistencyPrompts = await generateConsistencyPrompts({
      projectName: script.project.name,
      artStyle,
      characters: createdCharacters.map((character) => ({
        name: character.displayName ?? character.name,
        appearance: character.appearance ?? "",
      })),
    });
    for (const prompt of consistencyPrompts) {
      await prisma.consistencyPrompt.create({
        data: {
          projectId: script.projectId,
          name: prompt.name,
          promptType: (prompt.promptType ?? "CUSTOM") as "CUSTOM",
          description: prompt.description,
          content: prompt.content,
          tags: prompt.tags ? toJsonValue(prompt.tags) : undefined,
        },
      });
    }

    let shotNumber = 0;
    for (const scene of parsed.scenes) {
      let world =
        createdWorlds.find((item) => item.name === scene.location || item.location === scene.location) ??
        null;

      if (!world) {
        const sceneId = await ensureUniqueSceneId(script.projectId, scene.location);
        world = await prisma.worldBible.create({
          data: {
            projectId: script.projectId,
            scriptId,
            sceneId,
            name: scene.location || `场景 ${scene.sceneNumber}`,
            description: scene.description,
            atmosphere: artStyle,
            imagePrompt: [artStyle, scene.location, scene.description].filter(Boolean).join(", "),
          },
        });
        createdWorlds.push(world);
      }

      for (const shot of scene.shots) {
        shotNumber += 1;
        await prisma.storyboardShot.create({
          data: {
            projectId: script.projectId,
            scriptId,
            shotNumber,
            sceneNumber: scene.sceneNumber,
            worldBibleId: world.id,
            description: shot.description,
            action: shot.description,
            dialogue: shot.dialogue,
            subtitle: shot.dialogue || shot.description,
            voiceText: shot.dialogue,
            dialogueEmotion: normalizeEmotion(shot.dialogueEmotion),
            camera: shot.camera,
            cameraAngle: shot.cameraAngle,
            lighting: shot.lighting,
            duration: shot.duration,
            imagePrompt: [artStyle, world.imagePrompt, shot.description, shot.camera, shot.cameraAngle]
              .filter(Boolean)
              .join(", "),
            negativePrompt: "low quality, blurry, bad anatomy, watermark, text",
            status: "PROMPT_READY",
          },
        });
      }
    }

    await prisma.project.update({
      where: { id: script.projectId },
      data: { status: "STORYBOARD_GENERATED" },
    });

    return NextResponse.json({
      success: true,
      data: {
        scriptId,
        fallback: usedFallback,
        generated: {
          characters: createdCharacters.length,
          props: createdProps.length,
          worlds: createdWorlds.length,
          shots: shotNumber,
        },
        message: usedFallback
          ? "DeepSeek 暂时不可用，已使用本地兜底生成设定和分镜。"
          : "AI 分析完成。",
      },
    });
  } catch (error) {
    console.error("Analyze failed:", error);
    await prisma.script.update({
      where: { id: scriptId },
      data: { analysisStatus: "FAILED" },
    });
    await prisma.project.update({
      where: { id: script.projectId },
      data: { status: "DRAFT" },
    });
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "剧本分析失败。" } },
      { status: 500 }
    );
  }
}

function normalizeEmotion(value: string) {
  const upper = value?.toUpperCase?.() ?? "NEUTRAL";
  const allowed = [
    "NEUTRAL",
    "HAPPY",
    "SAD",
    "ANGRY",
    "SURPRISED",
    "FEARFUL",
    "DISGUSTED",
    "EXCITED",
    "WORRIED",
    "CONFUSED",
  ];
  return allowed.includes(upper) ? (upper as "NEUTRAL") : "NEUTRAL";
}
