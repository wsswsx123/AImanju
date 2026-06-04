import OpenAI from "openai";
import { z } from "zod/v4";
import type {
  CharacterBibleCreateInput,
  ConsistencyPromptCreateInput,
  PropBibleCreateInput,
  ScriptParsedData,
  WorldBibleCreateInput,
} from "@/types";

const CharacterSchema = z.object({
  name: z.string().min(1),
  roleType: z.string().min(1),
  description: z.string().default(""),
  appearance: z.string().default(""),
  personality: z.string().default(""),
  background: z.string().default(""),
});

const PropSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  description: z.string().default(""),
  appearance: z.string().default(""),
  significance: z.string().default(""),
});

const WorldSchema = z.object({
  name: z.string().min(1),
  description: z.string().default(""),
  setting: z.string().default(""),
  atmosphere: z.string().default(""),
  timePeriod: z.string().default(""),
  location: z.string().default(""),
});

const ShotSchema = z.object({
  shotNumber: z.number().int().positive(),
  description: z.string().default(""),
  dialogue: z.string().default(""),
  dialogueEmotion: z.string().default("NEUTRAL"),
  camera: z.string().default("中景"),
  cameraAngle: z.string().default("平视"),
  lighting: z.string().default("自然光"),
  duration: z.number().positive().default(3),
});

const SceneSchema = z.object({
  sceneNumber: z.number().int().positive(),
  location: z.string().default("未命名场景"),
  description: z.string().default(""),
  shots: z.array(ShotSchema).default([]),
});

export const ScriptParsedDataSchema = z.object({
  characters: z.array(CharacterSchema).default([]),
  props: z.array(PropSchema).default([]),
  worlds: z.array(WorldSchema).default([]),
  scenes: z.array(SceneSchema).default([]),
});

export class DeepSeekError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status?: number,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = "DeepSeekError";
  }
}

export class DeepSeekConfigError extends DeepSeekError {
  constructor(message: string) {
    super(message, "CONFIG_ERROR");
    this.name = "DeepSeekConfigError";
  }
}

export class DeepSeekAPIError extends DeepSeekError {
  constructor(message: string, status?: number, details?: unknown) {
    super(message, "API_ERROR", status, details);
    this.name = "DeepSeekAPIError";
  }
}

export class DeepSeekValidationError extends DeepSeekError {
  constructor(message: string, details?: unknown) {
    super(message, "VALIDATION_ERROR", undefined, details);
    this.name = "DeepSeekValidationError";
  }
}

export interface DeepSeekConfig {
  apiKey: string;
  baseURL?: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
}

export interface AnalyzeScriptOptions {
  generatePrompts?: boolean;
  analyzeCharacters?: boolean;
  analyzeProps?: boolean;
  analyzeWorlds?: boolean;
  generateStoryboard?: boolean;
  targetLanguage?: string;
  artStyle?: string;
  genre?: string;
  aspectRatio?: string;
  targetDuration?: number;
}

const DEFAULT_CONFIG: Partial<DeepSeekConfig> = {
  baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
  model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  maxTokens: 8192,
  temperature: 0.35,
  timeout: 120_000,
};

const DEFAULT_ANALYZE_OPTIONS: Required<AnalyzeScriptOptions> = {
  generatePrompts: true,
  analyzeCharacters: true,
  analyzeProps: true,
  analyzeWorlds: true,
  generateStoryboard: true,
  targetLanguage: "zh",
  artStyle: "国漫",
  genre: "漫剧",
  aspectRatio: "9:16",
  targetDuration: 180,
};

let clientInstance: OpenAI | null = null;
let clientConfig: DeepSeekConfig | null = null;

export function initDeepSeekClient(config?: Partial<DeepSeekConfig>): OpenAI {
  const apiKey = config?.apiKey ?? process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new DeepSeekConfigError("缺少 DEEPSEEK_API_KEY，请先在 .env.local 中配置。");
  }

  const mergedConfig: DeepSeekConfig = { ...DEFAULT_CONFIG, ...config, apiKey };
  clientConfig = mergedConfig;
  clientInstance = new OpenAI({
    apiKey: mergedConfig.apiKey,
    baseURL: mergedConfig.baseURL,
    timeout: mergedConfig.timeout,
    maxRetries: 2,
  });
  return clientInstance;
}

export function getDeepSeekClient(): OpenAI {
  if (clientInstance) return clientInstance;
  return initDeepSeekClient();
}

export function getDeepSeekConfig(): DeepSeekConfig | null {
  return clientConfig;
}

