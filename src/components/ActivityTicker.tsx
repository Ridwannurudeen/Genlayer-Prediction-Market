import { useEffect, useState } from "react";
import { Activity, Radio, Brain, Database, CheckCircle2, Zap } from "lucide-react";

// Simulated validator activity messages
const generateActivityMessages = () => [
  { type: "consensus", message: "Validator 0x8f3...a103 voted YES on BTC prediction", icon: CheckCircle2 },
  { type: "oracle", message: "Fetching real-time S&P 500 data from CoinGecko API...", icon: Database },
  { type: "consensus", message: "Validator 0x2b1...c892 confirmed consensus reached", icon: Brain },
  { type: "network", message: "New market deployed: ETH $5K by Q2 2026", icon: Zap },
  { type: "oracle", message: "Analyzing social sentiment from X/Twitter feeds...", icon: Radio },
  { type: "consensus", message: "Validator 0x9d4...b221 processing resolution logic", icon: Activity },
  { type: "network", message: "Trade executed: 0.5 ETH on YES position", icon: Zap },
  { type: "oracle", message: "Querying Reuters API for election data...", icon: Database },
  { type: "consensus", message: "Validator 0x1f8...e445 completed AI analysis", icon: Brain },
  { type: "network", message: "Market resolved: Bitcoin exceeded $100K ✓", icon: CheckCircle2 },
];

export const ActivityTicker = () => {
  const [messages] = useState(generateActivityMessages());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % messages.length);
        setIsVisible(true);
      }, 300);
    }, 4000);

    return () => clearInterval(interval);
  }, [messages.length]);

  const currentMessage = messages[currentIndex];
  const Icon = currentMessage.icon;

  const getTypeColor = (type: string) => {
    switch (type) {
      case "consensus": return "text-purple-400";
      case "oracle": return "text-blue-400";
      case "network": return "text-emerald-400";
      default: return "text-white/60";
    }
  };

  const getTypeBg = (type: string) => {
    switch (type) {
      case "consensus": return "bg-purple-500/20 border-purple-500/30";
      case "oracle": return "bg-blue-500/20 border-blue-500/30";
      case "network": return "bg-emerald-500/20 border-emerald-500/30";
      default: return "bg-white/10 border-white/20";
    }
  };

  return (
    <div className="relative w-full overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 via-transparent to-purple-500/5" />
      
      {/* Main ticker bar */}
      <div className="relative flex items-center justify-center gap-3 py-2 px-4 bg-slate-900/50 border-y border-purple-500/10">
        {/* Live indicator */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="relative">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <div className="absolute inset-0 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          </div>
          <span className="text-[10px] text-emerald-400 font-mono uppercase tracking-widest">Live</span>
        </div>

        {/* Divider */}
        <div className="w-px h-4 bg-white/10" />

        {/* Activity message */}
        <div 
          className={`flex items-center gap-2 transition-all duration-300 ${
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          }`}
        >
          {/* Type badge */}
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono uppercase tracking-wider border ${getTypeBg(currentMessage.type)} ${getTypeColor(currentMessage.type)}`}>
            <Icon className="h-2.5 w-2.5" />
            {currentMessage.type}
          </span>

          {/* Message */}
          <span className="text-[11px] text-white/70 font-mono truncate max-w-[400px]">
            {currentMessage.message}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1 ml-auto flex-shrink-0">
          {messages.slice(0, 5).map((_, i) => (
            <div
              key={i}
              className={`w-1 h-1 rounded-full transition-all duration-300 ${
                i === currentIndex % 5 
                  ? "bg-purple-400 w-3" 
                  : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Bottom glow line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
    </div>
  );
};
