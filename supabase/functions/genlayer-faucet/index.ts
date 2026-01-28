import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address } = await req.json();

    if (!address) {
      return new Response(
        JSON.stringify({ error: "Address is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return new Response(
        JSON.stringify({ error: "Invalid Ethereum address format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Requesting faucet tokens for address: ${address}`);

    // Try multiple faucet endpoints
    const faucetEndpoints = [
      "https://faucet.genlayer.com/api/faucet",
      "https://genlayer-faucet.vercel.app/api/faucet",
    ];

    let faucetResponse: Response | null = null;
    let lastError: string | null = null;

    for (const endpoint of faucetEndpoints) {
      try {
        console.log(`Trying faucet endpoint: ${endpoint}`);
        faucetResponse = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            address,
            network: "Genlayer Testnet",
            token: "GEN",
            turnstileToken: "",
          }),
        });

        // If we get a valid response (even an error), use this endpoint
        if (faucetResponse.status !== 404) {
          break;
        }
        lastError = `Endpoint ${endpoint} returned 404`;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : "Unknown error";
        console.log(`Endpoint ${endpoint} failed: ${lastError}`);
      }
    }

    if (!faucetResponse || faucetResponse.status === 404) {
      return new Response(
        JSON.stringify({
          error: "Faucet service unavailable",
          message: "The GenLayer faucet API is currently unavailable. Please use the official faucet at https://www.genlayer.com/testnet",
          fallbackUrl: "https://www.genlayer.com/testnet",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const responseText = await faucetResponse.text();
    console.log(`Faucet response status: ${faucetResponse.status}`);
    console.log(`Faucet response: ${responseText}`);

    let responseData;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = { message: responseText };
    }

    if (!faucetResponse.ok) {
      return new Response(
        JSON.stringify({
          error: responseData.error || responseData.message || "Faucet request failed",
          details: responseData,
        }),
        { status: faucetResponse.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Testnet tokens requested successfully",
        data: responseData,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Faucet request error:", error);
    const errorMessage = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
