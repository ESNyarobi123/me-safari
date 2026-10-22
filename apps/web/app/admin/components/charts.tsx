'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';

export interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

const PALETTE = ['#ff7b00', '#0a2540', '#0d7c79', '#f59e0b', '#e11d48', '#2563eb', '#10b981'];

export function chartColor(index: number): string {
  return PALETTE[index % PALETTE.length]!;
}

function niceMax(value: number): number {
  if (value <= 0) return 10;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const normalised = value / magnitude;
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10;
  return step * magnitude;
}

function compact(value: number): string {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

/* --------------------------------------------------------------- sparkline -- */

export function Sparkline({
  values,
  color = '#ff7b00',
  height = 40,
  filled = true,
}: {
  values: number[];
  color?: string;
  height?: number;
  filled?: boolean;
}) {
  const id = useId().replace(/:/g, '');
  const width = 160;
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : width;

  const points = values.map((value, index) => {
    const x = index * step;
    const y = height - ((value - min) / span) * (height - 6) - 3;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} preserveAspectRatio="none" role="img" aria-hidden>
      <defs>
        <linearGradient id={`spark-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {filled ? (
        <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} fill={`url(#spark-${id})`} />
      ) : null}
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

/* -------------------------------------------------------------- bar series -- */

export function BarSeriesChart({
  labels,
  series,
  height = 260,
  stacked = true,
  valueFormatter = compact,
}: {
  labels: string[];
  series: Series[];
  height?: number;
  stacked?: boolean;
  valueFormatter?: (value: number) => string;
}) {
  const hover = useHoverIndex(labels.length);

  const totals = useMemo(() => {
    if (!stacked) {
      const flat = series.flatMap((entry) => entry.values);
      return niceMax(flat.length ? Math.max(...flat) : 10);
    }
    return niceMax(
      Math.max(
        ...labels.map((_, index) => series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0)),
        10,
      ),
    );
  }, [labels, series, stacked]);

  const ticks = [0, 0.25, 0.5, 0.75, 1];
  const groupWidth = 100 / Math.max(labels.length, 1);

  return (
    <div className="relative w-full" style={{ height }} onMouseLeave={hover.clear}>
      <div className="absolute inset-0 flex flex-col justify-between">
        {ticks
          .slice()
          .reverse()
          .map((tick) => (
            <div key={tick} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-right text-[10px] text-muted tabular-nums">
                {valueFormatter(totals * tick)}
              </span>
              <span className="h-px flex-1 bg-separator" />
            </div>
          ))}
      </div>

      <div className="relative ml-12 flex h-full items-end">
        {labels.map((label, index) => {
          const groupTotal = stacked ? series.reduce((sum, entry) => sum + (entry.values[index] ?? 0), 0) : 0;
          return (
            <div
              key={`${label}-${index}`}
              className="group relative flex h-full flex-1 flex-col justify-end px-[3px]"
              onMouseEnter={() => hover.set(index)}
            >
              <div
                className="flex w-full flex-col justify-end gap-[2px] transition-opacity"
                style={{ height: '100%' }}
              >
                {series.map((entry) => {
                  const value = entry.values[index] ?? 0;
                  const scale = stacked ? groupTotal : totals;
                  const percent = scale > 0 ? (value / scale) * 100 : 0;
                  return (
                    <span
                      key={entry.key}
                      className="block w-full rounded-[6px] transition-transform group-hover:brightness-110"
                      style={{
                        height: `${Math.max(percent, value > 0 ? 4 : 0)}%`,
                        background: entry.color,
                        opacity: stacked ? 1 : 0.92,
                      }}
                    />
                  );
                })}
              </div>
              <span className="mt-1.5 block truncate text-center text-[10px] text-muted">{label}</span>
            </div>
          );
        })}

        {hover.index !== null && labels[hover.index] ? (
          <div
            className="pointer-events-none absolute bottom-full z-10 mb-2 w-max -translate-x-1/2 rounded-xl border border-separator bg-overlay px-3 py-2 shadow-overlay"
            style={{ left: `${(hover.index + 0.5) * groupWidth}%` }}
          >
            <p className="font-ui mb-1 text-[11px] font-semibold text-foreground">{labels[hover.index]}</p>
            {series.map((entry) => (
              <p key={entry.key} className="flex items-center justify-between gap-4 text-[11px] text-muted">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: entry.color }} />
                  {entry.label}
                </span>
                <span className="font-medium text-foreground tabular-nums">
                  {valueFormatter(entry.values[hover.index!] ?? 0)}
                </span>
              </p>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------- donut -- */

export interface Slice {
  label: string;
  value: number;
  color?: string;
}

export function DonutChart({
  slices,
  size = 190,
  thickness = 22,
  centerLabel = 'Total',
  centerValue,
  valueFormatter = compact,
}: {
  slices: Slice[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerValue?: ReactNode;
  valueFormatter?: (value: number) => string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-wrap items-center justify-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Breakdown">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="var(--separator)"
              strokeWidth={thickness}
            />
            {slices.map((slice, index) => {
              const fraction = total > 0 ? slice.value / total : 0;
              const dash = fraction * circumference;
              const circle = (
                <circle
                  key={slice.label}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="none"
                  stroke={slice.color ?? chartColor(index)}
                  strokeWidth={thickness}
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="butt"
                />
              );
              offset += dash;
              return circle;
            })}
          </g>
        </svg>
        <div className="absolute inset-0 grid place-content-center text-center">
          <p className="text-[11px] tracking-wide text-muted uppercase">{centerLabel}</p>
          <p className="font-ui text-xl font-semibold text-foreground tabular-nums">
            {centerValue ?? valueFormatter(total)}
          </p>
        </div>
      </div>

      <ul className="min-w-0 flex-1 space-y-2">
        {slices.map((slice, index) => (
          <li key={slice.label} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: slice.color ?? chartColor(index) }}
              />
              <span className="truncate text-foreground">{slice.label}</span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              <span className="text-muted tabular-nums">{valueFormatter(slice.value)}</span>
              <span className="w-10 text-end text-xs text-muted tabular-nums">
                {total > 0 ? `${Math.round((slice.value / total) * 100)}%` : '0%'}
              </span>
            </span>
          </li>
        ))}
        {slices.length === 0 ? <li className="text-sm text-muted">No data in this period.</li> : null}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------ horizontal bars */

export function RankedBars({
  rows,
  valueFormatter = compact,
}: {
  rows: Array<{ label: string; value: number; hint?: string }>;
  valueFormatter?: (value: number) => string;
}) {
  const max = Math.max(...rows.map((row) => row.value), 1);
  return (
    <ul className="space-y-3">
      {rows.map((row, index) => (
        <li key={row.label}>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <span className="truncate text-sm text-foreground">{row.label}</span>
            <span className="shrink-0 text-xs text-muted tabular-nums">
              {row.hint ? <span className="mr-2">{row.hint}</span> : null}
              {valueFormatter(row.value)}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[#F6F3ED] dark:bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(row.value / max) * 100}%`, background: chartColor(index) }}
            />
          </div>
        </li>
      ))}
      {rows.length === 0 ? <li className="text-sm text-muted">Nothing to rank yet.</li> : null}
    </ul>
  );
}

/* -------------------------------------------------------------- hover state -- */

function useHoverIndex(length: number) {
  const [index, setIndex] = useState<number | null>(null);
  return {
    index: index !== null && index < length ? index : null,
    set: setIndex,
    clear: () => setIndex(null),
  };
}
