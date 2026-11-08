import { Mascot } from "@/components/mascot";

export function DashboardGarden() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden h-40 w-48 shrink-0 self-end md:block"
    >
      <div className="absolute inset-x-3 bottom-1 border-b border-primary/30" />
      <Mascot pose="happy" className="absolute bottom-0 end-0 size-40" />
      <img
        src="/sprites/grass-2.svg"
        width="38"
        height="34"
        alt=""
        className="absolute bottom-1 start-0 [image-rendering:pixelated]"
      />
      <img
        src="/sprites/flower-2.svg"
        width="28"
        height="36"
        alt=""
        className="absolute start-7 bottom-1 [image-rendering:pixelated]"
      />
    </div>
  );
}
