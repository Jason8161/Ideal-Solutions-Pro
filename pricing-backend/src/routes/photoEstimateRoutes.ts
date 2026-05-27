import { Router, type Request, type Response } from "express";

import { PHOTO_ESTIMATE_SYSTEM_PROMPT } from "../ai/photoEstimatePrompt";
import { fetchWithTimeout, getAiOpenAiTimeoutMs, isFetchTimeoutError } from "../net/fetchWithTimeout";

type IncomingImage = {
  base64?: unknown;
  mimeType?: unknown;
};

const MAX_IMAGES = 4;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_NOTES_LENGTH = 2_000;

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"]);

function normalizeMime(mime: string): string {
  const lower = mime.toLowerCase().trim();
  if (lower === "image/jpg") return "image/jpeg";
  return lower;
}

function parseImages(body: unknown): { base64: string; mimeType: string }[] | null {
  const raw = body && typeof body === "object" && "images" in body ? (body as { images: unknown }).images : null;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_IMAGES) return null;

  const out: { base64: string; mimeType: string }[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") return null;
    const row = item as IncomingImage;
    if (typeof row.base64 !== "string" || !row.base64.trim()) return null;
    const mimeType =
      typeof row.mimeType === "string" && row.mimeType.trim()
        ? normalizeMime(row.mimeType)
        : "image/jpeg";
    if (!ALLOWED_MIME.has(mimeType)) return null;

    const cleaned = row.base64.replace(/\s/g, "");
    const approxBytes = Math.floor((cleaned.length * 3) / 4);
    if (approxBytes > MAX_IMAGE_BYTES) return null;

    out.push({ base64: cleaned, mimeType });
  }
  return out;
}

function buildUserText(notes: string, userContext?: Record<string, unknown>): string {
  const parts: string[] = [
    "Analyze the attached job photo(s) and return the estimate JSON described in your instructions.",
  ];
  if (userContext && typeof userContext === "object") {
    if (typeof userContext.companyName === "string" && userContext.companyName.trim()) {
      parts.push(`Company: ${userContext.companyName.trim()}`);
    }
    if (typeof userContext.trade === "string" && userContext.trade.trim()) {
      parts.push(`Trade / business type: ${userContext.trade.trim()}`);
    }
  }
  if (notes.trim()) {
    parts.push(`Additional notes from contractor:\n${notes.trim()}`);
  }
  return parts.join("\n\n");
}

function visionModel(): string {
  const configured = (process.env.OPENAI_VISION_MODEL ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim();
  return configured || "gpt-4o-mini";
}

export function createPhotoEstimateRouter(): Router {
  const router = Router();

  router.post("/ai-estimate-from-photo", async (req: Request, res: Response) => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          "Photo estimate is not configured on this server. Set OPENAI_API_KEY in pricing-backend/.env and restart.",
      });
      return;
    }

    const images = parseImages(req.body);
    if (!images) {
      res.status(400).json({ error: "images is required (1–4 items with base64 and mimeType)." });
      return;
    }

    const notes = typeof req.body?.notes === "string" ? req.body.notes.trim() : "";
    if (notes.length > MAX_NOTES_LENGTH) {
      res.status(400).json({ error: "notes is too long." });
      return;
    }

    const userContext =
      req.body?.userContext && typeof req.body.userContext === "object" && !Array.isArray(req.body.userContext)
        ? (req.body.userContext as Record<string, unknown>)
        : undefined;

    const model = visionModel();
    const maxTokens = Math.min(
      Math.max(Number(process.env.AI_PHOTO_ESTIMATE_MAX_TOKENS ?? 2048) || 2048, 512),
      4096,
    );
    const timeoutMs = getAiOpenAiTimeoutMs();

    const userContent: Array<
      | { type: "text"; text: string }
      | { type: "image_url"; image_url: { url: string; detail: "low" | "high" | "auto" } }
    > = [{ type: "text", text: buildUserText(notes, userContext) }];

    for (const img of images) {
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:${img.mimeType};base64,${img.base64}`,
          detail: images.length > 2 ? "low" : "high",
        },
      });
    }

    const started = Date.now();
    try {
      const openAiRes = await fetchWithTimeout(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: PHOTO_ESTIMATE_SYSTEM_PROMPT },
              { role: "user", content: userContent },
            ],
            temperature: 0.35,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
          }),
        },
        timeoutMs,
      );

      const raw = await openAiRes.text();
      let data: unknown;
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        res.status(502).json({ error: "Invalid response from AI provider." });
        return;
      }

      if (!openAiRes.ok) {
        const errObj =
          data && typeof data === "object" && "error" in data
            ? (data as { error?: { message?: string; type?: string; code?: string } }).error
            : undefined;
        const errMsg =
          typeof errObj?.message === "string" ? errObj.message : `AI provider error (${openAiRes.status})`;
        console.error("[ai-estimate-from-photo] OpenAI error", openAiRes.status, errMsg);
        res.status(502).json({ error: errMsg });
        return;
      }

      const choice =
        data &&
        typeof data === "object" &&
        "choices" in data &&
        Array.isArray((data as { choices: unknown[] }).choices)
          ? (data as { choices: { message?: { content?: string } }[] }).choices[0]
          : undefined;

      const content = choice?.message?.content?.trim() ?? "";
      if (!content) {
        res.status(502).json({ error: "AI returned an empty estimate." });
        return;
      }

      let estimate: unknown;
      try {
        estimate = JSON.parse(content);
      } catch {
        res.status(502).json({ error: "AI returned invalid JSON for the estimate." });
        return;
      }

      console.log(
        `[ai-estimate-from-photo] ok model=${model} images=${images.length} ms=${Date.now() - started}`,
      );
      res.json({ estimate });
    } catch (e) {
      if (isFetchTimeoutError(e)) {
        console.error(`[ai-estimate-from-photo] OpenAI timeout after ${timeoutMs}ms`);
        res.status(504).json({
          error: "Photo analysis took too long. Try fewer or smaller photos and try again.",
        });
        return;
      }
      console.error("[ai-estimate-from-photo] request failed", e);
      const msg = e instanceof Error ? e.message : "AI request failed";
      res.status(502).json({ error: msg });
    }
  });

  return router;
}
