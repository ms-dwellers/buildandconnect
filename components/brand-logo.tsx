import { cn } from "@/lib/utils";
import { Mascot } from "@/components/mascot";

export function BrandLogo({ className }: { className?: string }) {
  return <Mascot className={cn("size-11", className)} />;
}
