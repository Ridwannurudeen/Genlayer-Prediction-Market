import { useState, useEffect, createContext, useContext, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
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

interface WalletContextType {
  address: string | null;
  balance: string | null;
  isConnecting: boolean;
  isConnected: boolean;
  hasMetaMask: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshBalance: () => Promise<void>;
  networkName: string;
  chainId: number | null;
  switchToGenLayer: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
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

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const { user, profile, refreshProfile } = useAuth();
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [chainId, setChainId] = useState<number | null>(null);
  const [hasMetaMask, setHasMetaMask] = useState(false);

  const networkName = chainId === 4221 ? "GenLayer Asimov Testnet" : chainId ? `Chain ${chainId}` : "Not Connected";

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

  // Handle account changes
  const handleAccountsChanged = useCallback(async (accounts: unknown) => {
    const accs = accounts as string[];
    if (accs.length === 0) {
      setAddress(null);
      setBalance(null);
      if (user) {
        await supabase
          .from("profiles")
          .update({ wallet_address: null })
          .eq("user_id", user.id);
        refreshProfile();
      }
    } else {
      const newAddress = accs[0];
      setAddress(newAddress);
      fetchBalance(newAddress);
      if (user) {
        await supabase
          .from("profiles")
          .update({ wallet_address: newAddress })
          .eq("user_id", user.id);
        refreshProfile();
      }
    }
  }, [user, refreshProfile, fetchBalance]);

  // Handle chain changes
  const handleChainChanged = useCallback((chainIdHex: unknown) => {
    const newChainId = parseInt(chainIdHex as string, 16);
    setChainId(newChainId);
    if (address) {
      fetchBalance(address);
    }
  }, [address, fetchBalance]);

  // Load wallet from profile and set up listeners
  useEffect(() => {
    if (profile?.wallet_address && window.ethereum) {
      setAddress(profile.wallet_address);
      fetchBalance(profile.wallet_address);
      
      // Get current chain
      window.ethereum.request({ method: "eth_chainId" }).then((chainIdHex) => {
        setChainId(parseInt(chainIdHex as string, 16));
      });
    } else if (!profile?.wallet_address) {
      setAddress(null);
      setBalance(null);
    }
  }, [profile, fetchBalance]);

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

  const switchToGenLayer = async () => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: GENLAYER_TESTNET.chainId }],
      });
    } catch (switchError: unknown) {
      // Chain doesn't exist, add it
      if ((switchError as { code?: number })?.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [GENLAYER_TESTNET],
          });
        } catch (addError) {
          console.error("Error adding GenLayer network:", addError);
          toast.error("Failed to add GenLayer network");
        }
      } else {
        console.error("Error switching network:", switchError);
      }
    }
  };

  const connect = async () => {
    if (!user) {
      toast.error("Please sign in to connect a wallet");
      return;
    }

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
      // Request account access
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      }) as string[];

      if (accounts.length === 0) {
        throw new Error("No accounts found");
      }

      const connectedAddress = accounts[0];

      // Get chain ID
      const chainIdHex = await window.ethereum.request({
        method: "eth_chainId",
      }) as string;
      setChainId(parseInt(chainIdHex, 16));

      // Save to database
      const { error } = await supabase
        .from("profiles")
        .update({ wallet_address: connectedAddress })
        .eq("user_id", user.id);

      if (error) throw error;

      setAddress(connectedAddress);
      await fetchBalance(connectedAddress);
      await refreshProfile();

      // Automatically switch to GenLayer if not on it
      if (parseInt(chainIdHex, 16) !== 4221) {
        toast.info("Switching to GenLayer Testnet...", {
          description: "Please confirm the network switch in MetaMask",
        });
        await switchToGenLayer();
        toast.success("Wallet connected!", {
          description: "Connected to GenLayer Testnet",
        });
      } else {
        toast.success("Wallet connected!", {
          description: "Connected to GenLayer Testnet",
        });
      }
    } catch (error: unknown) {
      const err = error as { code?: number; message?: string };
      if (err.code === 4001) {
        toast.error("Connection rejected", {
          description: "You rejected the connection request",
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
    if (!user) return;

    try {
      const { error } = await supabase
        .from("profiles")
        .update({ wallet_address: null })
        .eq("user_id", user.id);

      if (error) throw error;

      setAddress(null);
      setBalance(null);
      setChainId(null);
      await refreshProfile();

      toast.success("Wallet disconnected");
    } catch (error: unknown) {
      toast.error("Failed to disconnect wallet");
    }
  };

  const refreshBalance = useCallback(async () => {
    if (address) {
      await fetchBalance(address);
    }
  }, [address, fetchBalance]);

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isConnecting,
        isConnected: !!address,
        hasMetaMask,
        connect,
        disconnect,
        refreshBalance,
        networkName,
        chainId,
        switchToGenLayer,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
