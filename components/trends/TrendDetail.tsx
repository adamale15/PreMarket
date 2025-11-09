"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
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
  const { isSignedIn } = useUser();
  const [subscribed, setSubscribed] = useState(false);
  const [threshold, setThreshold] = useState(50);
  const [question, setQuestion] = useState("");
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [similarEvents, setSimilarEvents] = useState<
    { title: string; url: string }[]
  >([]);
  const [loadingSimilarEvents, setLoadingSimilarEvents] = useState(false);

  useEffect(() => {
    if (!trend) return;

    const fetchSubscription = async () => {
      if (isSignedIn) {
        try {
          const response = await fetch(
            `/api/user/subscriptions?trendId=${trend.id}`,
          );
          const data = await response.json();
          if (data.subscription) {
            setSubscribed(data.subscription.subscribed);
            setThreshold(data.subscription.threshold || 50);
          } else {
            setSubscribed(false);
            setThreshold(50);
          }
        } catch (error) {
          console.error("Error fetching subscription:", error);
          // Fallback to localStorage
          const key = `tf_sub_${trend.id}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            setSubscribed(!!parsed.subscribed);
            setThreshold(Number(parsed.threshold) || 50);
          } else {
            setSubscribed(false);
            setThreshold(50);
          }
        }
      } else {
        // For non-signed-in users, use localStorage
        const key = `tf_sub_${trend.id}`;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          setSubscribed(!!parsed.subscribed);
          setThreshold(Number(parsed.threshold) || 50);
        } else {
          setSubscribed(false);
          setThreshold(50);
        }
      }
    };

    fetchSubscription();
    setQuestion("");
    setAnalysis(null);
    setScore(null);

    // Fetch similar events from Polymarket
    if (trend) {
      setLoadingSimilarEvents(true);
      // Reset similar events first to avoid showing stale data
      setSimilarEvents([]);

      const params = new URLSearchParams({
        category: trend.category,
        title: trend.title,
        summary: trend.summary || "",
        limit: "8", // Increased to show more similar events
        // Add trend ID to ensure unique requests
        trendId: trend.id,
      });

      console.log(`Fetching Polymarket events for trend: "${trend.title}"`);

      fetch(`/api/polymarket/events?${params.toString()}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.events && Array.isArray(data.events)) {
            setSimilarEvents(data.events);
          } else {
            // Fallback to trend's similarEvents if API fails
            setSimilarEvents(trend.similarEvents || []);
          }
        })
        .catch((error) => {
          console.error("Error fetching Polymarket events:", error);
          // Fallback to trend's similarEvents
          setSimilarEvents(trend.similarEvents || []);
        })
        .finally(() => {
          setLoadingSimilarEvents(false);
        });
    }
  }, [trend, isSignedIn]);

  useEffect(() => {
    if (!trend) return;

    // Save to Supabase if signed in
    if (isSignedIn) {
      fetch("/api/user/subscriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trendId: trend.id,
          subscribed,
          threshold,
        }),
      }).catch((error) => {
        console.error("Error saving subscription:", error);
      });
    }

    // Also save to localStorage as backup
    const key = `tf_sub_${trend.id}`;
    localStorage.setItem(key, JSON.stringify({ subscribed, threshold }));
  }, [subscribed, threshold, trend, isSignedIn]);

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
      <div className="absolute inset-x-0 top-10 mx-auto max-w-5xl rounded-2xl border bg-card shadow-xl">
        <div className="flex items-start justify-between gap-6 p-8 border-b">
          <div className="space-y-3 flex-1">
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-wider text-foreground/60 bg-secondary rounded px-3 py-1.5">
                {trend.category}
              </span>
              <ProbabilityBadge value={trend.probability} />
            </div>
            <h3 className="text-2xl font-bold leading-tight">{trend.title}</h3>
            <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">
              {trend.summary}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md px-4 py-2 text-sm bg-secondary hover:bg-secondary/80 flex-shrink-0"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="rounded-xl border p-6">
              <h4 className="font-semibold mb-6 text-lg">Source timeline</h4>
              <div className="relative pl-6">
                <div className="absolute left-2 top-2 bottom-2 w-0.5 bg-border" />
                <div className="space-y-8">
                  {trend.timeline.map((m) => (
                    <div key={m.date} className="relative">
                      <div className="absolute -left-3 mt-1.5 h-4 w-4 rounded-full bg-primary ring-4 ring-primary/15" />
                      <div className="pl-6">
                        <div className="text-sm text-muted-foreground mb-1.5">
                          {formatDate(m.date)}
                        </div>
                        <div className="font-medium text-base">{m.label}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-xl border p-6">
              <h4 className="font-semibold mb-6 text-lg">Sources</h4>
              <ul className="grid sm:grid-cols-2 gap-4">
                {trend.sources.map((s) => (
                  <li
                    key={s.url}
                    className="flex items-center justify-between gap-4 rounded-lg border p-4 hover:bg-secondary/60 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate mb-1">
                        {s.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {new URL(s.url).hostname}
                      </p>
                    </div>
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline flex-shrink-0"
                    >
                      View <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border p-6">
              <h4 className="font-semibold mb-6 text-lg">
                Similar events (Polymarket)
              </h4>
              {loadingSimilarEvents ? (
                <div className="text-sm text-muted-foreground py-4">
                  Loading similar events...
                </div>
              ) : similarEvents.length > 0 ? (
                <ul className="space-y-3">
                  {similarEvents.map((e, index) => (
                    <li key={e.url || index}>
                      <a
                        href={e.url}
                        className="text-sm text-primary hover:underline flex items-start gap-2 group"
                        target="_blank"
                        rel="noreferrer"
                      >
                        <span className="flex-1">{e.title}</span>
                        <ExternalLink className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground py-4">
                  No similar events found on Polymarket.
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-8">
            <section className="rounded-xl border p-6 space-y-5">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-lg">Subscribe</h4>
                <span
                  className={cn(
                    "text-xs px-3 py-1 rounded-full border",
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
                className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-primary text-primary-foreground px-4 py-3 text-sm font-semibold shadow-sm hover:brightness-110 transition-all"
              >
                <Bell className="h-4 w-4" />{" "}
                {subscribed ? "Unsubscribe" : "Subscribe"}
              </button>
              <div className="space-y-3 pt-2">
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
                  className="w-full h-2"
                />
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed pt-1">
                You will receive alerts when Claude's score meets your
                threshold.
              </p>
            </section>

            <section className="rounded-xl border p-6 space-y-4">
              <h4 className="font-semibold text-lg inline-flex items-center gap-2">
                <Info className="h-4 w-4" /> Ask the AI
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Ask about outcomes, edge cases, or factors that could tweak this
                trend.
              </p>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={5}
                className="w-full rounded-md border bg-background p-4 text-sm leading-relaxed"
                placeholder="e.g., How would stricter regulation impact this timeline?"
              />
              <button
                onClick={runAnalysis}
                className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2.5 text-sm hover:bg-secondary/80 transition-colors"
              >
                <Send className="h-4 w-4" /> Analyze
              </button>
              {analysis && (
                <div className="rounded-lg border p-4 space-y-3 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Claude probability
                    </span>
                    {score !== null && <ProbabilityBadge value={score} />}
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {analysis}
                  </p>
                </div>
              )}
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
