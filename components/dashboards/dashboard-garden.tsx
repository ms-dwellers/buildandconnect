export function DashboardGarden() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none relative hidden h-48 w-52 shrink-0 self-end md:block"
    >
      <div className="absolute end-6 top-2 size-16 rounded-full bg-illustration-sun/80" />
      <div className="absolute inset-x-0 bottom-0 h-14 rounded-t-[100%] bg-primary/10" />
      <img
        src="/sprites/tree-4.svg"
        width="60"
        height="158"
        alt=""
        className="absolute bottom-3 start-14 [image-rendering:pixelated]"
      />
      <img
        src="/sprites/grass-2.svg"
        width="38"
        height="34"
        alt=""
        className="absolute bottom-3 start-7 [image-rendering:pixelated]"
      />
      <img
        src="/sprites/flower-2.svg"
        width="28"
        height="36"
        alt=""
        className="absolute end-8 bottom-3 [image-rendering:pixelated]"
      />
    </div>
  );
}
