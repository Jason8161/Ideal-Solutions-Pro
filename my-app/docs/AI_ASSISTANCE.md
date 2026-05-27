# Ideal Solutions AI Assistance

## Feature goal

In-app AI chat for construction contractors, trade businesses, and serious DIY: estimating, material lists, building/code guidance, job planning, troubleshooting, service-call notes, customer-message drafting, and general business help.

## Home screen

- **Route:** `/ai-assistance`
- **Tile label:** Ideal Solutions AI Assistance
- **Subtitle:** Estimates, materials, codes & jobsite help
- **Icon (text-only mode):** `robot-industrial` (Material Community Icons)
- **Bundled tile art:** Add `assets/home-buttons/home-ai-assistance.png` and set `image` on the menu item when `HOME_MENU_SHOW_TILE_IMAGES` is enabled again.

## Mobile app

| File | Purpose |
|------|---------|
| `lib/homeMenuItems.ts` | Home tile definition |
| `app/ai-assistance.tsx` | Chat UI |
| `lib/aiAssistanceClient.ts` | `POST /api/ai-assistance` client |
| `lib/aiAssistanceTypes.ts` | Types and quick prompts |

Uses `EXPO_PUBLIC_PRICING_API_URL` (same host as pricing-backend).

## Backend (security)

**Do not** put `OPENAI_API_KEY` (or any provider key) in the Expo app.

| File | Purpose |
|------|---------|
| `pricing-backend/src/routes/aiAssistanceRoutes.ts` | `POST /api/ai-assistance` |
| `pricing-backend/src/ai/systemPrompt.ts` | Contractor-focused system prompt |

### Request

```http
POST /api/ai-assistance
Content-Type: application/json
```

```json
{
  "message": "string",
  "chatHistory": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ],
  "userContext": {
    "companyName": "optional",
    "trade": "optional"
  }
}
```

### Response

```json
{
  "reply": "string"
}
```

### Server setup

1. `pricing-backend/.env`: `OPENAI_API_KEY=sk-...` (optional `OPENAI_MODEL=gpt-4o-mini`)
2. Optional: `AI_ASSISTANCE_TIMEOUT_MS=55000` (OpenAI call), `AI_ASSISTANCE_MAX_TOKENS=1024`
3. `npm run dev` in `pricing-backend` — server must stay running while you chat
4. `my-app/.env`: `EXPO_PUBLIC_PRICING_API_URL=http://<LAN-IP>:3001` (not `localhost` on a physical phone)
5. Restart Expo (`npx expo start -c`)

### If requests time out

- Confirm `pricing-backend` console shows `[ai-assistance] ok` after a question (not hanging).
- From the PC running the API, open https://api.openai.com in a browser or check firewall allows outbound HTTPS.
- Use your PC’s **LAN IP** in `EXPO_PUBLIC_PRICING_API_URL`, same as for Materials search.
- Try a **short** question first; long chats are trimmed to the last 20 messages automatically.

## Assistant behavior

- Practical, field-friendly answers; safety and code-conscious.
- Building/code (including NEC for electrical trades): educational only; remind users to verify with local AHJ and adopted codes.
- Estimates: ask for missing scope when needed, still offer a useful starting point.

## Photo to estimate

| File | Purpose |
|------|---------|
| `app/job-folder/estimates/photo-to-estimate.tsx` | Upload photos, AI draft estimate |
| `lib/photoToEstimateClient.ts` | `POST /api/ai-estimate-from-photo` |
| `pricing-backend/src/routes/photoEstimateRoutes.ts` | OpenAI vision + JSON estimate |

Uses the same `EXPO_PUBLIC_PRICING_API_URL` and `OPENAI_API_KEY` as AI Assistance. Counts toward AI usage limits.

## Future upgrades

- Photo upload in AI Assistance chat for troubleshooting
- Paste material lists → organized estimates
- Connect to saved material lists in the app
- Supplier pricing integration
- Save conversations per job/customer
- Voice-to-text for field use
- Rugged metallic home button asset matching other tiles
- Rate limiting / auth on `/api/ai-assistance`
- Streaming responses in the chat UI
