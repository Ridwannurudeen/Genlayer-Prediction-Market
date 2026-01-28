import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MarketData {
  id: string;
  title: string;
  probability: number;
  volume: number;
  category: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { marketData } = await req.json() as { marketData: MarketData };
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are a prediction market analyst AI. Analyze market data and provide insights.
Your response must be a JSON object with this exact structure:
{
  "summary": "2-3 sentence analysis of market sentiment and key drivers",
  "riskLevel": "low" | "medium" | "high",
  "confidenceScore": number between 0-100,
  "factors": ["factor1", "factor2", "factor3", "factor4"]
}

Consider:
- Current probability and what it implies
- Trading volume as indicator of market confidence
- Category-specific factors
- Potential catalysts or risks

Respond ONLY with valid JSON, no markdown or explanations.`;

    const userPrompt = `Analyze this prediction market:
Title: ${marketData.title}
Current Probability: ${marketData.probability}%
Trading Volume: $${marketData.volume.toLocaleString()}
Category: ${marketData.category}

Provide your analysis as JSON.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      // IMPORTANT: return 200 so the client doesn't treat this as a hard function failure.
      // We still surface the error via a structured payload.
      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: "Rate limit exceeded. Please try again later.",
            code: 429,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({
            error: "AI credits exhausted. Please add credits to continue.",
            code: 402,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("AI analysis failed");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    const cleanContent = content.replace(/```json\n?|\n?```/g, "").trim();
    const insight = JSON.parse(cleanContent);

    return new Response(
      JSON.stringify({
        insight: insight.summary,
        confidence: insight.confidenceScore,
        risk: insight.riskLevel,
        factors: insight.factors,
        verified: true,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("analyze-market error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
