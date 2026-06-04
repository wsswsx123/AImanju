export class DoubaoConfigError extends Error {}

type ArkImage = {
  url?: string;
  b64_json?: string;
};

type ArkImageResponse = {
  data?: ArkImage[];
  error?: {
    message?: string;
    code?: string;
  };
};

type ArkVideoTaskResponse = {
  id?: string;
  task_id?: string;
  status?: string;
  error?: {
    message?: string;
    code?: string;
  };
};

function getArkApiBaseUrl() {
  const baseUrl = process.env.ARK_BASE_URL;
  if (!baseUrl) return null;
  return baseUrl.endsWith("/api/v3") ? baseUrl : `${baseUrl.replace(/\/$/, "")}/api/v3`;
}

function getImageGenUrl() {
  const imageGenUrl = process.env.ARK_IMAGE_GEN_URL;
  if (imageGenUrl) return imageGenUrl;

  const apiBaseUrl = getArkApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}/images/generations` : null;
}

function getVideoTaskUrl() {
  const videoGenUrl = process.env.ARK_VIDEO_GEN_URL;
  if (videoGenUrl) return videoGenUrl;

  const apiBaseUrl = getArkApiBaseUrl();
  return apiBaseUrl ? `${apiBaseUrl}/contents/generations/tasks` : null;
}

function requiredArkApiKey() {
  const apiKey = process.env.ARK_API_KEY;
  if (!apiKey) throw new DoubaoConfigError("缺少 ARK_API_KEY。");
  return apiKey;
}

export function getDoubaoImageModel() {
  const model = process.env.ARK_IMAGE_MODEL ?? process.env.IMAGE_MODEL;
  if (!model) {
    throw new DoubaoConfigError("缺少图片模型配置，请配置 IMAGE_MODEL 或 ARK_IMAGE_MODEL。");
  }
  return model.trim();
}

export function getDoubaoVideoModel() {
  const model = process.env.ARK_VIDEO_MODEL ?? process.env.VIDEO_MODEL;
  if (!model) {
    throw new DoubaoConfigError("缺少视频模型配置，请配置 VIDEO_MODEL 或 ARK_VIDEO_MODEL。");
  }
  return model.trim();
}

export async function generateImageWithDoubao(prompt: string, size = "2K") {
  const apiKey = requiredArkApiKey();
  const imageGenUrl = getImageGenUrl();
  const model = getDoubaoImageModel();

  if (!imageGenUrl) {
    throw new DoubaoConfigError("缺少 ARK_IMAGE_GEN_URL 或 ARK_BASE_URL。");
  }

  const response = await fetch(imageGenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      prompt,
      size,
      response_format: "url",
      watermark: false,
      stream: false,
      sequential_image_generation: "disabled",
    }),
  });

  const result = (await response.json().catch(() => ({}))) as ArkImageResponse;

  if (!response.ok) {
    throw new Error(result.error?.message || `豆包图片生成失败：HTTP ${response.status}`);
  }

  const image = result.data?.[0];
  const url = image?.url;
  const base64 = image?.b64_json;

  if (!url && !base64) {
    throw new Error("豆包图片模型没有返回图片 URL 或 base64。");
  }

  return {
    imageUrl: url ?? null,
    base64: base64 ?? null,
    model,
  };
}

export async function createVideoTaskWithDoubao({
  prompt,
  ratio = "9:16",
  duration = 5,
  resolution = "720p",
}: {
  prompt: string;
  ratio?: string;
  duration?: number;
  resolution?: "480p" | "720p" | "1080p";
}) {
  const apiKey = requiredArkApiKey();
  const videoTaskUrl = getVideoTaskUrl();
  const model = getDoubaoVideoModel();

  if (!videoTaskUrl) {
    throw new DoubaoConfigError("缺少 ARK_VIDEO_GEN_URL 或 ARK_BASE_URL。");
  }

  const response = await fetch(videoTaskUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      content: [{ type: "text", text: prompt.slice(0, 800) }],
      ratio,
      duration: Math.min(Math.max(Math.round(duration), 2), 12),
      resolution,
      watermark: false,
    }),
  });

  const result = (await response.json().catch(() => ({}))) as ArkVideoTaskResponse;

  if (!response.ok) {
    throw new Error(result.error?.message || `豆包视频任务创建失败：HTTP ${response.status}`);
  }

  const taskId = result.id ?? result.task_id;
  if (!taskId) throw new Error("豆包视频接口没有返回任务 ID。");

  return {
    taskId,
    status: result.status ?? "submitted",
    model,
  };
}
