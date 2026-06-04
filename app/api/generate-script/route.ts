import { NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";
import OpenAI from "openai";
import { fallbackNovelToScript } from "@/lib/novel-script";

const Schema = z.object({
  title: z.string().min(1).max(300),
  novelText: z.string().min(20),
  style: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const body = await request.json();
  const validation = Schema.safeParse(body);

  if (!validation.success) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: "请提供小说标题和原文。" } },
      { status: 400 }
    );
  }

  const { title, novelText, style } = validation.data;

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({
      success: true,
      data: {
        title,
        content: fallbackNovelToScript(novelText, title),
        provider: "local-fallback",
        warning: "未配置 DeepSeek，已使用本地规则生成剧本草稿。",
      },
    });
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com",
      timeout: 120_000,
      maxRetries: 1,
    });

    const response = await client.chat.completions.create({
      model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
      temperature: 0.45,
      max_tokens: 8192,
      messages: [
        {
          role: "system",
          content: [
            "你是专业漫画短剧编剧，请把小说原文改写为适合 AI 漫剧生产线的分场剧本。",
            "输出纯文本，不要 Markdown。",
            "每场必须包含：场景、角色、画面、动作、台词或旁白、分镜提示。",
            "保留原文核心剧情，不要随意改结局。",
            `目标风格：${style || "国漫短剧"}`,
          ].join("\n"),
        },
        {
          role: "user",
          content: `标题：${title}\n\n小说原文：\n${novelText.slice(0, 24000)}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) throw new Error("DeepSeek 没有返回剧本内容。");

    return NextResponse.json({
      success: true,
      data: { title, content, provider: "deepseek" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "DeepSeek 生成失败。";
    return NextResponse.json({
      success: true,
      data: {
        title,
        content: fallbackNovelToScript(novelText, title),
        provider: "local-fallback",
        warning: `DeepSeek 暂时不可用（${message}），已使用本地规则生成剧本草稿。`,
      },
    });
  }
}
