import type { ScriptParsedData } from "@/types";

export function fallbackNovelToScript(novelText: string, title = "小说改编剧本") {
  const scenes = splitText(novelText).slice(0, 12);

  return [
    `剧本标题：${title}`,
    "剧本类型：小说原文自动改编",
    "",
    ...scenes.flatMap((paragraph, index) => {
      const sceneNumber = index + 1;
      const dialogue = extractDialogue(paragraph);
      const narration = paragraph
        .replace(/[“"].+?[”"]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 260);

      return [
        `场景${sceneNumber}：待确认地点 - 连续时间`,
        "角色：待 AI 分析",
        "",
        `[画面] ${narration || paragraph.slice(0, 260)}`,
        "[动作] 根据原文情绪和事件推进，拆分人物走位、表情和关键动作。",
        dialogue ? `[台词]\n${dialogue}` : "[旁白] 保留原文关键叙述，后续可改为角色台词。",
        "[分镜提示] 中景开场，跟随人物动作推进，突出本段冲突与情绪变化。",
        "",
      ];
    }),
  ].join("\n");
}

export function fallbackAnalyzeScript(scriptText: string): ScriptParsedData {
  const scenes = splitText(scriptText).slice(0, 10);
  const characterNames = inferNames(scriptText);

  return {
    characters: characterNames.map((name, index) => ({
      name,
      roleType: index === 0 ? "protagonist" : "supporting",
      description: `${name} 是从文本中识别出的角色，需要后续确认设定。`,
      appearance: `${name} 的外观待确认，保持同一发型、服装和面部特征。`,
      personality: "根据剧情表现补充性格。",
      background: "根据原文剧情补充人物背景。",
    })),
    props: inferProps(scriptText).map((name) => ({
      name,
      category: "artifact",
      description: `${name} 是剧情中的关键物品。`,
      appearance: `${name} 的材质、颜色和形状待确认。`,
      significance: "用于推动剧情或强化角色关系。",
    })),
    worlds: scenes.map((paragraph, index) => ({
      name: `场景 ${index + 1}`,
      description: paragraph.slice(0, 220),
      setting: "根据原文自动拆分的场景。",
      atmosphere: "戏剧化、适合漫剧镜头表现。",
      timePeriod: "连续时间",
      location: `场景 ${index + 1}`,
    })),
    scenes: scenes.map((paragraph, index) => {
      const dialogue = extractDialogue(paragraph);
      return {
        sceneNumber: index + 1,
        location: `场景 ${index + 1}`,
        description: paragraph.slice(0, 260),
        shots: [
          {
            shotNumber: index * 2 + 1,
            description: `建立场景：${paragraph.slice(0, 140)}`,
            dialogue: "",
            dialogueEmotion: "NEUTRAL",
            camera: "远景",
            cameraAngle: "平视",
            lighting: "自然光",
            duration: 3,
          },
          {
            shotNumber: index * 2 + 2,
            description: `推进动作和情绪：${paragraph.slice(0, 180)}`,
            dialogue: dialogue || "",
            dialogueEmotion: dialogue ? "WORRIED" : "NEUTRAL",
            camera: "中景",
            cameraAngle: "轻微俯视",
            lighting: "电影感光影",
            duration: dialogue ? 4 : 3,
          },
        ],
      };
    }),
  };
}

function splitText(text: string) {
  const clean = text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean);

  if (paragraphs.length > 0) return paragraphs;

  return clean
    .split(/[。！？!?]\s*/)
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce<string[]>((chunks, sentence) => {
      const last = chunks[chunks.length - 1] ?? "";
      if (!last || last.length > 260) chunks.push(sentence);
      else chunks[chunks.length - 1] = `${last}。${sentence}`;
      return chunks;
    }, []);
}

function extractDialogue(text: string) {
  const matches = Array.from(text.matchAll(/[“"]([^”"]{2,120})[”"]/g));
  return matches
    .slice(0, 3)
    .map((match, index) => `角色${index + 1}：${match[1]}`)
    .join("\n");
}

function inferNames(text: string) {
  const matches = Array.from(text.matchAll(/(?:角色|人物|主角|少年|少女|男子|女子|老人|师父|她|他|我)(?:：|:)?([\u4e00-\u9fa5]{2,4})?/g));
  const names = matches
    .map((match) => match[1])
    .filter((name): name is string => Boolean(name));

  const unique = Array.from(new Set(names)).slice(0, 6);
  return unique.length > 0 ? unique : ["主角", "关键人物"];
}

function inferProps(text: string) {
  const candidates = ["玉佩", "长剑", "信件", "手机", "钥匙", "戒指", "令牌", "照片"];
  return candidates.filter((item) => text.includes(item)).slice(0, 6);
}
