import { useEffect, useState } from "react";
import { Tooltip } from "@heroui/react";
import {
  Car,
  CreditCard,
  Info,
  Landmark,
  PlugZap,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { Map as MapboxMap, Marker } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { TOOLTIP_CLASS, TooltipArrow } from "./UtilizationCharts";

/* ---------------------------------------------------------------------------
   Site report card.

   One page of a shared site report: address header with the report details,
   the utilization score and the five factors behind it, an EV registration
   breakdown with a top-5 makes bar list, and a Mapbox map of the site. The
   header and footer stay put while the page body scrolls between them. Every
   colour and dimension is sampled from the reference screenshot.
   --------------------------------------------------------------------------- */

export type ScoreFactor = {
  label: string;
  /** Tooltip copy for the info icon. */
  description: string;
  value: string;
  /** Filled segments, out of SCORE_STEPS. */
  level: number;
  icon: LucideIcon;
};
export type RegistrationStat = { label: string; value: string };
export type MakeShare = {
  name: string;
  /** Percent of registered EVs. */
  share: number;
};
export type LngLat = { longitude: number; latitude: number };

/* ---- Sample data ---------------------------------------------------------- */

const SAMPLE_FACTORS: ScoreFactor[] = [
  {
    label: "EV Adoption",
    description: "EVs as a share of all registered vehicles",
    value: "12.29%",
    level: 3,
    icon: Zap,
  },
  {
    label: "Travel Patterns",
    description: "Average daily traffic past the site",
    value: "68,839 vehicles",
    level: 3,
    icon: Car,
  },
  {
    label: "Existing Infrastructure",
    description: "Public charging ports nearby · average utilization",
    value: "1013 · 25%",
    level: 3,
    icon: PlugZap,
  },
  {
    label: "Purchasing Power",
    description: "Households above the regional median income",
    value: "55%",
    level: 3,
    icon: CreditCard,
  },
  {
    label: "Policies and Incentives",
    description: "Active EV incentive programs covering the site",
    value: "21",
    level: 3,
    icon: Landmark,
  },
];

const SAMPLE_STATS: RegistrationStat[] = [
  { label: "EV adoption rate", value: "12.3%" },
  { label: "Total registered vehicles", value: "1,734,656" },
  { label: "Total BEVs + PHEV", value: "213,167" },
];

const SAMPLE_MAKES: MakeShare[] = [
  { name: "Tesla", share: 57 },
  { name: "Toyota", share: 5 },
  { name: "BMW", share: 4 },
  { name: "Ford", share: 4 },
  { name: "Chevrolet", share: 4 },
];

/** 1 Infinite Loop, Cupertino. */
const SAMPLE_LOCATION: LngLat = { longitude: -122.0312, latitude: 37.3318 };

/* ---- Design tokens (sampled from the reference) --------------------------- */
const INK = "#1d1d17";
const MUTED = "#8c8c8c";
const STAT_LABEL = "#737373";
const SCORE_OUT_OF = "#a6a6a6";
const INFO_ICON = "#bfbfbf";
const RULE = "#f5f5f5";
const MAKE_LABEL = "#404040";
const MAKE_VALUE = "#000000";
const TRACK = "#f2f2f2";
/** The BEV green from the EV adoption card. */
const SCORE_ON = "#7bbe6c";
/** One per rank, darkest first. */
const MAKE_COLORS = ["#000000", "#1d1d17", "#6f727f", "#9fa3ae", "#d3d5db"];
const MAP_BORDER = "#e2e3e7";
const PIN = "#6b6a6a";
const PIN_SHADOW = "0 4px 24px rgba(0, 0, 0, 0.2)";

/* ---- Geometry (CSS px) ---------------------------------------------------- */
const CARD_HEIGHT = 848;
const MAP_HEIGHT = 200;
const SCORE_STEPS = 3;

/* ---- Map ------------------------------------------------------------------ */
const MAPBOX_TOKEN: string | undefined = import.meta.env.VITE_MAPBOX_TOKEN;
const MAP_STYLE = "mapbox://styles/mapbox/standard";
const MAP_ZOOM = 15;

/* ---- Entrance animation --------------------------------------------------- */

/** Each make bar grows over `duration` ms, starting `stagger` ms after the one above. */
const ENTRANCE = { duration: 700, stagger: 60 };

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

/** Eased 0..1 progress per bar; the finished state straight away under reduced motion. */
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

/* ---- Shared pieces -------------------------------------------------------- */

/** Apple's mark for the sample company (Simple Icons, CC0). */
function AppleLogo() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={MUTED}
      role="img"
      aria-label="Apple"
    >
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm leading-5 font-semibold">{children}</h3>;
}

