import { useEffect, useState } from "react";
import { Tooltip } from "@heroui/react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { BarShapeProps, XAxisTickContentProps } from "recharts";

/* ---------------------------------------------------------------------------
   Utilization + occupancy charts.

   Recharts draws the bands and axes; every mark is a custom shape so the bars,
   labels and hover treatment match the reference design pixel for pixel. The
   tooltips are HeroUI's, anchored to an invisible column laid over each band,
   and the same open state drives the bar highlight.
   --------------------------------------------------------------------------- */

export type UtilizationPoint = { day: string; value: number };
export type OccupancyPoint = {
  day: string;
  veryBusy: number;
  busy: number;
  moderate: number;
  light: number;
};

const SAMPLE_UTILIZATION: UtilizationPoint[] = [
  { day: "Sun", value: 29.7 },
  { day: "Mon", value: 36.2 },
  { day: "Tue", value: 35.9 },
  { day: "Wed", value: 30.7 },
  { day: "Thu", value: 33.7 },
  { day: "Fri", value: 36.6 },
  { day: "Sat", value: 32.8 },
];

const SAMPLE_OCCUPANCY: OccupancyPoint[] = [
  { day: "Sun", veryBusy: 5.6, busy: 20.4, moderate: 31.1, light: 42.9 },
  { day: "Mon", veryBusy: 11.7, busy: 21.4, moderate: 31.1, light: 35.8 },
  { day: "Tue", veryBusy: 10.4, busy: 22.4, moderate: 31.8, light: 35.4 },
  { day: "Wed", veryBusy: 10.2, busy: 16.3, moderate: 29.1, light: 44.4 },
  { day: "Thu", veryBusy: 8.2, busy: 25.0, moderate: 27.0, light: 39.8 },
  { day: "Fri", veryBusy: 11.2, busy: 19.9, moderate: 36.2, light: 32.7 },
  { day: "Sat", veryBusy: 7.7, busy: 20.4, moderate: 34.7, light: 37.2 },
];

/* ---- Design tokens (greys sampled from the reference; bar colours ours) --- */
const INK = "#1d1d17";
const VALUE_LABEL = "#8c8c8c";
const VALUE_LABEL_FADED = "#cccccc";
const AXIS_LABEL = "#737373";
const HEADING = "#8c8c8c";

/** Non-hovered bars show at this opacity over the white card while a tooltip is open. */
const FADE = 0.4;

/** The colour at `alpha` opacity over white, flattened to a solid hex. */
function fade(hex: string, alpha: number) {
  const channel = (i: number) =>
    Math.round(255 - alpha * (255 - parseInt(hex.slice(i, i + 2), 16)));
  return `#${[1, 3, 5]
    .map((i) => channel(i).toString(16).padStart(2, "0"))
    .join("")}`;
}

const BLUE = "#5d9bf3";
/** Same hue and saturation as BLUE, five points darker. */
const BLUE_ACTIVE = "#458cf1";
const BLUE_FADED = fade(BLUE, FADE);

type OccupancyKey = Exclude<keyof OccupancyPoint, "day">;
/** Top to bottom of the stack, which is also the tooltip row order. */
const OCCUPANCY_LEVELS: ReadonlyArray<{
  key: OccupancyKey;
  label: string;
  color: string;
  faded: string;
}> = (
  [
    { key: "veryBusy", label: "Very Busy", color: "#ff5c52" },
    { key: "busy", label: "Busy", color: "#ff9e2e" },
    { key: "moderate", label: "Moderate", color: "#ffcc3f" },
    { key: "light", label: "Light", color: "#51c06a" },
  ] as const
).map((level) => ({ ...level, faded: fade(level.color, FADE) }));

const DAY_NAMES: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

/* ---- Geometry (CSS px) ---------------------------------------------------- */
const RADIUS = 5;
/** How far each stack segment extends up beneath the segment above it. */
const SEAM_OVERLAP = 0.5;
const LABEL_FONT = 12;
const LABEL_CAP = 9; // cap height of the 12px labels
const VALUE_LABEL_GAP = 8; // value label baseline to bar top

// Utilization chart: labels sit in the top margin, the tallest bar fills the plot.
const UTIL = { marginTop: 20, plot: 105, axis: 24, axisGap: 12 };
// Occupancy chart: every stack is 100%, so the plot height is the bar height.
const OCC = { marginTop: 2, plot: 98, axis: 28, axisGap: 16 };

