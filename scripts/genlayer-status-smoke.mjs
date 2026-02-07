import { createClient } from "genlayer-js";
import { testnetAsimov, studionet } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : null;
};

const GENLAYER_RPC_URL =
  process.env.GENLAYER_RPC_URL ||
  "https://genlayer-testnet.rpc.caldera.xyz/http";
const STUDIO_RPC_URL = "https://studio.genlayer.com/api";

const networkArg =
  getArg("network") || process.env.GENLAYER_NETWORK || "auto";

const addressArg = getArg("address") || process.env.GENLAYER_CONTRACT;
const txArg = getArg("tx") || process.env.GENLAYER_TX;
const timeoutMs = Number(getArg("timeout") || process.env.GENLAYER_TIMEOUT_MS || 15000);

const isHexAddress = (value) => /^0x[a-fA-F0-9]{40}$/.test(value);
const isHexTxHash = (value) => /^0x[a-fA-F0-9]{64}$/.test(value);

const withTimeout = async (promise, ms) => {
  let timeoutHandle = null;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => reject(new Error("timeout")), ms);
  });
  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
};

const parseStatus = (status) => {
  if (!status || typeof status !== "object") return null;

  const resolvedRaw = status.has_resolved ?? status.resolved ?? status.is_resolved;
  const outcomeRaw = status.outcome ?? -1;
  const reasoningRaw = status.resolution_reasoning ?? status.reasoning ?? "";
  const sourcesRaw = status.resolution_sources ?? [];

  return {
    resolved: Boolean(resolvedRaw),
    outcome: Number(outcomeRaw),
    reasoning: String(reasoningRaw || ""),
    question: String(status.question || ""),
    description: String(status.description || ""),
    endDate: String(status.end_date || ""),
    creator: String(status.creator || ""),
    confidence: Number(status.confidence ?? 0),
    resolutionSources: Array.isArray(sourcesRaw) ? sourcesRaw.map(String) : [],
  };
};

const buildClient = (network) => {
  if (network === "studio") {
    return createClient({
      chain: studionet,
      endpoint: STUDIO_RPC_URL,
    });
  }
  return createClient({
    chain: testnetAsimov,
    endpoint: GENLAYER_RPC_URL,
  });
};

const resolveContractAddress = async (client) => {
  if (addressArg) return addressArg;
  if (!txArg) return null;
  if (!isHexTxHash(txArg)) {
    throw new Error("Invalid --tx value; expected 0x-prefixed 32-byte hash.");
  }

  try {
    const receipt = await withTimeout(
      client.waitForTransactionReceipt({
        hash: txArg,
        status: TransactionStatus.ACCEPTED,
      }),
      timeoutMs
    );

    const decoded = receipt?.txDataDecoded;
    const address = decoded?.contractAddress || receipt?.recipient;
    return address;
  } catch {
    return null;
  }
};

const readStatus = async (client, contractAddress) => {
  try {
    const status = await client.readContract({
      address: contractAddress,
      functionName: "get_status",
      args: [],
      jsonSafeReturn: true,
    });
    return parseStatus(status);
  } catch {
    // fallback to legacy interface
  }

  try {
    const status = await client.readContract({
      address: contractAddress,
      functionName: "get_status",
      args: [],
    });
    return parseStatus(status);
  } catch {
    // fallback to legacy interface
  }

  try {
    const legacy = await client.readContract({
      address: contractAddress,
      functionName: "get_market_info",
      args: [],
    });

    if (Array.isArray(legacy)) {
      return {
        resolved: Boolean(legacy[5]),
        outcome: Number(legacy[6]),
        reasoning: String(legacy[7] ?? ""),
        question: String(legacy[0] ?? ""),
        description: String(legacy[1] ?? ""),
        endDate: String(legacy[3] ?? ""),
        creator: String(legacy[4] ?? ""),
        confidence: 0,
        resolutionSources: [],
      };
    }
  } catch (error) {
    throw new Error(`Failed to read contract: ${error?.message || String(error)}`);
  }

  return null;
};

const run = async () => {
  if (!addressArg && !txArg) {
    console.log("Usage:");
    console.log("  node scripts/genlayer-status-smoke.mjs --address 0x... ");
    console.log("  node scripts/genlayer-status-smoke.mjs --tx 0x... ");
    console.log("  node scripts/genlayer-status-smoke.mjs --network testnet|studio");
    console.log("");
    console.log("Optional env vars:");
    console.log("  GENLAYER_CONTRACT, GENLAYER_TX, GENLAYER_RPC_URL, GENLAYER_TIMEOUT_MS, GENLAYER_NETWORK");
    process.exit(1);
  }

  const networksToTry =
    networkArg === "auto" ? ["testnet", "studio"] : [networkArg];

  const errors = [];

  for (const network of networksToTry) {
    const client = buildClient(network);
    const contractAddress = await resolveContractAddress(client);
    if (!contractAddress || !isHexAddress(contractAddress)) {
      errors.push(`[${network}] Could not resolve a valid contract address.`);
      continue;
    }

    try {
      const status = await readStatus(client, contractAddress);
      if (!status) {
        errors.push(`[${network}] Failed to parse GenLayer status.`);
        continue;
      }

      console.log(
        JSON.stringify(
          {
            network,
            contractAddress,
            status,
          },
          null,
          2
        )
      );
      return;
    } catch (error) {
      const message =
        error && typeof error === "object" && "message" in error
          ? error.message
          : String(error);
      errors.push(`[${network}] ${message}`);
    }
  }
  console.error("GenLayer smoke check failed:");
  errors.forEach((err) => console.error("  - " + err));
  process.exit(1);
};

run().catch((error) => {
  console.error("GenLayer smoke check failed:", error?.message || error);
  process.exit(1);
});
