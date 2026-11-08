import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <img
      src="/brand/campfire-clasped-hands.svg"
      width="900"
      height="900"
      alt=""
      aria-hidden="true"
      className={cn("size-12 shrink-0 object-contain", className)}
    />
  );
}