function buildScriptAnalysisSystemPrompt(
  options: Required<AnalyzeScriptOptions>
): string {
  return [
    "你是专业的 AI 漫剧统筹、分镜导演和设定库编辑。",
    "请把用户输入的剧本或故事梗概拆解为严格 JSON，不要输出 Markdown。",
    `目标语言：${options.targetLanguage}`,
    `项目类型：${options.genre}`,
    `默认美术风格：${options.artStyle}`,
    `目标画幅：${options.aspectRatio}`,
    `目标时长：${options.targetDuration} 秒`,
    "JSON 顶层必须包含 characters、props、worlds、scenes 四个数组。",
    "characters 字段：name, roleType, description, appearance, personality, background。",
    "props 字段：name, category, description, appearance, significance。category 可用 weapon/tool/device/vehicle/artifact/accessory/other。",
    "worlds 字段：name, description, setting, atmosphere, timePeriod, location。",
    "scenes 字段：sceneNumber, location, description, shots。",
    "shots 字段：shotNumber, description, dialogue, dialogueEmotion, camera, cameraAngle, lighting, duration。",
    "分镜要适合漫剧视频制作，每个 shot 应有明确画面动作、台词/旁白、镜头景别和预计时长。",
    "不要遗漏道具、工具、武器、设备、载具、关键物品和背景场景。",
  ].join("\n");
}

