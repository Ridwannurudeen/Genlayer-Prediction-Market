// Solidity Prediction Market Contract - ABI for Factory-deployed contracts
// This contract handles trading on Base Sepolia, with resolution coming from GenLayer

export const PREDICTION_MARKET_ABI = [
  // Read functions
  "function question() view returns (string)",
  "function description() view returns (string)",
  "function endTime() view returns (uint256)",
  "function resolved() view returns (bool)",
  "function outcome() view returns (uint8)",
  "function creator() view returns (address)",
  "function yesPool() view returns (uint256)",
  "function noPool() view returns (uint256)",
  "function yesShares(address) view returns (uint256)",
  "function noShares(address) view returns (uint256)",
  // Write functions
  "function buyYes() payable",
  "function buyNo() payable",
  "function resolve(uint8 _outcome) external",
  "function claimWinnings() external",
  // Events
  "event SharesPurchased(address indexed buyer, bool isYes, uint256 amount, uint256 shares)",
  "event MarketResolved(uint8 outcome)",
  "event WinningsClaimed(address indexed user, uint256 amount)",
];

// Base Sepolia network configuration
export const BASE_SEPOLIA = {
  chainId: "0x14a34", // 84532 in hex
  chainIdNumber: 84532,
  chainName: "Base Sepolia Testnet",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia.base.org"],
  blockExplorerUrls: ["https://sepolia.basescan.org"],
};

// Contract deployment parameters
export interface BaseContractParams {
  question: string;
  description: string;
  endDate: number; // Unix timestamp
  genLayerMarketId: string; // bytes32 hex string
}

// Helper to convert market ID to bytes32
export const marketIdToBytes32 = (marketId: string): string => {
  // Pad to 32 bytes (64 hex chars)
  const hex = marketId.replace(/-/g, "").padEnd(64, "0");
  return `0x${hex}`;
};

// Get explorer URL for Base
export const getBaseExplorerUrl = (type: "tx" | "address", hash: string): string => {
  return `${BASE_SEPOLIA.blockExplorerUrls[0]}/${type}/${hash}`;
};

// Get explorer URL for GenLayer
export const getGenLayerExplorerUrl = (type: "tx" | "address", hash: string): string => {
  return `https://explorer-asimov.genlayer.com/${type}/${hash}`;
};

// Network type for market
export type NetworkType = "simulated" | "base" | "genlayer" | "hybrid";

// Get network display name
export const getNetworkDisplayName = (network: NetworkType): string => {
  switch (network) {
    case "simulated":
      return "Simulated";
    case "base":
      return "Base Sepolia";
    case "genlayer":
      return "GenLayer";
    case "hybrid":
      return "Base + GenLayer";
    default:
      return "Unknown";
  }
};
