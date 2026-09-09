import type { MuscleGroup } from "@/types";
import { MUSCLE_LABELS_AR } from "@/lib/localization";

interface MuscleFocusGraphicProps {
  primary: MuscleGroup;
  secondary?: MuscleGroup[];
  compact?: boolean;
}

const MUSCLE_LABELS = MUSCLE_LABELS_AR;

function regionClass(
  muscle: MuscleGroup,
  primary: MuscleGroup,
  secondary: MuscleGroup[],
) {
  if (muscle === primary) return "fill-emerald-300 stroke-emerald-100";
  if (secondary.includes(muscle)) return "fill-emerald-300/35 stroke-emerald-200/50";
  return "fill-white/[0.045] stroke-white/[0.09]";
}

export function MuscleFocusGraphic({
  primary,
  secondary = [],
  compact = false,
}: MuscleFocusGraphicProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-white/[0.07] bg-black/15 ${
        compact ? "h-28 w-28" : "h-36 w-full"
      }`}
      aria-label={`تركيز عضلة ${MUSCLE_LABELS[primary]}`}
    >
      <svg
        viewBox="0 0 220 150"
        className="h-full w-full"
        role="img"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="bodyGlow" x1="0" x2="1">
            <stop offset="0" stopColor="rgba(52,211,153,.05)" />
            <stop offset="1" stopColor="rgba(52,211,153,.16)" />
          </linearGradient>
        </defs>
        <ellipse cx="110" cy="74" rx="73" ry="65" fill="url(#bodyGlow)" />
        <circle cx="110" cy="22" r="13" className="fill-white/[0.055] stroke-white/[0.1]" />
        <path d="M88 38 Q110 31 132 38 L139 87 Q129 101 110 102 Q91 101 81 87 Z" className="fill-white/[0.04] stroke-white/[0.09]" />
        <path d="M84 43 Q72 47 65 65 L55 104 Q60 108 67 106 L80 75 Z" className={regionClass("triceps", primary, secondary)} />
        <path d="M136 43 Q148 47 155 65 L165 104 Q160 108 153 106 L140 75 Z" className={regionClass("biceps", primary, secondary)} />
        <path d="M84 42 Q96 34 106 42 L105 62 Q92 66 82 57 Z" className={regionClass("shoulders", primary, secondary)} />
        <path d="M136 42 Q124 34 114 42 L115 62 Q128 66 138 57 Z" className={regionClass("shoulders", primary, secondary)} />
        <path d="M88 48 Q98 40 107 46 L106 68 Q95 73 86 65 Z" className={regionClass("chest", primary, secondary)} />
        <path d="M132 48 Q122 40 113 46 L114 68 Q125 73 134 65 Z" className={regionClass("chest", primary, secondary)} />
        <path d="M89 68 Q110 76 131 68 L128 94 Q110 103 92 94 Z" className={regionClass("core", primary, secondary)} />
        <path d="M90 94 L107 98 L104 132 Q96 137 87 132 Z" className={regionClass("quads", primary, secondary)} />
        <path d="M130 94 L113 98 L116 132 Q124 137 133 132 Z" className={regionClass("hamstrings", primary, secondary)} />
        <path d="M87 130 Q96 137 104 132 L102 146 L88 146 Z" className={regionClass("calves", primary, secondary)} />
        <path d="M133 130 Q124 137 116 132 L118 146 L132 146 Z" className={regionClass("calves", primary, secondary)} />
        <path d="M93 89 Q110 83 127 89 L124 105 Q110 111 96 105 Z" className={regionClass("glutes", primary, secondary)} opacity=".88" />
        <path d="M91 43 Q110 35 129 43 L130 83 Q111 92 90 83 Z" className={regionClass("back", primary, secondary)} opacity={primary === "back" || secondary.includes("back") ? 0.72 : 0.16} />
      </svg>
      <div className="gc-muscle-caption pointer-events-none absolute inset-x-2 bottom-2 rounded-xl px-2.5 py-1.5 text-center">
        <p className="truncate text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-100">
          {MUSCLE_LABELS[primary]}
        </p>
      </div>
    </div>
  );
}
