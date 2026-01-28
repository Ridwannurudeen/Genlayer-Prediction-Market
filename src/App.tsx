import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { WalletAuthProvider } from "@/contexts/WalletAuthContext";
import Index from "./pages/Index";
import MarketDetail from "./pages/MarketDetail";
import Portfolio from "./pages/Portfolio";
import CreateMarket from "./pages/CreateMarket";
import MyDeployments from "./pages/MyDeployments";
import BuildersLeaderboard from "./pages/BuildersLeaderboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <QueryClientProvider client={queryClient}>
      <WalletAuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/market/:id" element={<MarketDetail />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/create" element={<CreateMarket />} />
              <Route path="/my-deployments" element={<MyDeployments />} />
              <Route path="/leaderboard" element={<BuildersLeaderboard />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </WalletAuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
