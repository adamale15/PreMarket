"use client";

import { cn } from "@/lib/utils";
import { ArrowRight, Link as LinkIcon, Zap } from "lucide-react";

export type TrendSource = {
  name: string;
  url: string;
  type: "news" | "social" | "blog" | "market" | "research";
};

export type TrendMilestone = { date: string; label: string };

export type Trend = {
  id: string;
  title: string;
  category: string;
  probability: number; // 0-100
  summary: string;
  sources: TrendSource[];
  timeline: TrendMilestone[];
  similarEvents: { title: string; url: string }[];
};

export function ProbabilityBadge({ value }: { value: number }) {
  const color =
    value >= 70 ? "bg-emerald-500/20 dark:bg-emerald-500/30 text-emerald-600 dark:text-emerald-400 border-emerald-500/40 dark:border-emerald-500/50 backdrop-blur-sm" :
    value >= 40 ? "bg-amber-500/20 dark:bg-amber-500/30 text-amber-700 dark:text-amber-400 border-amber-500/40 dark:border-amber-500/50 backdrop-blur-sm" :
                 "bg-rose-500/20 dark:bg-rose-500/30 text-rose-700 dark:text-rose-400 border-rose-500/40 dark:border-rose-500/50 backdrop-blur-sm";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm", color)}>
      <Zap className="h-3.5 w-3.5" /> {value}%
    </span>
  );
}

export default function TrendCard({ trend, onOpen }: { trend: Trend; onOpen: (t: Trend) => void }) {
  return (
    <button
      className="group text-left rounded-2xl backdrop-blur-xl bg-card/50 dark:bg-card/30 border border-border/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring hover:scale-[1.02] hover:border-primary/30"
      onClick={() => onOpen(trend)}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wider text-foreground/70 dark:text-foreground/60 backdrop-blur-sm bg-secondary/80 dark:bg-secondary/50 rounded-lg px-2.5 py-1 border border-border/50">{trend.category}</span>
            <ProbabilityBadge value={trend.probability} />
          </div>
          <h3 className="text-lg font-semibold leading-snug">{trend.title}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">{trend.summary}</p>
          <div className="flex items-center gap-3 pt-1">
            <div className="flex -space-x-1">
              {trend.sources.slice(0, 3).map((s) => (
                <span key={s.url} title={s.name} className="h-7 w-7 grid place-items-center rounded-full backdrop-blur-sm bg-secondary/80 dark:bg-secondary/50 border border-border/50 text-[10px] font-semibold capitalize shadow-sm">{s.type[0]}</span>
              ))}
            </div>
            <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5 font-medium"><LinkIcon className="h-3.5 w-3.5" /> {trend.sources.length} sources</span>
          </div>
        </div>
        <ArrowRight className="h-5 w-5 text-foreground/50 group-hover:translate-x-1 transition-transform" />
      </div>
    </button>
  );
}