/** Three label/value columns; the last one is right-aligned. */
function DetailColumns({
  items,
  labelClassName,
  labelColor,
  valueClassName,
  className = "",
}: {
  items: { label: string; value: string }[];
  labelClassName: string;
  labelColor: string;
  valueClassName: string;
  className?: string;
}) {
  return (
    <dl className={`grid grid-cols-3 gap-4 ${className}`}>
      {items.map((item, i) => (
        <div
          key={item.label}
          className={i === items.length - 1 ? "text-right" : undefined}
        >
          <dt className={labelClassName} style={{ color: labelColor }}>
            {item.label}
          </dt>
          <dd className={valueClassName}>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function InfoTip({ label, children }: { label: string; children: string }) {
  return (
    <Tooltip delay={0} closeDelay={0}>
      <Tooltip.Trigger
        aria-label={`About ${label}`}
        className="flex rounded-full outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        <Info size={14} style={{ color: INFO_ICON }} aria-hidden="true" />
      </Tooltip.Trigger>
      <Tooltip.Content
        showArrow
        placement="top"
        offset={7}
        className={`${TOOLTIP_CLASS} px-2.5 py-1`}
      >
        <TooltipArrow />
        {children}
      </Tooltip.Content>
    </Tooltip>
  );
}

function ScoreMeter({ level }: { level: number }) {
  return (
    <span
      role="img"
      aria-label={`${level} of ${SCORE_STEPS}`}
      className="ml-1 flex shrink-0 gap-0.5"
    >
      {Array.from({ length: SCORE_STEPS }, (_, i) => (
        <span
          key={i}
          className="h-2 w-[11px] rounded-[1.5px]"
          style={{ background: i < level ? SCORE_ON : TRACK }}
        />
      ))}
    </span>
  );
}

function FactorRow({ factor, first }: { factor: ScoreFactor; first: boolean }) {
  const Icon = factor.icon;
  return (
    <li
      className="box-content flex h-10 items-center gap-2 text-[13px] leading-5 font-semibold"
      style={{ borderTop: first ? undefined : `1px solid ${RULE}` }}
    >
      <Icon size={16} className="shrink-0" aria-hidden="true" />
      <span>{factor.label}</span>
      <InfoTip label={factor.label}>{factor.description}</InfoTip>
      <span className="ml-auto whitespace-nowrap">{factor.value}</span>
      <ScoreMeter level={factor.level} />
    </li>
  );
}

function MakeBars({ makes }: { makes: MakeShare[] }) {
  const progress = useEntrance(makes.length);
  return (
    <ol className="flex flex-col gap-2 text-xs leading-4">
      {makes.map((m, i) => (
        <li key={m.name} className="flex items-center">
          <span
            className="w-18 shrink-0 font-medium"
            style={{ color: MAKE_LABEL }}
          >
            {m.name}
          </span>
          <span
            className="h-1.5 flex-1 rounded-full"
            style={{ background: TRACK }}
            aria-hidden="true"
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${m.share * (progress[i] ?? 1)}%`,
                background: MAKE_COLORS[Math.min(i, MAKE_COLORS.length - 1)],
              }}
            />
          </span>
          <span
            className="w-10 shrink-0 text-right font-medium"
            style={{ color: MAKE_VALUE }}
          >
            {m.share}%
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ---- Map ------------------------------------------------------------------ */

function SitePin() {
  return (
    <span
      className="flex size-8 items-center justify-center rounded-full text-white"
      style={{ background: PIN, boxShadow: PIN_SHADOW }}
    >
      <Zap size={16} fill="currentColor" strokeWidth={1.5} aria-hidden="true" />
    </span>
  );
}

/**
 * Mapbox map centred on the site. Scroll-zoom is off so the wheel keeps
 * scrolling the report; drag, double-click and pinch still work. Without a
 * token it falls back to a plain panel with the pin.
 */
function SiteMap({ location }: { location: LngLat }) {
  return (
    <div
      className="relative overflow-hidden rounded-[20px] border"
      style={{ height: MAP_HEIGHT, borderColor: MAP_BORDER }}
    >
      {MAPBOX_TOKEN ? (
        <MapboxMap
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle={MAP_STYLE}
          initialViewState={{ ...location, zoom: MAP_ZOOM }}
          scrollZoom={false}
          style={{ width: "100%", height: "100%" }}
        >
          <Marker {...location} anchor="center">
            <SitePin />
          </Marker>
        </MapboxMap>
      ) : (
        <div
          className="flex h-full items-center justify-center"
          style={{ background: TRACK }}
        >
          <SitePin />
          <p
            className="absolute inset-x-0 bottom-3 text-center text-xs"
            style={{ color: MUTED }}
          >
            Set VITE_MAPBOX_TOKEN to load the map
          </p>
        </div>
      )}
    </div>
  );
}

/* ---- Public component ----------------------------------------------------- */

export default function SiteReportCard({
  address = "1 Infinite Loop",
  locality = "Cupertino, CA 94132",
  logo = <AppleLogo />,
  createdBy = "Alex Chen",
  company = "Apple",
  date = "May 20, 2026",
  score = 4.6,
  maxScore = 5,
  factors = SAMPLE_FACTORS,
  stats = SAMPLE_STATS,
  makes = SAMPLE_MAKES,
  location = SAMPLE_LOCATION,
  sharedBy = "alex@apple.com",
  page = 1,
  pageCount = 3,
  className = "",
}: {
  address?: string;
  locality?: string;
  logo?: React.ReactNode;
  createdBy?: string;
  company?: string;
  date?: string;
  score?: number;
  maxScore?: number;
  factors?: ScoreFactor[];
  stats?: RegistrationStat[];
  makes?: MakeShare[];
  location?: LngLat;
  sharedBy?: string;
  page?: number;
  pageCount?: number;
  className?: string;
}) {
  return (
    <div
      className={`flex min-w-[600px] flex-col overflow-hidden rounded-[28px] border bg-white tracking-normal shadow-sm ${className}`}
      style={{ height: CARD_HEIGHT, color: INK, borderColor: RULE }}
    >
      {/* Header */}
      <div
        className="shrink-0 border-b px-8 pt-7 pb-5"
        style={{ borderColor: RULE }}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl leading-7 font-medium tracking-[-0.025em]">
              {address}
            </h2>
            <p
              className="mt-1 text-sm leading-5 font-medium"
              style={{ color: MUTED }}
            >
              {locality}
            </p>
          </div>
          <div className="mt-1 mr-px">{logo}</div>
        </div>
        <DetailColumns
          className="mt-[18px]"
          items={[
            { label: "Created by", value: createdBy },
            { label: "Company", value: company },
            { label: "Date", value: date },
          ]}
          labelClassName="text-[11px] leading-4"
          labelColor={MUTED}
          valueClassName="text-[13px] leading-6 font-semibold"
        />
      </div>

      {/* Report page */}
      <div className="min-h-0 flex-1 overflow-y-auto px-8 pt-7 pb-8 tabular-nums">
        <div className="flex items-center justify-between">
          <SectionHeading>Utilization Score</SectionHeading>
          <p className="text-base leading-5 font-medium">
            {score.toFixed(1)}
            <span style={{ color: SCORE_OUT_OF }}>/{maxScore}</span>
          </p>
        </div>
        <ul className="mt-2">
          {factors.map((f, i) => (
            <FactorRow key={f.label} factor={f} first={i === 0} />
          ))}
        </ul>

        <div className="mt-5">
          <SectionHeading>EV Registration Breakdown</SectionHeading>
        </div>
        <div className="mt-4 border-b pb-4" style={{ borderColor: RULE }}>
          <DetailColumns
            items={stats}
            labelClassName="text-[11px] leading-4 font-medium"
            labelColor={STAT_LABEL}
            valueClassName="mt-1.5 text-base leading-6 font-medium tracking-[-0.01em]"
          />
        </div>
        <div className="mt-4">
          <MakeBars makes={makes} />
        </div>

        <div className="mt-5 mb-4">
          <SectionHeading>Utilization Score</SectionHeading>
        </div>
        <SiteMap location={location} />
      </div>

      {/* Footer */}
      <div
        className="flex h-[84px] shrink-0 items-center justify-between border-t px-8 text-sm leading-5 font-medium tabular-nums"
        style={{ color: MUTED, borderColor: RULE }}
      >
        <span>Shared by {sharedBy}</span>
        <span>
          {page} of {pageCount}
        </span>
      </div>
    </div>
  );
}
