import { useNavigate } from "react-router-dom";
import { TrendingUp, Clock, BarChart3 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProbabilityBar } from "./ProbabilityBar";
import { VerifiedBadge } from "./VerifiedBadge";
import { Market } from "@/types/market";

interface MarketTableProps {
  markets: Market[];
}

const formatVolume = (volume: number): string => {
  if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
  if (volume >= 1000) return `$${(volume / 1000).toFixed(0)}K`;
  return `$${volume}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

export const MarketTable = ({ markets }: MarketTableProps) => {
  const navigate = useNavigate();

  return (
    <Card className="glass overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="border-border/50 hover:bg-transparent">
            <TableHead className="text-muted-foreground font-semibold">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Event
              </div>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold w-[200px]">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Probability
              </div>
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold text-right">
              Volume
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              Category
            </TableHead>
            <TableHead className="text-muted-foreground font-semibold">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                End Date
              </div>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {markets.map((market) => (
            <TableRow
              key={market.id}
              onClick={() => navigate(`/market/${market.id}`)}
              className="cursor-pointer border-border/30 hover:bg-secondary/50 transition-colors group"
            >
              <TableCell className="py-4">
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-1">
                    {market.title}
                  </span>
                  <VerifiedBadge verified={market.verified} />
                </div>
              </TableCell>
              <TableCell>
                <ProbabilityBar probability={market.probability} />
              </TableCell>
              <TableCell className="text-right">
                <span className="font-mono text-sm text-muted-foreground">
                  {formatVolume(market.volume)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="font-medium">
                  {market.category}
                </Badge>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {formatDate(market.endDate)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
};
