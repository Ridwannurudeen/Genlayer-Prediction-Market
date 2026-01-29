import { Brain, Globe, Users, Trophy, ArrowRight, CheckCircle2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const HowItWorks = () => {
  const steps = [
    {
      icon: Globe,
      title: "Market Ends",
      description: "Trading closes at the specified end date",
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      icon: Brain,
      title: "AI Validators Analyze",
      description: "Validators fetch real-world data and use LLMs to determine the outcome",
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      icon: Users,
      title: "Consensus Reached",
      description: "Multiple validators must agree on the same outcome",
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
    {
      icon: Trophy,
      title: "Winners Claim",
      description: "Winning traders automatically receive their share of the pool",
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
  ];

  return (
    <Card className="border-border overflow-hidden">
      <CardContent className="p-0">
        {/* Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Brain className="h-5 w-5 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-base sm:text-lg">How GenLayer Resolution Works</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                No oracles. No manual resolution. Pure AI-powered truth.
              </p>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((step, index) => (
              <div key={index} className="relative">
                <div className="flex flex-col items-center text-center p-4 rounded-lg border border-border bg-card hover:bg-muted/50 transition-colors">
                  {/* Step Number */}
                  <div className="absolute -top-2 -left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    {index + 1}
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-12 h-12 rounded-full ${step.bgColor} flex items-center justify-center mb-3`}>
                    <step.icon className={`h-6 w-6 ${step.color}`} />
                  </div>
                  
                  {/* Content */}
                  <h4 className="font-medium text-sm mb-1">{step.title}</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow (hidden on mobile and after last item) */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:flex absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Key Benefits */}
          <div className="mt-6 pt-4 border-t border-border">
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Trustless resolution</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Real-time data analysis</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Multi-validator consensus</span>
              </div>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Automatic payouts</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
