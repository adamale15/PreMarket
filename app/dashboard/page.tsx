"use client";

import React, { useEffect, useMemo, useState } from "react";
import TrendCard from "@/components/trends/TrendCard";

export default function DashboardPage() {
  const [subs, setSubs] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const arr: string[] = [];
      for (const k of Object.keys(localStorage))
        if (k.startsWith("tf_sub_")) {
          try {
            const v = JSON.parse(localStorage.getItem(k) || "{}");
            if (v.subscribed) arr.push(k.replace("tf_sub_", ""));
          } catch {}
        }
      setSubs(arr);
    }
  }, []);

  const earnings = useMemo(() => {
    const base = subs.length * 12;
    return {
      day: base,
      week: base * 4,
      month: base * 12,
    };
  }, [subs.length]);

  return (
    <div className="container mx-auto py-12 space-y-10 px-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Your dashboard
        </h1>
        <p className="text-muted-foreground mt-3 text-lg">
          Trends you follow and your recent performance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <KPI label="Past 24 hours" value={`$${earnings.day.toFixed(2)}`} />
        <KPI label="Past 7 days" value={`$${earnings.week.toFixed(2)}`} />
        <KPI label="Past 30 days" value={`$${earnings.month.toFixed(2)}`} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Subscribed trends</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subscriptions yet. Open a trend on the home page and subscribe to
            get alerts.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subs.map((id) => (
              <TrendCard
                key={id}
                trend={{
                  id,
                  title: `Subscribed trend ${id}`,
                  category: "Subscribed",
                  probability: 55,
                  summary:
                    "You're subscribed to this trend. Real data connections can be added next.",
                  sources: [],
                  timeline: [],
                  similarEvents: [],
                }}
                onOpen={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl backdrop-blur-xl bg-card/50 dark:bg-card/30 border border-border/50 p-6 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-[1.02] hover:border-primary/30">
      <div className="text-sm text-muted-foreground font-medium">{label}</div>
      <div className="mt-2 text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        {value}
      </div>
    </div>
  );
}
