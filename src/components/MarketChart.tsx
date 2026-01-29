import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";
import { PricePoint } from "@/types/market";
import { Activity, Brain, Database } from "lucide-react";

interface MarketChartProps {
  data: PricePoint[];
  className?: string;
}

// Neural Mesh Empty State Animation
const NeuralMeshAnimation = () => {
  return (
    <div className="relative w-full h-full overflow-hidden rounded-lg bg-slate-900/50">
      {/* Animated grid background */}
      <svg className="absolute inset-0 w-full h-full">
        <defs>
          {/* Animated gradient for the mesh lines */}
          <linearGradient id="meshGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0)" />
            <stop offset="50%" stopColor="rgba(168, 85, 247, 0.3)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
            <animate
              attributeName="x1"
              values="0%;100%;0%"
              dur="3s"
              repeatCount="indefinite"
            />
            <animate
              attributeName="x2"
              values="100%;0%;100%"
              dur="3s"
              repeatCount="indefinite"
            />
          </linearGradient>
          
          {/* Pulse gradient for nodes */}
          <radialGradient id="nodeGlow">
            <stop offset="0%" stopColor="rgba(168, 85, 247, 0.8)" />
            <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
          </radialGradient>
        </defs>
        
        {/* Horizontal mesh lines */}
        {[...Array(6)].map((_, i) => (
          <line
            key={`h-${i}`}
            x1="0"
            y1={`${(i + 1) * 15}%`}
            x2="100%"
            y2={`${(i + 1) * 15}%`}
            stroke="url(#meshGradient)"
            strokeWidth="1"
            opacity="0.3"
          >
            <animate
              attributeName="opacity"
              values="0.1;0.4;0.1"
              dur={`${2 + i * 0.5}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
        
        {/* Vertical mesh lines */}
        {[...Array(8)].map((_, i) => (
          <line
            key={`v-${i}`}
            x1={`${(i + 1) * 11}%`}
            y1="0"
            x2={`${(i + 1) * 11}%`}
            y2="100%"
            stroke="url(#meshGradient)"
            strokeWidth="1"
            opacity="0.2"
          >
            <animate
              attributeName="opacity"
              values="0.1;0.3;0.1"
              dur={`${2.5 + i * 0.3}s`}
              repeatCount="indefinite"
            />
          </line>
        ))}
        
        {/* Animated connection nodes */}
        {[
          { cx: "20%", cy: "30%", delay: 0 },
          { cx: "50%", cy: "50%", delay: 0.5 },
          { cx: "80%", cy: "40%", delay: 1 },
          { cx: "35%", cy: "70%", delay: 1.5 },
          { cx: "65%", cy: "25%", delay: 2 },
        ].map((node, i) => (
          <g key={i}>
            {/* Outer pulse ring */}
            <circle
              cx={node.cx}
              cy={node.cy}
              r="8"
              fill="none"
              stroke="rgba(168, 85, 247, 0.3)"
              strokeWidth="1"
            >
              <animate
                attributeName="r"
                values="4;12;4"
                dur="2s"
                begin={`${node.delay}s`}
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.5;0;0.5"
                dur="2s"
                begin={`${node.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
            
            {/* Core node */}
            <circle
              cx={node.cx}
              cy={node.cy}
              r="3"
              fill="url(#nodeGlow)"
            >
              <animate
                attributeName="r"
                values="2;4;2"
                dur="1.5s"
                begin={`${node.delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          </g>
        ))}
        
        {/* Connecting lines between nodes */}
        <path
          d="M 20% 30% Q 35% 40% 50% 50% T 80% 40%"
          fill="none"
          stroke="rgba(168, 85, 247, 0.2)"
          strokeWidth="1"
          strokeDasharray="5 5"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-20"
            dur="1s"
            repeatCount="indefinite"
          />
        </path>
        
        <path
          d="M 35% 70% Q 50% 60% 65% 25%"
          fill="none"
          stroke="rgba(139, 92, 246, 0.2)"
          strokeWidth="1"
          strokeDasharray="5 5"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-20"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
      
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="relative mb-3">
          {/* Glow behind icon */}
          <div className="absolute inset-0 bg-purple-500 rounded-full blur-xl opacity-20 animate-pulse" />
          <div className="relative w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Activity className="h-6 w-6 text-purple-400 animate-pulse" />
          </div>
        </div>
        
        <p className="text-xs text-white/50 font-mono uppercase tracking-widest mb-1">
          Indexing Data
        </p>
        <p className="text-[10px] text-white/30 font-mono">
          Neural network processing...
        </p>
        
        {/* Processing indicators */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
            <Brain className="h-3 w-3 text-purple-400/60" />
            <span className="text-[9px] text-white/40 font-mono">AI</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-white/5 border border-white/10">
            <Database className="h-3 w-3 text-blue-400/60" />
            <span className="text-[9px] text-white/40 font-mono">FEED</span>
          </div>
        </div>
      </div>
      
      {/* Scan line effect */}
      <div 
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent"
        style={{
          animation: 'scanLine 3s ease-in-out infinite',
        }}
      />
      
      <style>{`
        @keyframes scanLine {
          0%, 100% { top: 10%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 90%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export const MarketChart = ({ data, className }: MarketChartProps) => {
  const formattedData = data.map((point) => ({
    ...point,
    date: new Date(point.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  }));

  const hasData = formattedData.length > 0;

  return (
    <Card className={`relative overflow-hidden bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-slate-800/50 backdrop-blur-xl border-white/10 ${className}`}>
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-blue-500/5" />
      
      <CardHeader className="relative pb-2">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-white/5 border border-white/10 flex items-center justify-center">
              <Activity className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Price History</span>
          </div>
          {hasData && (
            <span className="text-[9px] text-emerald-400/60 font-mono uppercase tracking-wider flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="relative">
        <div className="h-[200px] w-full">
          {hasData ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="probabilityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(168, 85, 247, 0.3)" />
                    <stop offset="50%" stopColor="rgba(168, 85, 247, 0.1)" />
                    <stop offset="100%" stopColor="rgba(168, 85, 247, 0)" />
                  </linearGradient>
                  <linearGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="rgba(139, 92, 246, 0.8)" />
                    <stop offset="50%" stopColor="rgba(168, 85, 247, 1)" />
                    <stop offset="100%" stopColor="rgba(192, 132, 252, 0.8)" />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                />
                <YAxis
                  domain={[0, 100]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10, fontFamily: "monospace" }}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(15, 23, 42, 0.95)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "8px",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                    fontSize: "11px",
                    fontFamily: "monospace",
                  }}
                  labelStyle={{ color: "rgba(255,255,255,0.7)" }}
                  itemStyle={{ color: "rgb(168, 85, 247)" }}
                  formatter={(value: number) => [`${value}%`, "Probability"]}
                />
                <Area
                  type="monotone"
                  dataKey="probability"
                  stroke="url(#lineGradient)"
                  strokeWidth={2}
                  fill="url(#probabilityGradient)"
                  dot={false}
                  activeDot={{
                    r: 4,
                    fill: "rgb(168, 85, 247)",
                    stroke: "rgba(168, 85, 247, 0.3)",
                    strokeWidth: 8,
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <NeuralMeshAnimation />
          )}
        </div>
      </CardContent>
    </Card>
  );
};
