import { createClient } from "genlayer-js";
import { testnetAsimov } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

const GENLAYER_RPC_URL = "https://genlayer-testnet.rpc.caldera.xyz/http";

export const isHexAddress = (value: string): boolean =>
  /^0x[a-fA-F0-9]{40}$/.test(value);

export const isHexTxHash = (value: string): boolean =>
  /^0x[a-fA-F0-9]{64}$/.test(value);

const withTimeout = async <T>(promise: Promise<T>, timeoutMs: number): Promise<T> => {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error("timeout"));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
};

export const resolveGenLayerContractAddress = async (
  txHash: string,
  timeoutMs = 15000
): Promise<string | null> => {
  if (!isHexTxHash(txHash)) return null;

  type GenLayerReceipt = {
    txDataDecoded?: { contractAddress?: string };
    recipient?: string;
  };

  const client = createClient({
    chain: testnetAsimov,
    endpoint: GENLAYER_RPC_URL,
  });

  try {
    const receipt = (await withTimeout(
      client.waitForTransactionReceipt({
        hash: txHash as `0x${string}`,
        status: TransactionStatus.ACCEPTED,
      }),
      timeoutMs
    )) as GenLayerReceipt;

    const contractAddress =
      receipt?.txDataDecoded?.contractAddress || receipt?.recipient;

    if (typeof contractAddress === "string" && isHexAddress(contractAddress)) {
      return contractAddress;
    }
  } catch (error) {
    console.warn("GenLayer receipt lookup failed:", error);
  }

  return null;
};
