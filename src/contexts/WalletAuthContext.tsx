import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrowserProvider, formatEther } from "ethers";

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
    };
  }
}

interface Profile {
  id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  wallet_address: string | null;
  total_volume_traded: number;
  total_profit_loss: number;
}

interface WalletAuthContextType {
  // Wallet state
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  hasMetaMask: boolean;
  networkName: string;
  chainId: number | null;
  isOnGenLayer: boolean;
  isOnBase: boolean;
  
  // Profile state
  profile: Profile | null;
  loading: boolean;
  
  // Actions
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  switchToGenLayer: () => Promise<void>;
  switchToBase: () => Promise<void>;
}

const WalletAuthContext = createContext<WalletAuthContextType | undefined>(undefined);

export const useWalletAuth = () => {
  const context = useContext(WalletAuthContext);
  if (!context) {
    throw new Error("useWalletAuth must be used within a WalletAuthProvider");
  }
  return context;
};

// Format address for display
export const formatAddress = (address: string): string => {
  if (!address) return "";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// GenLayer Testnet network configuration
const GENLAYER_TESTNET = {
  chainId: "0x107d", // 4221 in hex
  chainName: "GenLayer Asimov Testnet",
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  rpcUrls: ["https://genlayer-testnet.rpc.caldera.xyz/http"],
  blockExplorerUrls: ["https://explorer-asimov.genlayer.com"],
};

// Base Sepolia network configuration
const BASE_SEPOLIA = {
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

export const WalletAuthProvider = ({ children }: { children: ReactNode }) => {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [hasMetaMask, setHasMetaMask] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const networkName = chainId === 4221 
    ? "GenLayer Asimov Testnet" 
    : chainId === BASE_SEPOLIA.chainIdNumber 
    ? "Base Sepolia Testnet" 
    : chainId 
    ? `Chain ${chainId}` 
    : "Not Connected";

  // Check for MetaMask on mount
  useEffect(() => {
    setHasMetaMask(typeof window !== "undefined" && !!window.ethereum?.isMetaMask);
  }, []);

  // Fetch balance for connected address
  const fetchBalance = useCallback(async (addr: string) => {
    if (!window.ethereum) return;
    try {
      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(addr);
      setBalance(formatEther(bal));
    } catch (error) {
      console.error("Error fetching balance:", error);
      setBalance(null);
    }
  }, []);

  // Fetch profile for wallet address (wallet-only auth - no profile creation)
  const fetchProfile = useCallback(async (walletAddress: string) => {
    try {
      // Find existing profile by wallet address
      const { data: existingProfile, error: fetchError } = await supabase
        .from("profiles")
        .select("*")
        .eq("wallet_address", walletAddress)
        .maybeSingle();

      if (fetchError) {
        console.error("Error fetching profile:", fetchError);
        return null;
      }

      if (existingProfile) {
        setProfile(existingProfile);
        return existingProfile;
      }

      // For wallet-only auth, we don't create profiles in the database
      // since user_id requires a UUID from auth.users
      // Just create a local profile object for display
      const localProfile: Profile = {
        id: walletAddress,
        user_id: walletAddress,
        wallet_address: walletAddress,
        display_name: formatAddress(walletAddress),
        avatar_url: null,
        total_volume_traded: 0,
        total_profit_loss: 0,
      };
      setProfile(localProfile);
      return localProfile;
    } catch (error) {
      console.error("Error in fetchProfile:", error);
      return null;
    }
  }, []);

  // Handle account changes
  const handleAccountsChanged = useCallback(async (accounts: unknown) => {
    const accs = accounts as string[];
    if (accs.length === 0) {
      setAddress(null);
      setBalance(null);
      setProfile(null);
      localStorage.removeItem("wallet_address");
    } else {
      const newAddress = accs[0];
      setAddress(newAddress);
      localStorage.setItem("wallet_address", newAddress);
      fetchBalance(newAddress);
      await fetchProfile(newAddress);
    }
  }, [fetchBalance, fetchProfile]);

  // Handle chain changes
  const handleChainChanged = useCallback((chainIdHex: unknown) => {
    const newChainId = parseInt(chainIdHex as string, 16);
    setChainId(newChainId);
    if (address) {
      fetchBalance(address);
    }
  }, [address, fetchBalance]);

  // Load wallet from localStorage on mount
  useEffect(() => {
    const loadSavedWallet = async () => {
      const savedAddress = localStorage.getItem("wallet_address");
      
      if (savedAddress && window.ethereum) {
        try {
          // Verify the wallet is still connected
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          }) as string[];
          
          if (accounts.includes(savedAddress.toLowerCase()) || accounts.some(acc => acc.toLowerCase() === savedAddress.toLowerCase())) {
            setAddress(savedAddress);
            fetchBalance(savedAddress);
            await fetchProfile(savedAddress);
            
            // Get current chain
            const chainIdHex = await window.ethereum.request({ method: "eth_chainId" }) as string;
            setChainId(parseInt(chainIdHex, 16));
          } else {
            localStorage.removeItem("wallet_address");
          }
        } catch (error) {
          console.error("Error loading saved wallet:", error);
          localStorage.removeItem("wallet_address");
        }
      }
      
      setLoading(false);
    };

    loadSavedWallet();
  }, [fetchBalance, fetchProfile]);

  // Set up MetaMask event listeners
  useEffect(() => {
    if (!window.ethereum) return;

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, [handleAccountsChanged, handleChainChanged]);

  const getWalletErrorCode = (err: unknown): number | undefined => {
    if (!err || typeof err !== "object") return undefined;

    const anyErr = err as {
      code?: unknown;
      message?: unknown;
      data?: { originalError?: { code?: unknown; message?: unknown } };
    };

    const toNum = (v: unknown) => {
      if (typeof v === "number") return v;
      if (typeof v === "string") {
        const n = Number(v);
        return Number.isFinite(n) ? n : undefined;
      }
      return undefined;
    };

    const direct = toNum(anyErr.code);
    const nested = toNum(anyErr.data?.originalError?.code);
    return direct ?? nested;
  };

  const getWalletErrorMessage = (err: unknown): string | undefined => {
    if (!err || typeof err !== "object") return undefined;

    const anyErr = err as {
      message?: unknown;
      data?: { originalError?: { message?: unknown } };
    };

    const direct = typeof anyErr.message === "string" ? anyErr.message : undefined;
    const nested =
      typeof anyErr.data?.originalError?.message === "string" ? anyErr.data.originalError.message : undefined;

    return direct ?? nested;
  };

  const isMissingChainError = (err: unknown): boolean => {
    const code = getWalletErrorCode(err);
    if (code === 4902) return true;

    const msg = (getWalletErrorMessage(err) ?? "").toLowerCase();
    return msg.includes("unrecognized chain") || msg.includes("unknown chain") || msg.includes("chain id") && msg.includes("add");
  };

  const switchToGenLayer = async () => {
    if (!window.ethereum) return;

    const requestSwitch = () =>
      window.ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER_TESTNET.chainId }],
      });

    try {
      await requestSwitch();
      const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(chainIdHex, 16));
      return;
    } catch (switchError: unknown) {
      // Some wallets wrap 4902 in a -32603 “Internal error” envelope.
      if (!isMissingChainError(switchError)) {
        console.error("Error switching network:", switchError);
        throw switchError;
      }

      try {
        // Add network, then switch again (many wallets add without switching).
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [GENLAYER_TESTNET],
        });

        await requestSwitch();
        const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
        setChainId(parseInt(chainIdHex, 16));
      } catch (addError) {
        console.error("Error adding GenLayer network:", addError);
        toast.error("Failed to add GenLayer network", {
          description: getWalletErrorMessage(addError) || "Please add GenLayer Testnet in your wallet",
        });
        throw addError;
      }
    }
  };

  const switchToBase = async () => {
    if (!window.ethereum) return;

    const requestSwitch = () =>
      window.ethereum!.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: BASE_SEPOLIA.chainId }],
      });

    try {
      await requestSwitch();
      const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
      setChainId(parseInt(chainIdHex, 16));
    } catch (switchError: unknown) {
      if (!isMissingChainError(switchError)) {
        throw switchError;
      }

      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [BASE_SEPOLIA],
        });
        await requestSwitch();
        const chainIdHex = (await window.ethereum.request({ method: "eth_chainId" })) as string;
        setChainId(parseInt(chainIdHex, 16));
      } catch (addError) {
        console.error("Error adding Base network:", addError);
        toast.error("Failed to add Base network");
        throw addError;
      }
    }
  };

  const connect = async () => {
    if (!window.ethereum) {
      toast.error("MetaMask not found", {
        description: "Please install MetaMask to connect your wallet",
        action: {
          label: "Install",
          onClick: () => window.open("https://metamask.io/download/", "_blank"),
        },
      });
      return;
    }

    setIsConnecting(true);

    try {
      const accounts =
        (await window.ethereum.request({
          method: "eth_requestAccounts",
        })) as string[];

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const connectedAddress = accounts[0];

      // Get chain ID
      const chainIdHex = (await window.ethereum.request({
        method: "eth_chainId",
      })) as string;
      const numericChainId = parseInt(chainIdHex, 16);
      setChainId(numericChainId);

      // Save address and fetch profile
      setAddress(connectedAddress);
      localStorage.setItem("wallet_address", connectedAddress);
      await fetchBalance(connectedAddress);
      await fetchProfile(connectedAddress);

      // If user isn't on GenLayer, attempt to add/switch immediately (but don't fail the connection if they cancel).
      if (numericChainId !== 4221) {
        toast.info("Switching to GenLayer Testnet...", {
          description: "Confirm the network change in your wallet",
        });

        try {
          await switchToGenLayer();
          toast.success("Wallet connected!", {
            description: "Connected to GenLayer Testnet",
          });
        } catch (switchErr: unknown) {
          const code = getWalletErrorCode(switchErr);
          if (code === 4001) {
            toast.info("Network switch cancelled", {
              description: "You can switch to GenLayer Testnet later to deploy",
            });
          } else {
            toast.error("Couldn't switch network", {
              description:
                getWalletErrorMessage(switchErr) || "Please add/switch to GenLayer Testnet in your wallet",
            });
          }

          toast.success("Wallet connected!", {
            description: "Connected (wrong network)",
          });
        }
      } else {
        toast.success("Wallet connected!", {
          description: "Connected to GenLayer Testnet",
        });
      }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4001) {
        toast.error("Connection rejected", {
          description: "You rejected the request",
        });
      } else {
        toast.error("Failed to connect wallet", {
          description: err.message || "Unknown error",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    setAddress(null);
    setBalance(null);
    setChainId(null);
    setProfile(null);
    localStorage.removeItem("wallet_address");
    toast.success("Wallet disconnected");
  };

  const refreshBalance = useCallback(async () => {
    if (address) {
      await fetchBalance(address);
    }
  }, [address, fetchBalance]);

  return (
    <WalletAuthContext.Provider
      value={{
        address,
        balance,
        isConnecting,
        isConnected: !!address,
        hasMetaMask,
        networkName,
        chainId,
        isOnGenLayer: chainId === 4221,
        isOnBase: chainId === BASE_SEPOLIA.chainIdNumber,
        profile,
        loading,
        connect,
        disconnect,
        refreshBalance,
        switchToGenLayer,
        switchToBase,
      }}
    >
      {children}
    </WalletAuthContext.Provider>
  );
};