async function chatJson(system: string, user: string, temperature = 0.35) {
  const client = getDeepSeekClient();
  const config = getDeepSeekConfig();
  const response = await client.chat.completions.create({
    model: config?.model ?? DEFAULT_CONFIG.model!,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature,
    max_tokens: config?.maxTokens ?? DEFAULT_CONFIG.maxTokens!,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new DeepSeekAPIError("DeepSeek 返回为空。");
  return JSON.parse(raw) as unknown;
}

export async function parseScript(
  scriptContent: string,
  options?: AnalyzeScriptOptions
): Promise<ScriptParsedData> {
  const opts = { ...DEFAULT_ANALYZE_OPTIONS, ...options };

  try {
    const parsed = await chatJson(
      buildScriptAnalysisSystemPrompt(opts),
      `请解析以下剧本：\n\n${scriptContent}`,
      opts.generatePrompts ? 0.45 : 0.25
    );
    const result = ScriptParsedDataSchema.safeParse(parsed);
    if (!result.success) {
      throw new DeepSeekValidationError("DeepSeek 返回结构不符合要求。", result.error.issues);
    }
    return result.data as ScriptParsedData;
  } catch (error) {
    if (error instanceof DeepSeekError) throw error;
    if (error instanceof OpenAI.APIError) {
      throw new DeepSeekAPIError(`DeepSeek API 错误：${error.message}`, error.status);
    }
    throw new DeepSeekError(`剧本解析失败：${(error as Error).message}`, "UNKNOWN_ERROR");
  }
}

export async function generateCharacterBible(
  character: {
    name: string;
    roleType: string;
    description: string;
    appearance: string;
    personality: string;
    background: string;
  },
  styleNotes?: string
): Promise<{
  bible: Omit<CharacterBibleCreateInput, "projectId" | "scriptId">;
  consistencyNotes: string;
}> {
  try {
    const parsed = (await chatJson(
      [
        "你是漫剧角色设定师。请返回 JSON：",
        "displayName, enhancedDescription, enhancedAppearance, enhancedPersonality, age, gender, hair, costume, voiceProfile, imagePrompt, negativePrompt, consistencyNotes。",
        "imagePrompt 要适合图像模型生成角色参考图，并保持角色外观稳定。",
        styleNotes ? `项目风格：${styleNotes}` : "",
      ].join("\n"),
      JSON.stringify(character),
      0.55
    )) as Record<string, unknown>;

    return {
      bible: {
        name: character.name,
        displayName: String(parsed.displayName ?? character.name),
        roleType: character.roleType as CharacterBibleCreateInput["roleType"],
        description: String(parsed.enhancedDescription ?? character.description),
        appearance: String(parsed.enhancedAppearance ?? character.appearance),
        personality: String(parsed.enhancedPersonality ?? character.personality),
        background: character.background,
        age: typeof parsed.age === "number" ? parsed.age : undefined,
        gender: parsed.gender ? String(parsed.gender) : undefined,
        hair: parsed.hair ? String(parsed.hair) : undefined,
        costume: parsed.costume ? String(parsed.costume) : undefined,
        voiceProfile: parsed.voiceProfile ? String(parsed.voiceProfile) : undefined,
        imagePrompt: parsed.imagePrompt ? String(parsed.imagePrompt) : character.appearance,
        negativePrompt: parsed.negativePrompt
          ? String(parsed.negativePrompt)
          : "low quality, blurry, bad anatomy, inconsistent face",
      },
      consistencyNotes: String(parsed.consistencyNotes ?? character.appearance),
    };
  } catch {
    return {
      bible: {
        name: character.name,
        displayName: character.name,
        roleType: character.roleType as CharacterBibleCreateInput["roleType"],
        description: character.description,
        appearance: character.appearance,
        personality: character.personality,
        background: character.background,
        imagePrompt: [styleNotes, character.appearance, character.description]
          .filter(Boolean)
          .join(", "),
        negativePrompt: "low quality, blurry, bad anatomy",
      },
      consistencyNotes: character.appearance,
    };
  }
}

export async function generatePropBible(
  prop: {
    name: string;
    category: string;
    description: string;
    appearance: string;
    significance: string;
  },
  styleNotes?: string
) {
  try {
    const parsed = (await chatJson(
      [
        "你是漫剧道具设定师。请返回 JSON：",
        "enhancedDescription, enhancedAppearance, propType, purpose, material, color, shape, size, imagePrompt, negativePrompt。",
        "imagePrompt 要适合生成道具参考图，突出材质、颜色、形状和用途。",
        styleNotes ? `项目风格：${styleNotes}` : "",
      ].join("\n"),
      JSON.stringify(prop),
      0.55
    )) as Record<string, unknown>;

    return {
      bible: {
        name: prop.name,
        category: prop.category as PropBibleCreateInput["category"],
        description: String(parsed.enhancedDescription ?? prop.description),
        appearance: String(parsed.enhancedAppearance ?? prop.appearance),
        significance: prop.significance,
        propType: parsed.propType ? String(parsed.propType) : prop.category,
        purpose: parsed.purpose ? String(parsed.purpose) : prop.significance,
        material: parsed.material ? String(parsed.material) : undefined,
        color: parsed.color ? String(parsed.color) : undefined,
        shape: parsed.shape ? String(parsed.shape) : undefined,
        size: parsed.size ? String(parsed.size) : undefined,
        imagePrompt: parsed.imagePrompt
          ? String(parsed.imagePrompt)
          : [styleNotes, prop.appearance, prop.description].filter(Boolean).join(", "),
        negativePrompt: parsed.negativePrompt
          ? String(parsed.negativePrompt)
          : "low quality, blurry, distorted object",
      },
    };
  } catch {
    return {
      bible: {
        name: prop.name,
        category: prop.category as PropBibleCreateInput["category"],
        description: prop.description,
        appearance: prop.appearance,
        significance: prop.significance,
        imagePrompt: [styleNotes, prop.appearance, prop.description].filter(Boolean).join(", "),
        negativePrompt: "low quality, blurry, distorted object",
      },
    };
  }
}

export async function generateWorldBible(
  world: {
    name: string;
    description: string;
    setting: string;
    atmosphere: string;
    timePeriod: string;
    location: string;
  },
  styleNotes?: string
) {
  try {
    const parsed = (await chatJson(
      [
        "你是漫剧场景和世界观设定师。请返回 JSON：",
        "enhancedDescription, sceneType, layout, colorPalette, lighting, weather, mood, keyObjects, architecture, floraAndFauna, cultureAndSociety, imagePrompt, negativePrompt。",
        "imagePrompt 要适合生成场景背景图，强调空间布局、色调、光线和氛围。",
        styleNotes ? `项目风格：${styleNotes}` : "",
      ].join("\n"),
      JSON.stringify(world),
      0.55
    )) as Record<string, unknown>;

    return {
      bible: {
        name: world.name,
        description: String(parsed.enhancedDescription ?? world.description),
        sceneType: parsed.sceneType ? String(parsed.sceneType) : undefined,
        setting: world.setting,
        layout: parsed.layout ? String(parsed.layout) : undefined,
        atmosphere: world.atmosphere,
        timePeriod: world.timePeriod,
        location: world.location,
        colorPalette: parsed.colorPalette ? String(parsed.colorPalette) : undefined,
        lighting: parsed.lighting ? String(parsed.lighting) : undefined,
        weather: parsed.weather ? String(parsed.weather) : undefined,
        mood: parsed.mood ? String(parsed.mood) : undefined,
        keyObjects: parsed.keyObjects ? String(parsed.keyObjects) : undefined,
        architecture: parsed.architecture ? String(parsed.architecture) : undefined,
        floraAndFauna: parsed.floraAndFauna ? String(parsed.floraAndFauna) : undefined,
        cultureAndSociety: parsed.cultureAndSociety
          ? String(parsed.cultureAndSociety)
          : undefined,
        imagePrompt: parsed.imagePrompt
          ? String(parsed.imagePrompt)
          : [styleNotes, world.description, world.atmosphere].filter(Boolean).join(", "),
        negativePrompt: parsed.negativePrompt
          ? String(parsed.negativePrompt)
          : "low quality, blurry, empty background",
      },
    };
  } catch {
    return {
      bible: {
        name: world.name,
        description: world.description,
        setting: world.setting,
        atmosphere: world.atmosphere,
        timePeriod: world.timePeriod,
        location: world.location,
        imagePrompt: [styleNotes, world.description, world.atmosphere].filter(Boolean).join(", "),
        negativePrompt: "low quality, blurry, empty background",
      },
    };
  }
}

export function assembleConsistencyPrompt(
  prompts: Array<{
    content: string;
    variables?: Array<{ name: string; defaultValue: string }>;
  }>,
  context?: Record<string, string>
): string {
  const ctx = context ?? {};
  return prompts
    .map((prompt) => {
      let text = prompt.content;
      for (const variable of prompt.variables ?? []) {
        const value = ctx[variable.name] ?? variable.defaultValue;
        text = text.replace(new RegExp(`\\{\\{${variable.name}\\}\\}`, "g"), value);
      }
      return text;
    })
    .join("\n\n---\n\n");
}

export async function generateConsistencyPrompts(context: {
  projectName: string;
  artStyle?: string;
  characters?: Array<{ name: string; appearance: string }>;
}): Promise<Omit<ConsistencyPromptCreateInput, "projectId">[]> {
  return [
    {
      name: "全局美术风格",
      promptType: "STYLE",
      description: "项目级统一画风、画幅、质感和镜头语言。",
      content:
        context.artStyle ??
        "high quality anime drama, consistent character design, cinematic lighting",
      tags: ["global", "style"],
    },
    ...((context.characters ?? []).map((character) => ({
      name: `角色一致性：${character.name}`,
      promptType: "CHARACTER" as const,
      description: `锁定 ${character.name} 的核心外观。`,
      content: `${character.name}: ${character.appearance}`,
      tags: ["character"],
    })) satisfies Omit<ConsistencyPromptCreateInput, "projectId">[]),
  ];
}

export async function generateShotImagePrompt(
  shot: {
    description: string;
    camera: string;
    cameraAngle: string;
    lighting: string;
  },
  characters: Array<{ name: string; appearance: string }>,
  scene?: { name: string; description: string; atmosphere: string },
  stylePrompt?: string
) {
  const positive = [
    "masterpiece, best quality",
    stylePrompt ?? "anime drama illustration",
    scene?.name,
    scene?.description,
    scene?.atmosphere,
    ...characters.map((character) => `${character.name}: ${character.appearance}`),
    shot.description,
    shot.camera,
    shot.cameraAngle,
    shot.lighting,
  ]
    .filter(Boolean)
    .join(", ");

  return {
    imagePrompt: positive,
    negativePrompt: "lowres, bad anatomy, blurry, watermark, text, worst quality",
  };
}

export async function batchGenerateCharacterBibles(
  characters: Parameters<typeof generateCharacterBible>[0][],
  styleNotes?: string,
  concurrency = 3
) {
  const results: Awaited<ReturnType<typeof generateCharacterBible>>[] = [];
  for (let index = 0; index < characters.length; index += concurrency) {
    const batch = characters.slice(index, index + concurrency);
    const settled = await Promise.allSettled(
      batch.map((character) => generateCharacterBible(character, styleNotes))
    );
    for (const result of settled) {
      if (result.status === "fulfilled") results.push(result.value);
    }
  }
  return results;
}

export async function batchGeneratePropBibles(
  props: Parameters<typeof generatePropBible>[0][],
  styleNotes?: string,
  concurrency = 3
) {
  const results: Awaited<ReturnType<typeof generatePropBible>>[] = [];
  for (let index = 0; index < props.length; index += concurrency) {
    const batch = props.slice(index, index + concurrency);
    const settled = await Promise.allSettled(
      batch.map((prop) => generatePropBible(prop, styleNotes))
    );
    for (const result of settled) {
      if (result.status === "fulfilled") results.push(result.value);
    }
  }
  return results;
}

export async function batchGenerateWorldBibles(
  worlds: Parameters<typeof generateWorldBible>[0][],
  styleNotes?: string,
  concurrency = 3
) {
  const results: Awaited<ReturnType<typeof generateWorldBible>>[] = [];
  for (let index = 0; index < worlds.length; index += concurrency) {
    const batch = worlds.slice(index, index + concurrency);
    const settled = await Promise.allSettled(
      batch.map((world) => generateWorldBible(world, styleNotes))
    );
    for (const result of settled) {
      if (result.status === "fulfilled") results.push(result.value);
    }
  }
  return results;
}
