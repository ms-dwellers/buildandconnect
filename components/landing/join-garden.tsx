import "./hero-scene.css";

export function JoinGardenTrees() {
  return (
    <div
      aria-hidden="true"
      className="relative order-last h-[226px] w-[180px] self-end justify-self-center lg:order-0"
    >
      <img
        src="/sprites/tree-1.svg"
        width="129"
        height="226"
        alt=""
        className="absolute bottom-0 left-0 max-w-none [image-rendering:pixelated]"
      />
      <img
        src="/sprites/tree-4.svg"
        width="60"
        height="158"
        alt=""
        className="absolute right-0 bottom-0 max-w-none [image-rendering:pixelated]"
      />
      <img
        src="/sprites/grass-1.svg"
        width="52"
        height="40"
        alt=""
        className="absolute bottom-0 left-6 max-w-none [image-rendering:pixelated]"
      />
      <img
        src="/sprites/flower-2.svg"
        width="28"
        height="36"
        alt=""
        className="absolute right-8 bottom-0 max-w-none [image-rendering:pixelated]"
      />
    </div>
  );
}

export function JoinGardenBorder() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0">
      <div className="hero-water" />
      <div className="hero-ground" />
      <div className="absolute inset-x-0 bottom-[94px] h-16 overflow-hidden">
        {[0, 12, 23, 37, 49, 61, 74, 87, 97].map((left, index) => (
          <img
            key={`grass-${left}`}
            src={`/sprites/grass-${(index % 3) + 1}.svg`}
            width={[26, 19, 31][index % 3] * 2}
            height={[20, 17, 31][index % 3] * 2}
            alt=""
            className="absolute bottom-0 max-w-none [image-rendering:pixelated]"
            style={{ left: `${left}%` }}
          />
        ))}
        {[6, 21, 43, 67, 82, 94].map((left, index) => (
          <img
            key={`rose-${left}`}
            src={`/sprites/flower-${(index % 3) + 2}.svg`}
            width="28"
            height={index % 3 === 1 ? 38 : 36}
            alt=""
            className="absolute bottom-0 max-w-none [image-rendering:pixelated]"
            style={{ left: `${left}%` }}
          />
        ))}
      </div>
    </div>
  );
}
