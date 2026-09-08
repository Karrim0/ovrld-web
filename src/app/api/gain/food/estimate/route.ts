import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const MAX_TEXT_LENGTH = 700;

const estimateSchema = z.object({
  recognized: z.boolean(),
  label: z.string().max(80),
  caloriesKcal: z.number().int().min(0).max(5000),
  proteinGrams: z.number().min(0).max(300),
  confidence: z.enum(["low", "medium", "high"]),
  items: z.array(z.object({
    name: z.string().max(100),
    quantityText: z.string().max(100),
    caloriesKcal: z.number().int().min(0).max(5000),
    proteinGrams: z.number().min(0).max(300),
  })).max(18),
  assumptions: z.array(z.string().max(180)).max(5),
});

const ESTIMATE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["recognized", "label", "caloriesKcal", "proteinGrams", "confidence", "items", "assumptions"],
  properties: {
    recognized: { type: "boolean" },
    label: { type: "string", maxLength: 80 },
    caloriesKcal: { type: "integer", minimum: 0, maximum: 5000 },
    proteinGrams: { type: "number", minimum: 0, maximum: 300 },
    confidence: { type: "string", enum: ["low", "medium", "high"] },
    items: {
      type: "array",
      maxItems: 18,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name", "quantityText", "caloriesKcal", "proteinGrams"],
        properties: {
          name: { type: "string", maxLength: 100 },
          quantityText: { type: "string", maxLength: 100 },
          caloriesKcal: { type: "integer", minimum: 0, maximum: 5000 },
          proteinGrams: { type: "number", minimum: 0, maximum: 300 },
        },
      },
    },
    assumptions: {
      type: "array",
      maxItems: 5,
      items: { type: "string", maxLength: 180 },
    },
  },
} as const;

function outputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const response = payload as { output_text?: unknown; output?: unknown };
  if (typeof response.output_text === "string") return response.output_text;
  if (!Array.isArray(response.output)) return null;
  for (const item of response.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string") {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: userData, error: authError } = await supabase.auth.getUser();
  if (authError || !userData.user) {
    return NextResponse.json({ error: "لازم تسجّلي دخول الأول." }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (text.length < 3) {
    return NextResponse.json({ error: "اكتبي أكلتي إيه الأول." }, { status: 400 });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return NextResponse.json({ error: "خلي وصف الأكل أقصر شوية — 700 حرف أو أقل." }, { status: 413 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      error: "التقدير الذكي مش متوصل بمفتاح AI على السيرفر. تقدري تدخلي الأرقام يدويًا عادي.",
      code: "AI_FOOD_NOT_CONFIGURED",
    }, { status: 503 });
  }

  const instructions = [
    "You estimate calories and protein for OVRLD Gain Mode food logging.",
    "Understand Egyptian Arabic, Arabic and English food descriptions.",
    "Use the user's explicit quantities, brands and cooking method when provided.",
    "When a quantity or recipe is ambiguous, use a conservative common serving estimate and state the assumption briefly.",
    "Never pretend the estimate is exact. Confidence reflects how specific the user's description is.",
    "Only estimate food that was actually described; do not invent extra ingredients.",
    "If the text is not recognizable as food intake, set recognized=false, totals to 0, and items empty.",
    "The label should be a short useful meal name in the same language as the user when possible.",
    "Return calories in kcal and protein in grams. Totals must approximately match the item sum.",
  ].join(" ");

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.OPENAI_FOOD_LOG_MODEL ?? process.env.OPENAI_PLAN_IMPORT_MODEL ?? "gpt-5.6-luna",
      input: [{
        role: "user",
        content: [
          { type: "input_text", text: instructions },
          { type: "input_text", text: `Food log: ${text}` },
        ],
      }],
      text: { format: { type: "json_schema", name: "ovrld_food_estimate", strict: true, schema: ESTIMATE_JSON_SCHEMA } },
    }),
  });

  const rawResponse = await openAiResponse.json().catch(() => null);
  if (!openAiResponse.ok) {
    const providerError = rawResponse && typeof rawResponse === "object"
      ? (rawResponse as { error?: { message?: string; code?: string } }).error
      : undefined;
    const quotaProblem = providerError?.code === "insufficient_quota" || /quota|billing/i.test(providerError?.message ?? "");
    return NextResponse.json({
      error: quotaProblem
        ? "التقدير الذكي مش متاح دلوقتي بسبب رصيد الـAI. دخّلي الأرقام يدويًا مؤقتًا."
        : "معرفناش نقدّر الأكل دلوقتي. جرّبي وصف أوضح أو دخّلي الأرقام يدويًا.",
      code: quotaProblem ? "AI_FOOD_QUOTA_UNAVAILABLE" : "AI_FOOD_FAILED",
    }, { status: 422 });
  }

  const textOutput = outputText(rawResponse);
  if (!textOutput) {
    return NextResponse.json({ error: "معرفناش نفهم وصف الأكل. اكتبي الكمية والأصناف بشكل أوضح." }, { status: 422 });
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(textOutput);
  } catch {
    return NextResponse.json({ error: "التقدير رجع بشكل غير واضح. جرّبي تاني أو دخّلي الأرقام يدويًا." }, { status: 422 });
  }

  const parsed = estimateSchema.safeParse(parsedJson);
  if (!parsed.success || !parsed.data.recognized || parsed.data.items.length === 0) {
    return NextResponse.json({ error: "مش واضح إن الوصف فيه أكل اتاكل فعلًا. اكتبي الأصناف والكميات بشكل أبسط." }, { status: 422 });
  }

  const estimate = {
    ...parsed.data,
    proteinGrams: Math.round(parsed.data.proteinGrams * 10) / 10,
    items: parsed.data.items.map((item) => ({
      ...item,
      proteinGrams: Math.round(item.proteinGrams * 10) / 10,
    })),
  };

  return NextResponse.json({
    estimate,
    message: "ده تقدير تقريبي. راجعي الكمية والأرقام قبل التسجيل.",
  });
}
