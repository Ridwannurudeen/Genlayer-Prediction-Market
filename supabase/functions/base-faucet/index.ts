import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FaucetRequest {
  address: string;
  token?: "ETH" | "USDC";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { address, token = "ETH" } = await req.json() as FaucetRequest;

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

    // Base Sepolia faucet endpoints
    const faucetInfo = {
      ETH: {
        name: "Base Sepolia ETH",
        endpoints: [
          {
            type: "redirect",
            url: "https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet",
            description: "Coinbase official Base Sepolia faucet"
          },
          {
            type: "redirect",
            url: "https://faucet.quicknode.com/base/sepolia",
            description: "QuickNode Base Sepolia faucet"
          },
          {
            type: "redirect", 
            url: "https://www.alchemy.com/faucets/base-sepolia",
            description: "Alchemy Base Sepolia faucet"
          }
        ]
      },
      USDC: {
        name: "Base Sepolia USDC",
        endpoints: [
          {
            type: "redirect",
            url: "https://faucet.circle.com/",
            description: "Circle USDC testnet faucet"
          }
        ],
        contractAddress: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" // Base Sepolia USDC
      }
    };

    const tokenInfo = faucetInfo[token];
    if (!tokenInfo) {
      return new Response(
        JSON.stringify({ error: `Unsupported token: ${token}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For Base Sepolia, we redirect to official faucets since there's no programmatic API
    // The frontend will open the faucet URL in a new tab
    return new Response(
      JSON.stringify({
        success: true,
        token: token,
        network: "Base Sepolia",
        chainId: 84532,
        faucets: tokenInfo.endpoints,
        message: `Please use one of the official ${tokenInfo.name} faucets below`,
        contractAddress: (tokenInfo as any).contractAddress || null,
        explorerUrl: `https://sepolia.basescan.org/address/${address}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("base-faucet error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Faucet request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
