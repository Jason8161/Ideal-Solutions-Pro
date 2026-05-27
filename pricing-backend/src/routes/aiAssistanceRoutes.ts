import { Router, type Request, type Response } from "express";
import { AI_ASSISTANCE_SYSTEM_PROMPT } from "../ai/systemPrompt";
import { fetchWithTimeout, getAiOpenAiTimeoutMs, isFetchTimeoutError } from "../net/fetchWithTimeout";

type ChatRole = "user" | "assistant" | "system";

type IncomingMessage = {
  role?: unknown;
  content?: unknown;
};

const MAX_HISTORY_MESSAGES = 20;

function isValidHistory(messages: unknown): messages is { role: "user" | "assistant"; content: string }[] {
  if (!Array.isArray(messages)) return false;
  if (messages.length > 40) return false;
  return messages.every((m) => {
    if (!m || typeof m !== "object") return false;
    const row = m as IncomingMessage;
    const role = row.role;
    const content = row.content;
    return (
      (role === "user" || role === "assistant") &&
      typeof content === "string" &&
      content.trim().length > 0 &&
      content.length <= 12_000
    );
  });
}

function trimHistory(chatHistory: { role: "user" | "assistant"; content: string }[]): {
  role: "user" | "assistant";
  content: string;
}[] {
  if (chatHistory.length <= MAX_HISTORY_MESSAGES) return chatHistory;
  return chatHistory.slice(-MAX_HISTORY_MESSAGES);
}

function buildOpenAiMessages(
  message: string,
  chatHistory: { role: "user" | "assistant"; content: string }[],
  userContext?: Record<string, unknown>,
): { role: ChatRole; content: string }[] {
  let system = AI_ASSISTANCE_SYSTEM_PROMPT;
  if (userContext && typeof userContext === "object") {
    const parts: string[] = [];
    if (typeof userContext.companyName === "string" && userContext.companyName.trim()) {
      parts.push(`Company: ${userContext.companyName.trim()}`);
    }
    if (typeof userContext.trade === "string" && userContext.trade.trim()) {
      parts.push(`Trade: ${userContext.trade.trim()}`);
    }
    if (parts.length > 0) {
      system += `\n\nUser context:\n${parts.join("\n")}`;
    }
  }

  const out: { role: ChatRole; content: string }[] = [{ role: "system", content: system }];
  for (const m of trimHistory(chatHistory)) {
    out.push({ role: m.role, content: m.content.trim() });
  }
  out.push({ role: "user", content: message.trim() });
  return out;
}

export function createAiAssistanceRouter(): Router {
  const router = Router();

  router.post("/ai-assistance", async (req: Request, res: Response) => {
    const apiKey = process.env.OPENAI_API_KEY?.trim();
    if (!apiKey) {
      res.status(503).json({
        error:
          "AI assistance is not configured on this server. Set OPENAI_API_KEY in pricing-backend/.env and restart.",
      });
      return;
    }

    const message = typeof req.body?.message === "string" ? req.body.message.trim() : "";
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    if (message.length > 8_000) {
      res.status(400).json({ error: "message is too long" });
      return;
    }

    const historyRaw = req.body?.chatHistory;
    const chatHistory = isValidHistory(historyRaw) ? historyRaw : [];

    const userContext =
      req.body?.userContext && typeof req.body.userContext === "object" && !Array.isArray(req.body.userContext)
        ? (req.body.userContext as Record<string, unknown>)
        : undefined;

    const model = (process.env.OPENAI_MODEL ?? "gpt-4o-mini").trim();
    const maxTokens = Math.min(
      Math.max(Number(process.env.AI_ASSISTANCE_MAX_TOKENS ?? 1024) || 1024, 256),
      2048,
    );
    const messages = buildOpenAiMessages(message, chatHistory, userContext);
    const timeoutMs = getAiOpenAiTimeoutMs();

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
            messages,
            temperature: 0.4,
            max_tokens: maxTokens,
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
        const errType = typeof errObj?.type === "string" ? errObj.type : "";
        const errCode = typeof errObj?.code === "string" ? errObj.code : "";
        const quotaHit =
          openAiRes.status === 429 ||
          errCode === "insufficient_quota" ||
          /quota|billing|insufficient/i.test(`${errType} ${errCode} ${errMsg}`);
        const userError = quotaHit
          ? "OpenAI account has no available quota. Add a payment method or credits at https://platform.openai.com/account/billing — then try again."
          : errMsg;
        console.error("[ai-assistance] OpenAI error", openAiRes.status, errMsg);
        res.status(quotaHit ? 402 : 502).json({ error: userError });
        return;
      }

      const choice =
        data &&
        typeof data === "object" &&
        "choices" in data &&
        Array.isArray((data as { choices: unknown[] }).choices)
          ? (data as { choices: { message?: { content?: string } }[] }).choices[0]
          : undefined;

      const reply = choice?.message?.content?.trim() ?? "";
      if (!reply) {
        res.status(502).json({ error: "AI returned an empty reply." });
        return;
      }

      console.log(`[ai-assistance] ok model=${model} ms=${Date.now() - started}`);
      res.json({ reply });
    } catch (e) {
      if (isFetchTimeoutError(e)) {
        console.error(`[ai-assistance] OpenAI timeout after ${timeoutMs}ms`);
        res.status(504).json({
          error:
            "AI took too long to respond. Try a shorter question, wait a moment, and try again. Check that this PC can reach api.openai.com.",
        });
        return;
      }
      console.error("[ai-assistance] request failed", e);
      const msg = e instanceof Error ? e.message : "AI request failed";
      res.status(502).json({ error: msg });
    }
  });

  return router;
}