/** How far the hover column starts above the value label's cap height. */
const TRIGGER_CLEARANCE = 2;

/* ---- Entrance animation --------------------------------------------------- */

/** Each bar grows from the baseline over `duration` ms, starting `stagger` ms after its neighbour. */
const ENTRANCE = { duration: 700, stagger: 60 };

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/**
 * Eased 0..1 progress per bar for the staggered load animation. Users who ask
 * for reduced motion get the finished chart straight away.
 */
function useEntrance(count: number) {
  const reduceMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [progress, setProgress] = useState<number[]>(() =>
    Array.from({ length: count }, () => (reduceMotion ? 1 : 0)),
  );

  useEffect(() => {
    if (reduceMotion) return;
    const { duration, stagger } = ENTRANCE;
    const total = duration + (count - 1) * stagger;
    let start: number | null = null;
    let frame = requestAnimationFrame(function tick(now) {
      start ??= now;
      const elapsed = now - start;
      setProgress(
        Array.from({ length: count }, (_, i) =>
          easeOutCubic(clamp01((elapsed - i * stagger) / duration)),
        ),
      );
      if (elapsed < total) frame = requestAnimationFrame(tick);
    });
    return () => cancelAnimationFrame(frame);
  }, [count, reduceMotion]);

  return progress;
}

export const TOOLTIP_CLASS =
  "rounded-[10px] bg-[#1d1d17] text-xs leading-4 text-white break-normal whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.15)]";

/* ---- Shared pieces -------------------------------------------------------- */

export function TooltipArrow() {
  return (
    <Tooltip.Arrow>
      <svg
        className="block"
        width="8"
        height="4"
        viewBox="0 0 8 4"
        style={{ fill: INK, stroke: "none" }}
        aria-hidden="true"
      >
        <path d="M0 0L4 4L8 0Z" />
      </svg>
    </Tooltip.Arrow>
  );
}

/** 1px black ring, 1px outside the bar's original bounds. */
function HoverRing({
  x,
  y,
  width,
  height,
}: {
  x: number;
  y: number;
  width: number;
  height: number;
}) {
  return (
    <rect
      x={x - 0.5}
      y={y - 0.5}
      width={width + 1}
      height={height + 1}
      rx={RADIUS + 0.5}
      fill="none"
      stroke="#000"
      strokeWidth={1}
    />
  );
}

/** Rectangle path with independent top and bottom corner radii. */
function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  rTop: number,
  rBottom: number,
) {
  const rt = Math.max(0, Math.min(rTop, w / 2, h));
  const rb = Math.max(0, Math.min(rBottom, w / 2, h));
  return [
    `M${x + rt},${y}`,
    `H${x + w - rt}`,
    rt ? `A${rt},${rt} 0 0 1 ${x + w},${y + rt}` : "",
    `V${y + h - rb}`,
    rb ? `A${rb},${rb} 0 0 1 ${x + w - rb},${y + h}` : "",
    `H${x + rb}`,
    rb ? `A${rb},${rb} 0 0 1 ${x},${y + h - rb}` : "",
    `V${y + rt}`,
    rt ? `A${rt},${rt} 0 0 1 ${x + rt},${y}` : "",
    "Z",
  ].join(" ");
}

function DayTick({
  x,
  y,
  payload,
  index,
  active,
  gap,
}: XAxisTickContentProps & { active: number | null; gap: number }) {
  const hovered = active === index;
  return (
    <text
      x={Number(x)}
      y={Number(y) + gap + LABEL_CAP}
      textAnchor="middle"
      fontSize={LABEL_FONT}
      fontWeight={hovered ? 600 : 400}
      fill={hovered ? INK : AXIS_LABEL}
    >
      {payload.value}
    </text>
  );
}

type HoverState = {
  active: number | null;
  setActive: (updater: (prev: number | null) => number | null) => void;
};

