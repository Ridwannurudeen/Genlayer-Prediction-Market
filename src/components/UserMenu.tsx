import { useNavigate } from "react-router-dom";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useWalletAuth, formatAddress } from "@/contexts/WalletAuthContext";
import { Wallet, LogOut, BarChart3, Zap, Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface UserMenuProps {
  onOpenWallet?: () => void;
}

export const UserMenu = ({ onOpenWallet }: UserMenuProps) => {
  const { address, profile, disconnect, chainId } = useWalletAuth();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const isOnGenLayer = chainId === 4221;

  const getInitials = () => {
    if (profile?.display_name) {
      return profile.display_name.substring(0, 2).toUpperCase();
    }
    if (address) {
      return address.substring(2, 4).toUpperCase();
    }
    return "W";
  };

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success("Address copied");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDisconnect = async () => {
    await disconnect();
    navigate("/");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        {/* Wallet Info */}
        <div className="px-2 py-2">
          <div className="flex items-center gap-2 p-2 rounded-md bg-yes-light">
            <Zap className="h-4 w-4 text-yes" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-yes">
                {isOnGenLayer ? "GenLayer Testnet" : "Connected"}
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate">
                {address ? formatAddress(address) : ""}
              </p>
            </div>
            <button onClick={copyAddress} className="p-1 hover:bg-background rounded">
              {copied ? (
                <Check className="h-3 w-3 text-yes" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground" />
              )}
            </button>
          </div>
        </div>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={() => navigate("/portfolio")}>
          <BarChart3 className="h-4 w-4 mr-2" />
          Portfolio
        </DropdownMenuItem>
        
        <DropdownMenuItem onClick={onOpenWallet}>
          <Wallet className="h-4 w-4 mr-2" />
          Wallet Details
        </DropdownMenuItem>
        
        <DropdownMenuItem asChild>
          <a
            href={
              isOnGenLayer
                ? `https://explorer-asimov.genlayer.com/address/${address}`
                : `https://etherscan.io/address/${address}`
            }
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on Explorer
          </a>
        </DropdownMenuItem>
        
        <DropdownMenuSeparator />
        
        <DropdownMenuItem onClick={handleDisconnect} className="text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
