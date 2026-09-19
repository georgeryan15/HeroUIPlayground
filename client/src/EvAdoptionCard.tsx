import { useEffect, useId, useState } from "react";
import { Button, Tooltip } from "@heroui/react";
import { ArrowUp, CirclePlus } from "lucide-react";
import {
  Area,
  ComposedChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";
import { TOOLTIP_CLASS, TooltipArrow } from "./UtilizationCharts";

/* ---------------------------------------------------------------------------
   EV adoption card.

   Address header, three headline stats, a BEV/PHEV growth chart that switches
   from solid history to a dashed projection at "today", and a top-5 makes list.
   Every colour and dimension is sampled from the reference screenshot; the chart
   is Recharts with the axes, split line and legend drawn as plain HTML so the
   labels can sit exactly where the design puts them.
   --------------------------------------------------------------------------- */

export type YoYStat = { label: string; value: string; yoy: number };
export type MakeStat = { name: string; count: number; yoy: number };
export type TrendPoint = {
  /** Calendar month as "YYYY-MM". */
  month: string;
  bev: number;
  phev: number;
  /** True for forecast points. The last historical point starts the projection. */
  projected: boolean;
};

/* ---- Sample data ---------------------------------------------------------- */

const SAMPLE_STATS: YoYStat[] = [
  { label: "EV Adoption rate", value: "10.7%", yoy: 15 },
  { label: "BEVs + PHEVs", value: "69,699", yoy: 17 },
  { label: "Total vehicles", value: "654,301", yoy: 2 },
];

const SAMPLE_MAKES: MakeStat[] = [
  { name: "Tesla", count: 36062, yoy: 13 },
  { name: "BMW", count: 3531, yoy: 24 },
  { name: "Toyota", count: 3448, yoy: 12 },
  { name: "Hyundai", count: 2559, yoy: 48 },
  { name: "Ford", count: 2537, yoy: 18 },
];

/**
 * Half-yearly history from Dec '22 to Jul '25, then a decelerating projection
 * to Jul '27. Vehicle counts; BEV + PHEV at Jul '25 matches the headline stat.
 */
const SAMPLE_TREND: TrendPoint[] = [
  { month: "2022-12", bev: 13800, phev: 7950, projected: false },
  { month: "2023-07", bev: 22000, phev: 9200, projected: false },
  { month: "2024-01", bev: 29450, phev: 10250, projected: false },
  { month: "2024-07", bev: 38200, phev: 11100, projected: false },
  { month: "2025-01", bev: 47400, phev: 12150, projected: false },
  { month: "2025-07", bev: 57000, phev: 12700, projected: false },
  { month: "2026-01", bev: 66400, phev: 15150, projected: true },
  { month: "2026-07", bev: 75850, phev: 17500, projected: true },
  { month: "2027-01", bev: 82750, phev: 18400, projected: true },
  { month: "2027-07", bev: 89600, phev: 19250, projected: true },
];

/** Evenly spread under the plot; the design does not tie them to data positions. */
const SAMPLE_AXIS_LABELS = [
  "Dec '22",
  "Jul '24",
  "Jul '25",
  "Jul '26",
  "Jul '27",
];

/* ---- Design tokens (sampled from the reference) --------------------------- */
const INK = "#1d1d17";
const MUTED = "#737373";
const STAT_LABEL = "#6f6f6f";
const AXIS_LABEL = "#8c8c8c";
const POSITIVE = "#659e57";
const RULE = "#f0f0f0";
const STAT_BG = "#f7f7f7";
const STAT_RULE = "#ededed";
const BEV = "#7bbe6c";
const PHEV = "#6981ed";
/** Top opacity of the green wash under the BEV line; it fades to 0 at the baseline. */
const FILL_ALPHA = 0.18;

/* ---- Geometry (CSS px) ---------------------------------------------------- */
const PLOT_HEIGHT = 96;
const STROKE = 2;
/** Space left above the tallest value, as a fraction of it. */
const HEADROOM = 0.058;
/** Dash / gap for the projected half, before the round caps eat into the gap. */
const DASH = "5 4";
/** Hover dot diameter, including its white ring. */
const DOT = 8;
/** Width of the hover line joining the two dots. */
const HOVER_LINE = 2;
const HOVER_LINE_COLOR = "#d4d4d4";

/* ---- Entrance animation --------------------------------------------------- */

const REVEAL_MS = 900;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/** Eased 0..1 progress for a left-to-right reveal; instant under reduced motion. */
function useReveal() {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) return;
    let start: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      start ??= now;
      const t = Math.min(1, (now - start) / REVEAL_MS);
      setProgress(easeOutCubic(t));
      if (t < 1) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [reduceMotion]);

  return progress;
}