/** Invisible column over one band; hovering or focusing it opens the tooltip. */
function BandTrigger({
  index,
  label,
  top,
  offset,
  padding,
  hover,
  children,
}: {
  index: number;
  label: string;
  top: number;
  offset: number;
  /** Tooltip padding utilities; the reference uses different insets per chart. */
  padding: string;
  hover: HoverState;
  children: React.ReactNode;
}) {
  return (
    <Tooltip
      delay={0}
      closeDelay={0}
      onOpenChange={(open) =>
        hover.setActive((prev) =>
          open ? index : prev === index ? null : prev,
        )
      }
    >
      <Tooltip.Trigger
        aria-label={label}
        className="absolute bottom-0 block rounded-md"
        style={{ left: `${(index * 100) / 7}%`, width: `${100 / 7}%`, top }}
      />
      <Tooltip.Content
        showArrow
        placement="top"
        offset={offset}
        className={`${TOOLTIP_CLASS} ${padding}`}
      >
        <TooltipArrow />
        {children}
      </Tooltip.Content>
    </Tooltip>
  );
}

/* ---- Utilization (blue) --------------------------------------------------- */

function UtilizationBar({
  x,
  y,
  width,
  height,
  index,
  payload,
  active,
  progress,
}: BarShapeProps & { active: number | null; progress: number }) {
  const left = Math.round(x);
  const right = Math.round(x + width);
  const bottom = Math.round(y + height);
  // Snap the final geometry to whole pixels, then grow towards it from the
  // baseline. Animating the unrounded position keeps every frame sub-pixel
  // smooth and lands exactly on the crisp end state with no snap at the end.
  // The label rides on the bar and fades in with it.
  const top = bottom - (bottom - Math.round(y)) * progress;
  const w = right - left;
  const h = bottom - top;

  const hovered = active === index;
  const faded = active !== null && !hovered;
  const inset = hovered ? 1 : 0;
  const point = payload as UtilizationPoint;

  return (
    <g>
      <rect
        x={left + inset}
        y={top + inset}
        width={w - inset * 2}
        height={Math.max(0, h - inset * 2)}
        rx={Math.min(RADIUS - inset, h / 2)}
        fill={hovered ? BLUE_ACTIVE : faded ? BLUE_FADED : BLUE}
      />
      {hovered && <HoverRing x={left} y={top} width={w} height={h} />}
      <text
        x={left + w / 2}
        y={top - VALUE_LABEL_GAP}
        textAnchor="middle"
        fontSize={LABEL_FONT}
        fill={hovered ? INK : faded ? VALUE_LABEL_FADED : VALUE_LABEL}
        opacity={progress}
      >
        {Math.round(point.value)}%
      </text>
    </g>
  );
}

function UtilizationChart({ data }: { data: UtilizationPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const hover: HoverState = { active, setActive };
  const progress = useEntrance(data.length);
  const max = Math.max(...data.map((d) => d.value));
  const height = UTIL.marginTop + UTIL.plot + UTIL.axis;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: UTIL.marginTop, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="8%"
        >
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tickSize={0}
            tickMargin={0}
            interval={0}
            height={UTIL.axis}
            tick={(props: XAxisTickContentProps) => (
              <DayTick {...props} active={active} gap={UTIL.axisGap} />
            )}
          />
          <YAxis hide domain={[0, max]} />
          <Bar
            dataKey="value"
            isAnimationActive={false}
            shape={(props: BarShapeProps) => (
              <UtilizationBar
                {...props}
                active={active}
                progress={progress[props.index] ?? 1}
              />
            )}
          />
        </BarChart>
      </ResponsiveContainer>
      {data.map((d, i) => {
        const barTop = UTIL.marginTop + UTIL.plot * (1 - d.value / max);
        const labelTop = barTop - VALUE_LABEL_GAP - LABEL_CAP;
        return (
          <BandTrigger
            key={d.day}
            index={i}
            label={`${DAY_NAMES[d.day] ?? d.day}: ${d.value.toFixed(1)}% utilization`}
            top={labelTop - TRIGGER_CLEARANCE}
            offset={3}
            padding="px-2.5 py-1"
            hover={hover}
          >
            <span className="font-semibold">
              {d.day} · {d.value.toFixed(1)}%
            </span>
          </BandTrigger>
        );
      })}
    </div>
  );
}

/* ---- Occupancy (stacked) -------------------------------------------------- */

