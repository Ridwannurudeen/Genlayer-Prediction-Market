import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Menu, Wallet, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GenLayerLogo } from "@/components/GenLayerLogo";
import { UserMenu } from "@/components/UserMenu";
import { WalletModal } from "@/components/WalletModal";
import { ThemeToggle } from "@/components/ThemeToggle";
import { FaucetButton } from "@/components/FaucetButton";
import { useWalletAuth, formatAddress } from "@/contexts/WalletAuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const categories = [
  "All", "Crypto", "Finance", "Tech", "Politics", "World", "Sports", "Culture"
];

interface HeaderProps {
  activeCategory?: string;
  onCategoryChange?: (category: string) => void;
}

/** Main navigation header with wallet connection and category filters */
export const Header = ({ activeCategory = "All", onCategoryChange }: HeaderProps) => {
  const navigate = useNavigate();
  const { address, isConnected, loading } = useWalletAuth();
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background border-b border-border">
        <div className="container flex h-14 items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <GenLayerLogo size="md" />
          </Link>

          {/* Search */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search markets"
                className="pl-9 bg-secondary border-0 h-9"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {!loading && (
              <>
                {isConnected && address ? (
                  <>
                    <Button 
                      size="sm" 
                      className="gap-1.5 hidden sm:flex"
                      onClick={() => navigate("/create")}
                    >
                      <Plus className="h-4 w-4" />
                      Create
                    </Button>
                    <FaucetButton className="hidden md:flex" />
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="gap-2 border-yes/30 text-yes hover:bg-yes-light"
                      onClick={() => setWalletModalOpen(true)}
                    >
                      <Zap className="h-4 w-4" />
                      <span className="hidden sm:inline">{formatAddress(address)}</span>
                    </Button>
                    <UserMenu onOpenWallet={() => setWalletModalOpen(true)} />
                  </>
                ) : (
                  <Button 
                    size="sm" 
                    className="gap-2"
                    onClick={() => setWalletModalOpen(true)}
                  >
                    <Wallet className="h-4 w-4" />
                    Connect Wallet
                  </Button>
                )}
              </>
            )}
            <ThemeToggle />
            
            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/" className="w-full cursor-pointer">
                    Home
                  </Link>
                </DropdownMenuItem>
                {isConnected && (
                  <>
                    <DropdownMenuItem asChild>
                      <Link to="/create" className="w-full cursor-pointer">
                        <Plus className="h-4 w-4 mr-2" />
                        Create Market
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/portfolio" className="w-full cursor-pointer">
                        Portfolio
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <div className="px-2 py-1.5">
                      <FaucetButton 
                        variant="default" 
                        size="sm" 
                        className="w-full justify-center"
                      />
                    </div>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Categories */}
        <div className="border-t border-border">
          <div className="container">
            <nav className="flex items-center gap-1 overflow-x-auto py-2 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => onCategoryChange?.(cat)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap transition-colors ${
                    activeCategory === cat
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-secondary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </header>

      <WalletModal 
        open={walletModalOpen} 
        onOpenChange={setWalletModalOpen}
      />
    </>
  );
};
