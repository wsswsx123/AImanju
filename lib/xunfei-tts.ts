import crypto from "crypto";
import WebSocket from "ws";

export class XunfeiConfigError extends Error {}

type XunfeiTtsOptions = {
  voiceName?: string;
  speed?: number;
  volume?: number;
  pitch?: number;
};

type XunfeiFrame = {
  code?: number;
  message?: string;
  sid?: string;
  data?: {
    audio?: string;
    status?: number;
  };
};

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new XunfeiConfigError(`缺少 ${name}`);
  return value;
}

export function getXunfeiConfig() {
  return {
    appId: requiredEnv("XUNFEI_APPID"),
    apiKey: requiredEnv("XUNFEI_API_KEY"),
    apiSecret: requiredEnv("XUNFEI_API_SECRET"),
    ttsUrl: requiredEnv("XUNFEI_TTS_URL"),
    voiceName: process.env.XUNFEI_VOICE_NAME || "x4_xiaoyan",
  };
}

function buildAuthorizedUrl(ttsUrl: string, apiKey: string, apiSecret: string) {
  const url = new URL(ttsUrl);
  const date = new Date().toUTCString();
  const signatureOrigin = `host: ${url.host}\ndate: ${date}\nGET ${url.pathname} HTTP/1.1`;
  const signature = crypto
    .createHmac("sha256", apiSecret)
    .update(signatureOrigin)
    .digest("base64");
  const authorizationOrigin = `api_key="${apiKey}", algorithm="hmac-sha256", headers="host date request-line", signature="${signature}"`;
  const authorization = Buffer.from(authorizationOrigin).toString("base64");

  url.searchParams.set("authorization", authorization);
  url.searchParams.set("date", date);
  url.searchParams.set("host", url.host);
  return url.toString();
}

export async function synthesizeWithXunfeiTts(
  text: string,
  options: XunfeiTtsOptions = {}
) {
  const { appId, apiKey, apiSecret, ttsUrl, voiceName } = getXunfeiConfig();
  const authorizedUrl = buildAuthorizedUrl(ttsUrl, apiKey, apiSecret);
  const startedAt = Date.now();

  return new Promise<{ audio: Buffer; elapsedMs: number; sid?: string }>((resolve, reject) => {
    const ws = new WebSocket(authorizedUrl);
    const chunks: Buffer[] = [];
    let sid: string | undefined;
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      try {
        ws.close();
      } catch {
        // Socket may already be closed by the remote side.
      }
      if (error) {
        reject(error);
        return;
      }
      resolve({
        audio: Buffer.concat(chunks),
        elapsedMs: Date.now() - startedAt,
        sid,
      });
    };

    const timeout = setTimeout(() => {
      finish(new Error("讯飞 TTS 请求超时"));
    }, 120_000);

    ws.on("open", () => {
      ws.send(
        JSON.stringify({
          common: { app_id: appId },
          business: {
            aue: "lame",
            auf: "audio/L16;rate=16000",
            vcn: options.voiceName ?? voiceName,
            speed: options.speed ?? 50,
            volume: options.volume ?? 50,
            pitch: options.pitch ?? 50,
            tte: "UTF8",
          },
          data: {
            status: 2,
            text: Buffer.from(text, "utf8").toString("base64"),
          },
        })
      );
    });

    ws.on("message", (raw) => {
      try {
        const frame = JSON.parse(raw.toString()) as XunfeiFrame;
        sid = frame.sid ?? sid;

        if (frame.code && frame.code !== 0) {
          clearTimeout(timeout);
          finish(new Error(frame.message || `讯飞 TTS 返回错误码 ${frame.code}`));
          return;
        }

        if (frame.data?.audio) {
          chunks.push(Buffer.from(frame.data.audio, "base64"));
        }

        if (frame.data?.status === 2) {
          clearTimeout(timeout);
          if (chunks.length === 0) {
            finish(new Error("讯飞 TTS 未返回音频数据"));
            return;
          }
          finish();
        }
      } catch (error) {
        clearTimeout(timeout);
        finish(error instanceof Error ? error : new Error("解析讯飞 TTS 响应失败"));
      }
    });

    ws.on("error", (error) => {
      clearTimeout(timeout);
      finish(error);
    });

    ws.on("close", () => {
      clearTimeout(timeout);
      if (!settled && chunks.length > 0) finish();
      if (!settled) {
        finish(
          new Error(
            "讯飞 TTS 连接提前关闭，请检查 XUNFEI_APPID、XUNFEI_API_KEY、XUNFEI_API_SECRET 是否属于同一个已开通语音合成的应用。"
          )
        );
      }
    });
  });
}