function OccupancySegment({
  x,
  y,
  height,
  width,
  index,
  stackedBarStart,
  level,
  active,
  progress,
}: BarShapeProps & { level: number; active: number | null; progress: number }) {
  const { color, faded: fadedColor } = OCCUPANCY_LEVELS[level];
  const isTop = level === 0;
  const isBottom = level === OCCUPANCY_LEVELS.length - 1;

  const left = Math.round(x);
  const right = Math.round(x + width);
  const w = right - left;
  // The whole stack grows from the baseline, so every segment scales about it
  // and neighbouring segments keep sharing the same edge. Only the final,
  // resting positions are rounded (see UtilizationBar).
  const baseline = Math.round(stackedBarStart);
  const grow = (edge: number) =>
    baseline - (baseline - Math.round(edge)) * progress;
  const stackTop = grow(y);
  let top = stackTop;
  let bottom = grow(y + height);

  const hovered = active === index;
  const faded = active !== null && !hovered;
  const inset = hovered ? 1 : 0;
  if (isTop) top += inset;
  // Lower segments tuck under the one painted above them, so a seam sitting
  // between pixels mid-animation never lets the background bleed through.
  else top -= Math.min(SEAM_OVERLAP, bottom - top);
  if (isBottom) bottom -= inset;

  return (
    <g>
      <path
        d={roundedRectPath(
          left + inset,
          top,
          w - inset * 2,
          Math.max(0, bottom - top),
          isTop ? RADIUS - inset : 0,
          isBottom ? RADIUS - inset : 0,
        )}
        fill={faded ? fadedColor : color}
      />
      {isTop && hovered && (
        <HoverRing
          x={left}
          y={stackTop}
          width={w}
          height={baseline - stackTop}
        />
      )}
    </g>
  );
}

function OccupancyChart({ data }: { data: OccupancyPoint[] }) {
  const [active, setActive] = useState<number | null>(null);
  const hover: HoverState = { active, setActive };
  const progress = useEntrance(data.length);
  const height = OCC.marginTop + OCC.plot + OCC.axis;

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={data}
          margin={{ top: OCC.marginTop, right: 0, bottom: 0, left: 0 }}
          barCategoryGap="6.5%"
        >
          <XAxis
            dataKey="day"
            axisLine={false}
            tickLine={false}
            tickSize={0}
            tickMargin={0}
            interval={0}
            height={OCC.axis}
            tick={(props: XAxisTickContentProps) => (
              <DayTick {...props} active={active} gap={OCC.axisGap} />
            )}
          />
          <YAxis hide domain={[0, 100]} />
          {/* Rendered bottom-up so the top segment (and its ring) paints last. */}
          {[...OCCUPANCY_LEVELS]
            .map((lvl, level) => ({ ...lvl, level }))
            .reverse()
            .map(({ key, level }) => (
              <Bar
                key={key}
                dataKey={key}
                stackId="occupancy"
                isAnimationActive={false}
                shape={(props: BarShapeProps) => (
                  <OccupancySegment
                    {...props}
                    level={level}
                    active={active}
                    progress={progress[props.index] ?? 1}
                  />
                )}
              />
            ))}
        </BarChart>
      </ResponsiveContainer>
      {data.map((d, i) => (
        <BandTrigger
          key={d.day}
          index={i}
          label={`${DAY_NAMES[d.day] ?? d.day} occupancy: ${OCCUPANCY_LEVELS.map(
            (l) => `${l.label} ${d[l.key].toFixed(1)}%`,
          ).join(", ")}`}
          top={0}
          offset={7}
          padding="px-2.5 py-2"
          hover={hover}
        >
          <div className="w-[130px]">
            <p className="font-semibold">{d.day}</p>
            <ul className="mt-1.5 flex flex-col gap-1">
              {OCCUPANCY_LEVELS.map((l) => (
                <li key={l.key} className="flex items-center gap-2">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ background: l.color }}
                    aria-hidden="true"
                  />
                  <span className="text-[#bbbbba]">{l.label}</span>
                  <span className="ml-auto font-semibold">
                    {d[l.key].toFixed(1)}%
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </BandTrigger>
      ))}
    </div>
  );
}

/* ---- Public component ----------------------------------------------------- */

export default function UtilizationCharts({
  utilization = SAMPLE_UTILIZATION,
  occupancy = SAMPLE_OCCUPANCY,
}: {
  utilization?: UtilizationPoint[];
  occupancy?: OccupancyPoint[];
}) {
  return (
    <div className="flex flex-col">
      <UtilizationChart data={utilization} />
      <p className="mt-[13px] mb-2.5 text-xs" style={{ color: HEADING }}>
        Occupancy
      </p>
      <OccupancyChart data={occupancy} />
    </div>
  );
}