/* ---- Shared pieces -------------------------------------------------------- */

function YoY({ value, className = "" }: { value: number; className?: string }) {
  const up = value >= 0;
  return (
    <span
      className={`flex items-center gap-0.5 text-xs leading-4 whitespace-nowrap ${className}`}
      style={{ color: POSITIVE }}
    >
      <ArrowUp
        size={12}
        strokeWidth={2}
        className={up ? undefined : "rotate-180"}
        aria-hidden="true"
      />
      {up ? "+" : "-"}
      {Math.abs(value)}% YoY
    </span>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[11px] font-medium uppercase leading-4 tracking-[0.06em]"
      style={{ color: MUTED }}
    >
      {children}
    </p>
  );
}

/* ---- Growth chart --------------------------------------------------------- */

const monthIndex = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + m;
};

/**
 * History occupies the left half of the plot and the projection the right,
 * whatever the two date spans are, so the split line always sits at the
 * centre. Within each half, points are spaced by calendar month. The last
 * historical point is repeated so both line styles meet there.
 */
function positioned(data: TrendPoint[]) {
  const history = data.filter((d) => !d.projected);
  const projection = data.filter((d) => d.projected);
  const split = history[history.length - 1];
  const spread = (
    points: TrendPoint[],
    from: number,
    to: number,
    projected: boolean
  ) => {
    const m0 = monthIndex(points[0].month);
    const m1 = monthIndex(points[points.length - 1].month);
    return points.map((p) => ({
      ...p,
      x:
        from +
        ((to - from) * (monthIndex(p.month) - m0)) / Math.max(1, m1 - m0),
      bevHistory: projected ? null : p.bev,
      bevProjected: projected ? p.bev : null,
      phevHistory: projected ? null : p.phev,
      phevProjected: projected ? p.phev : null,
    }));
  };
  return [
    ...spread(history, 0, 0.5, false),
    ...spread([split, ...projection], 0.5, 1, true),
  ];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2025-07" -> "Jul 2025" */
const formatMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
};

type PlottedPoint = TrendPoint & { x: number };

/**
 * Invisible hover target for one data point. The trigger itself is a zero-width
 * column at the point, so the tooltip and hover line centre on it; the child
 * widens the hit area to the midpoints with its neighbours (in cqw of the plot).
 */
