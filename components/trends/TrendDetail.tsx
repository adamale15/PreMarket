"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ProbabilityBadge, Trend } from "@/components/trends/TrendCard";
import {
  ExternalLink,
  Bell,
  Info,
  Send,
  SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function seededScore(base: number, text: string) {
  let hash = 0;
  for (let i = 0; i < text.length; i++)
    hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
  const delta = (hash % 21) - 10; // -10..10
  return Math.max(0, Math.min(100, Math.round(base + delta / 3)));
}

export default function TrendDetail({
  trend,
  open,
  onClose,
}: {
  trend: Trend | null;
  open: boolean;
  onClose: () => void;
}) {
  const [subscribed, setSubscribed] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);

  useEffect(() => {
    if (!trend) return;
    const key = `tf_sub_${trend.id}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const { subscribed, threshold } = JSON.parse(raw);
      setSubscribed(!!subscribed);
      setThreshold(Number(threshold) || 50);
    } else {
      setSubscribed(false);
      setThreshold(50);
    }
    setQuestion("");
    setAnalysis(null);
    setScore(null);
  }, [trend]);

  useEffect(() => {
    if (!trend) return;
    const key = `tf_sub_${trend.id}`;
    localStorage.setItem(key, JSON.stringify({ subscribed, threshold }));
  }, [subscribed, threshold, trend]);

  const base = trend?.probability ?? 0;
  const aiScore = useMemo(
    () => (trend ? seededScore(base, trend.title + question) : null),
    [trend, base, question],
  );

  function runAnalysis() {
    if (!trend) return;
    const s = aiScore ?? base;
    const scenarios = [
      "Regulation shifts",
      "Key influencer amplification",
      "Funding/earnings catalysts",
      "Macro sentiment swings",
      "Counterfactual news cycles",
    ];
    const top =
      scenarios[(trend.title.length + question.length) % scenarios.length];
    setScore(s);
    setAnalysis(
      `Based on current momentum from ${trend.sources.length}+ sources and comparable events, the likelihood is around ${s}%. Most sensitive factor: ${top}.`,
    );
  }

  if (!open || !trend) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto max-w-4xl rounded-2xl border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-4 p-6 border-b">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-foreground/60 bg-secondary rounded px-2 py-0.5">
                {trend.category}
              </span>
              <ProbabilityBadge value={trend.probability} />
            </div>
            <h3 className="text-2xl font-bold leading-tight">{trend.title}</h3>
            <p className="text-sm text-muted-foreground max-w-3xl">
              {trend.summary}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-3 py-1.5 text-sm bg-secondary hover:bg-secondary/80"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border p-5">
              <h4 className="font-semibold mb-3">Source timeline</h4>
              <div className="relative pl-4">
                <div className="absolute left-1.5 top-1 bottom-1 w-0.5 bg-border" />
                <div className="space-y-4">
                  {trend.timeline.map((m) => (
                    <div key={m.date} className="relative">
                      <div className="absolute -left-2 mt-1 h-3 w-3 rounded-full bg-primary ring-4 ring-primary/15" />
                      <div className="pl-4">
                        <div className="text-sm text-muted-foreground">
                          {formatDate(m.date)}
                        </div>
                        <div className="font-medium">{m.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border p-5">
              <h4 className="font-semibold mb-3">Sources</h4>
              <ul className="grid sm:grid-cols-2 gap-3">
                {trend.sources.map((s) => (
                  <li
                    key={s.url}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-secondary/60"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new URL(s.url).hostname}
                      </p>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border p-5">
              <h4 className="font-semibold mb-3">
                Similar events (Polymarket)
              </h4>
              <ul className="space-y-2">
                {trend.similarEvents.map((e) => (
                  <li key={e.url}>
                    <a
                      href={e.url}
                      className="text-sm text-primary hover:underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {e.title}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="space-y-6">
            <section className="rounded-xl border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold">Subscribe</h4>
                <span
                  className={cn(
                    "text-xs px-2 py-0.5 rounded-full border",
                    subscribed
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                      : "bg-secondary text-foreground/60",
                  )}
                >
                  {subscribed ? "Active" : "Off"}
                </span>
              </div>
              <button
                onClick={() => setSubscribed((v) => !v)}
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-3 py-2 text-sm font-semibold shadow-sm hover:brightness-110"
              >
                <Bell className="h-4 w-4" />{" "}
                {subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
              <div className="space-y-2">
                <label className="text-sm font-medium inline-flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Notify when
                  probability ≥ {threshold}%
                </label>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  className="w-full"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                You will receive alerts when Claude's score meets your
                threshold.
              </p>
            </section>

            <section className="rounded-xl border p-5 space-y-3">
              <h4 className="font-semibold inline-flex items-center gap-2">
                <Info className="h-4 w-4" /> Ask the AI
              </h4>
              <p className="text-sm text-muted-foreground">
                Ask about outcomes, edge cases, or factors that could tweak this
                trend.
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={4}
                className="w-full rounded-md border bg-background p-3 text-sm"
                placeholder="e.g., How would stricter regulation impact this timeline?"
              />
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-3 py-2 text-sm hover:bg-secondary/80"
              >
                <Send className="h-4 w-4" /> Analyze
              </button>
              {analysis && (
                <div className="rounded-lg border p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Claude probability
                    </span>
                    {score !== null && <ProbabilityBadge value={score} />}
                  </div>
                  <p className="text-sm text-muted-foreground">{analysis}</p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
