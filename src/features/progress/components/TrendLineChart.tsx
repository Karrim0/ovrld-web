"use client";

interface TrendPoint {
  label: string;
  value: number;
}

export function TrendLineChart({
  points,
  valueLabel,
  formatValue = (value) => Math.round(value).toString(),
  emptyMessage = "مفيش بيانات تقدم لسه.",
}: {
  points: TrendPoint[];
  valueLabel: string;
  formatValue?: (value: number) => string;
  emptyMessage?: string;
}) {
  if (points.length === 0 || points.every((point) => point.value === 0)) {
    return <div className="grid h-48 place-items-center rounded-2xl border border-dashed text-sm text-neutral-500">{emptyMessage}</div>;
  }

  const width = 640;
  const height = 230;
  const paddingX = 38;
  const paddingTop = 24;
  const paddingBottom = 42;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxValue = Math.max(1, ...points.map((point) => point.value));
  const minValue = Math.min(0, ...points.map((point) => point.value));
  const span = Math.max(1, maxValue - minValue);
  const coordinates = points.map((point, index) => ({
    ...point,
    x: paddingX + (points.length === 1 ? chartWidth / 2 : index / (points.length - 1) * chartWidth),
    y: paddingTop + chartHeight - ((point.value - minValue) / span) * chartHeight,
  }));
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const area = `${paddingX},${paddingTop + chartHeight} ${polyline} ${paddingX + chartWidth},${paddingTop + chartHeight}`;
  const labelIndexes = new Set([0, Math.floor((points.length - 1) / 2), points.length - 1]);

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-black/20 p-2">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label={`رسم تطور ${valueLabel}`}>
        <title>{valueLabel} التطور</title>
        {[0, 0.5, 1].map((ratio) => {
          const y = paddingTop + chartHeight * ratio;
          const value = maxValue - span * ratio;
          return (
            <g key={ratio}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="currentColor" strokeOpacity="0.09" />
              <text x="4" y={y + 4} fontSize="11" fill="currentColor" opacity="0.45">{formatValue(Math.max(0, value))}</text>
            </g>
          );
        })}
        <polygon points={area} className="fill-emerald-300/10" />
        <polyline points={polyline} fill="none" className="stroke-emerald-300" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
        {coordinates.map((point, index) => (
          <g key={`${point.label}-${index}`}>
            <circle cx={point.x} cy={point.y} r="5" className="fill-neutral-950 stroke-emerald-300" strokeWidth="3" />
            {labelIndexes.has(index) ? <text x={point.x} y={height - 12} textAnchor="middle" fontSize="12" fill="currentColor" opacity="0.55">{point.label}</text> : null}
            <title>{point.label}: {formatValue(point.value)}</title>
          </g>
        ))}
      </svg>
    </div>
  );
}