function PointTrigger({
  point,
  from,
  to,
  yMax,
  active,
  onOpenChange,
}: {
  point: PlottedPoint;
  from: number;
  to: number;
  yMax: number;
  active: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const series = [
    { label: "BEV", value: point.bev, color: BEV },
    { label: "PHEV", value: point.phev, color: PHEV },
  ];
  const month = formatMonth(point.month);
  const dotY = (value: number) => PLOT_HEIGHT * (1 - value / yMax);
  const dotYs = series.map((s) => dotY(s.value));

  return (
    <Tooltip delay={0} closeDelay={0} onOpenChange={onOpenChange}>
      <Tooltip.Trigger
        aria-label={`${month}${point.projected ? " (projected)" : ""}: ${series
          .map((s) => `${s.label} ${s.value.toLocaleString("en-US")}`)
          .join(", ")}`}
        className="absolute inset-y-0 w-0 outline-none"
        style={{ left: `${point.x * 100}%` }}
      >
        <div
          className="absolute inset-y-0"
          style={{
            left: `${(from - point.x) * 100}cqw`,
            width: `${(to - from) * 100}cqw`,
          }}
        />
        {active && (
          <>
            <div
              className="pointer-events-none absolute -translate-x-1/2"
              style={{
                top: Math.min(...dotYs),
                height: Math.max(...dotYs) - Math.min(...dotYs),
                width: HOVER_LINE,
                background: HOVER_LINE_COLOR,
              }}
            />
            {series.map((s) => (
              <span
                key={s.label}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                style={{
                  top: dotY(s.value),
                  width: DOT,
                  height: DOT,
                  background: s.color,
                  boxSizing: "content-box",
                }}
              />
            ))}
          </>
        )}
      </Tooltip.Trigger>
      <Tooltip.Content
        showArrow
        placement="top"
        offset={7}
        className={`${TOOLTIP_CLASS} px-2.5 py-2`}
      >
        <TooltipArrow />
        <div className="w-[130px]">
          <p className="font-semibold">
            {month}
            {point.projected && (
              <span className="font-normal text-[#bbbbba]"> · Projected</span>
            )}
          </p>
          <ul className="mt-1.5 flex flex-col gap-1">
            {series.map((s) => (
              <li key={s.label} className="flex items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ background: s.color }}
                  aria-hidden="true"
                />
                <span className="text-[#bbbbba]">{s.label}</span>
                <span className="ml-auto font-semibold tabular-nums">
                  {s.value.toLocaleString("en-US")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Tooltip.Content>
    </Tooltip>
  );
}

function GrowthChart({ data }: { data: TrendPoint[] }) {
  // useId's delimiters are not safe inside url(#...) references.
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const fillId = `${id}-fill`;
  const clipId = `${id}-clip`;
  const progress = useReveal();
  const points = positioned(data);
  const max = Math.max(...data.map((d) => Math.max(d.bev, d.phev)));
  const yMax = max * (1 + HEADROOM);
  const [active, setActive] = useState<number | null>(null);
  // positioned() repeats the split point to join the two line styles; hover
  // targets want each month once.
  const targets = points.filter(
    (p, i) => i === 0 || p.month !== points[i - 1].month
  );

  const line = (key: string, color: string, dashed: boolean) => (
    <Line
      key={key}
      dataKey={key}
      type="monotone"
      stroke={color}
      strokeWidth={STROKE}
      strokeLinecap="round"
      strokeDasharray={dashed ? DASH : undefined}
      dot={false}
      activeDot={false}
      isAnimationActive={false}
    />
  );

  return (
    <div className="@container relative" style={{ height: PLOT_HEIGHT }}>
      {/* Today marker, beneath the chart so the green wash tints it. */}
      <div
        className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
        style={{ background: RULE }}
        aria-hidden="true"
      />
      <ResponsiveContainer width="100%" height={PLOT_HEIGHT}>
        <ComposedChart
          data={points}
          margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={BEV} stopOpacity={FILL_ALPHA} />
              <stop offset="1" stopColor={BEV} stopOpacity={0} />
            </linearGradient>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={`${progress * 100}%`} height="100%" />
            </clipPath>
          </defs>
          <XAxis dataKey="x" type="number" domain={[0, 1]} hide />
          <YAxis domain={[0, yMax]} hide />
          <g clipPath={`url(#${clipId})`}>
            <Area
              dataKey="bev"
              type="monotone"
              stroke="none"
              fill={`url(#${fillId})`}
              fillOpacity={1}
              isAnimationActive={false}
              activeDot={false}
            />
            {line("bevHistory", BEV, false)}
            {line("bevProjected", BEV, true)}
            {line("phevHistory", PHEV, false)}
            {line("phevProjected", PHEV, true)}
          </g>
        </ComposedChart>
      </ResponsiveContainer>
      {targets.map((p, i) => (
        <PointTrigger
          key={p.month}
          point={p}
          from={i === 0 ? 0 : (targets[i - 1].x + p.x) / 2}
          to={i === targets.length - 1 ? 1 : (p.x + targets[i + 1].x) / 2}
          yMax={yMax}
          active={active === i}
          onOpenChange={(open) =>
            setActive((prev) => (open ? i : prev === i ? null : prev))
          }
        />
      ))}
    </div>
  );
}

/* ---- Public component ----------------------------------------------------- */

export default function EvAdoptionCard({
  address = "13332 Express Wy",
  locality = "Los Angeles, CA 90001",
  stats = SAMPLE_STATS,
  trend = SAMPLE_TREND,
  axisLabels = SAMPLE_AXIS_LABELS,
  makes = SAMPLE_MAKES,
  className = "",
}: {
  address?: string;
  locality?: string;
  stats?: YoYStat[];
  trend?: TrendPoint[];
  axisLabels?: string[];
  makes?: MakeStat[];
  className?: string;
}) {
  return (
    <div
      className={`min-w-[378px] rounded-2xl bg-white tracking-normal shadow-sm ${className}`}
      style={{ color: INK }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between border-b px-5 pt-5 pb-4"
        style={{ borderColor: RULE }}
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-base font-medium leading-6 tracking-[-0.01em]">
            {address}
          </span>
          <span className="text-sm leading-5" style={{ color: MUTED }}>
            {locality}
          </span>
        </div>
        <Button
          variant="outline"
          className="h-[34px] gap-1.5 rounded-full border px-3 text-sm font-medium shadow-none"
          style={{ borderColor: "#ebebeb", color: INK, background: "#fff" }}
        >
          {/* HeroUI pulls button icons 2px into the padding; the design does not. */}
          <CirclePlus size={16} style={{ margin: 0 }} aria-hidden="true" />
          Report
        </Button>
      </div>

      <div className="px-5 pt-5 pb-[31px] tabular-nums">
        {/* Headline stats */}
        <dl
          className="flex flex-col rounded-[14px] px-3"
          style={{ background: STAT_BG }}
        >
          {stats.map((s, i) => (
            <div
              key={s.label}
              className="box-content flex h-11 items-center justify-between"
              style={{
                borderTop: i ? `1px solid ${STAT_RULE}` : undefined,
              }}
            >
              <dt
                className="text-[13px] leading-4"
                style={{ color: STAT_LABEL }}
              >
                {s.label}
              </dt>
              <dd className="flex items-center gap-2">
                <span className="text-base font-medium leading-6 tracking-[-0.01em]">
                  {s.value}
                </span>
                <YoY value={s.yoy} />
              </dd>
            </div>
          ))}
        </dl>

        {/* Growth trends */}
        <div className="mt-4 flex items-center justify-between">
          <SectionHeading>Growth trends</SectionHeading>
          <ul
            className="flex items-center gap-3 text-[11px] font-medium leading-4"
            style={{ color: MUTED }}
          >
            {[
              ["BEV", BEV],
              ["PHEV", PHEV],
            ].map(([label, color]) => (
              <li key={label} className="flex items-center gap-1">
                <span
                  className="size-2 rounded-full"
                  style={{ background: color }}
                  aria-hidden="true"
                />
                {label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-2">
          <GrowthChart data={trend} />
        </div>
        <div
          className="mt-2 flex justify-between text-[10px] leading-4"
          style={{ color: AXIS_LABEL }}
        >
          {axisLabels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        {/* Top makes */}
        <div className="mt-4">
          <SectionHeading>Top 5 makes</SectionHeading>
        </div>
        <ol className="mt-1">
          {makes.map((m, i) => (
            <li
              key={m.name}
              className="flex items-center justify-between py-2 text-sm leading-5"
              style={{
                borderBottom:
                  i < makes.length - 1 ? `1px solid ${RULE}` : undefined,
              }}
            >
              <span>{m.name}</span>
              <span className="flex items-center gap-2">
                <span className="font-medium">
                  {m.count.toLocaleString("en-US")}
                </span>
                <YoY value={m.yoy} className="relative -top-px" />
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
