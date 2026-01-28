import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VerifiedBadgeProps {
  verified: boolean;
  className?: string;
}

export const VerifiedBadge = ({ verified, className }: VerifiedBadgeProps) => {
  if (!verified) return null;

  return (
    <Badge variant="success" className={className}>
      <CheckCircle2 className="h-3 w-3 mr-1" />
      Verified
    </Badge>
  );
};
