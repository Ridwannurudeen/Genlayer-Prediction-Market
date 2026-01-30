// supabase/functions/analyze-market/index.ts
// Deploy with: supabase functions deploy analyze-market --no-verify-jwt

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

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
  description?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY not configured");
    }

    const { marketData } = await req.json() as { marketData: MarketData };

    if (!marketData || !marketData.title) {
      throw new Error("Invalid market data");
    }

    // Call Anthropic API
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 500,
        messages: [
          {
            role: "user",
            content: `You are a prediction market analyst. Analyze this market and provide insights.

Market: "${marketData.title}"
Category: ${marketData.category}
Current Probability: ${marketData.probability}% YES
Trading Volume: $${marketData.volume}
${marketData.description ? `Description: ${marketData.description}` : ""}

Provide a JSON response with:
1. "insight": A 2-3 sentence analysis of this market (what factors matter, current sentiment)
2. "confidence": A number 0.0-1.0 indicating how reliable this prediction is
3. "risk": Either "low", "medium", or "high"
4. "factors": An array of 3-4 key factors that could influence the outcome

Respond ONLY with valid JSON, no other text.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Anthropic API error:", error);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ code: 429, error: "Rate limited" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
      
      throw new Error(`Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text;

    // Parse the JSON response from Claude
    let analysis;
    try {
      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse Claude response:", content);
      // Fallback analysis
      analysis = {
        insight: `Based on the ${marketData.probability}% probability and market activity, this prediction shows ${marketData.probability > 60 ? "bullish" : marketData.probability < 40 ? "bearish" : "uncertain"} sentiment.`,
        confidence: 0.7,
        risk: marketData.probability > 80 || marketData.probability < 20 ? "high" : "medium",
        factors: ["Market sentiment", "Trading volume", "Historical patterns"],
      };
    }

    return new Response(
      JSON.stringify({
        insight: analysis.insight,
        confidence: Math.min(1, Math.max(0, analysis.confidence || 0.7)),
        risk: ["low", "medium", "high"].includes(analysis.risk) ? analysis.risk : "medium",
        factors: Array.isArray(analysis.factors) ? analysis.factors.slice(0, 5) : ["Market dynamics"],
        verified: true,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
