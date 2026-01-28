import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ConnectionStatusProps {
  isConnected: boolean;
  className?: string;
}

export const ConnectionStatus = ({ isConnected, className }: ConnectionStatusProps) => {
  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      {isConnected ? (
        <>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yes opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yes"></span>
          </span>
          <span className="text-muted-foreground">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3 text-muted-foreground" />
          <span className="text-muted-foreground">Connecting...</span>
        </>
      )}
    </div>
  );
};
