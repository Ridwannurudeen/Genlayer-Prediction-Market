import { useState, useEffect, memo } from "react";
import { X, Droplets, Zap, ChevronDown, ChevronUp, ExternalLink, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GetStartedBannerProps {
  isConnected?: boolean;
  onConnectWallet?: () => void;
}

const STORAGE_KEY = "genlayer_banner_dismissed";

export const GetStartedBanner = memo(({
  isConnected = false,
  onConnectWallet,
}: GetStartedBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden
  const [isExpanded, setIsExpanded] = useState(false);

  // Check localStorage on mount
  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    setIsDismissed(dismissed === "true");
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(STORAGE_KEY, "true");
  };

  const handleShowAgain = () => {
    setIsDismissed(false);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Floating button when dismissed
  if (isDismissed) {
    return (
      <button
        onClick={handleShowAgain}
        className={cn(
          "fixed bottom-6 right-6 z-50",
          "px-4 py-2.5 rounded-full",
          "bg-neutral-800/90 backdrop-blur-md",
          "border border-neutral-700/50",
          "text-sm text-neutral-300",
          "hover:text-white hover:border-neutral-600 hover:bg-neutral-700/90",
          "transition-all duration-200",
          "shadow-lg shadow-black/20",
          "flex items-center gap-2"
        )}
      >
        <Droplets className="w-4 h-4 text-emerald-400" />
        <span>Get Testnet Funds</span>
      </button>
    );
  }

  return (
    <div className={cn(
      "relative mb-6 rounded-xl overflow-hidden transition-all duration-300",
      "bg-gradient-to-r from-neutral-900/90 via-neutral-900/80 to-neutral-800/90",
      "backdrop-blur-sm",
      "border border-neutral-800/80"
    )}>
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
      </div>

      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 rounded-lg text-neutral-500 hover:text-neutral-200 hover:bg-neutral-800/80 transition-all z-10"
        aria-label="Dismiss banner"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Collapsed header */}
      <div
        className="relative px-4 py-3 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 border border-emerald-500/20 flex items-center justify-center">
            <Droplets className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Get Started with Testnet Funds
            </h3>
            <p className="text-xs text-neutral-500">
              Free ETH & GEN tokens for trading
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3 mr-8">
          {!isConnected && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onConnectWallet?.();
              }}
              className="h-8 text-xs bg-transparent border-neutral-700 hover:bg-neutral-800 hover:border-neutral-600"
            >
              <Wallet className="w-3.5 h-3.5 mr-1.5" />
              Connect Wallet
            </Button>
          )}
          <button className="p-1.5 text-neutral-500 hover:text-neutral-300 transition-colors">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded content */}
      <div className={cn(
        "relative overflow-hidden transition-all duration-300 ease-out",
        isExpanded ? "max-h-60 opacity-100" : "max-h-0 opacity-0"
      )}>
        <div className="px-4 pb-4 pt-1 border-t border-neutral-800/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {/* Base Sepolia */}
            <a
              href="https://www.alchemy.com/faucets/base-sepolia"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
                "bg-blue-500/5 border border-blue-500/20",
                "hover:bg-blue-500/10 hover:border-blue-500/30 hover:scale-[1.02]",
                "group"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
                <Zap className="w-5 h-5 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-100">Base Sepolia ETH</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-blue-400 transition-colors" />
                </div>
                <span className="text-xs text-neutral-500">For trading & gas fees</span>
              </div>
            </a>

            {/* GenLayer */}
            <a
              href="https://studio.genlayer.com"
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 p-4 rounded-xl transition-all duration-200",
                "bg-emerald-500/5 border border-emerald-500/20",
                "hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:scale-[1.02]",
                "group"
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-emerald-500/30 transition-colors">
                <Droplets className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-neutral-100">GenLayer GEN</span>
                  <ExternalLink className="w-3 h-3 text-neutral-500 group-hover:text-emerald-400 transition-colors" />
                </div>
                <span className="text-xs text-neutral-500">For AI-powered resolution</span>
              </div>
            </a>
          </div>

          <p className="text-[10px] text-neutral-600 mt-4 text-center">
            These are testnet tokens with no real value — perfect for learning and testing!
          </p>
        </div>
      </div>
    </div>
  );
});

GetStartedBanner.displayName = "GetStartedBanner";
