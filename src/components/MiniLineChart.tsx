import { useId, useMemo } from "react";

type Point = {
  x: string;
  y: number;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function MiniLineChart({
  points,
  height = 96,
}: {
  points: Point[];
  height?: number;
}) {
  const { path, area, minY, maxY } = useMemo(() => {
    if (!points.length) return { path: "", area: "", minY: 0, maxY: 0 };
    const ys = points.map((p) => p.y);
    const min = Math.min(...ys);
    const max = Math.max(...ys);
    const minYLocal = Math.floor(min);
    const maxYLocal = Math.ceil(max);
    const range = Math.max(1, maxYLocal - minYLocal);
    const width = 320;
    const pad = 10;
    const usableW = width - pad * 2;
    const usableH = height - pad * 2;

    const coords = points.map((p, idx) => {
      const x = pad + (idx / Math.max(1, points.length - 1)) * usableW;
      const normalized = (p.y - minYLocal) / range;
      const y = pad + (1 - normalized) * usableH;
      return { x, y };
    });

    const d = coords
      .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(" ");

    const a =
      `${d} L ${(pad + usableW).toFixed(1)} ${(pad + usableH).toFixed(1)}` +
      ` L ${pad.toFixed(1)} ${(pad + usableH).toFixed(1)} Z`;

    return { path: d, area: a, minY: minYLocal, maxY: maxYLocal };
  }, [points, height]);

  const hasData = points.length >= 2 && path;
  const reactId = useId();
  const gradientId = `grad-${reactId.replaceAll(":", "")}`;

  return (
    <div className="w-full">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 320 ${height}`}
        className="overflow-visible"
        role="img"
        aria-label="chart"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.22} />
            <stop offset="80%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>

        <rect
          x="0"
          y="0"
          width="320"
          height={height}
          rx="14"
          fill="rgba(255,255,255,0.55)"
          stroke="rgba(0,0,0,0.07)"
        />

        {hasData ? (
          <>
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={path}
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
            {points.slice(-1).map((p) => {
              const lastIdx = points.length - 1;
              const x = 10 + (lastIdx / Math.max(1, points.length - 1)) * (320 - 20);
              const range = Math.max(1, maxY - minY);
              const normalized = (p.y - minY) / range;
              const y = 10 + (1 - clamp(normalized, 0, 1)) * (height - 20);
              return (
                <g key={p.x}>
                  <circle cx={x} cy={y} r="5.8" fill="white" stroke="var(--accent)" strokeWidth="2" />
                </g>
              );
            })}
          </>
        ) : (
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            fontSize="12"
            fill="rgba(0,0,0,0.45)"
          >
            Belum ada data tren
          </text>
        )}
      </svg>
    </div>
  );
}
