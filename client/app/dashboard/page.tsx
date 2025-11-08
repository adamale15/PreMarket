"use client";

import React, { useEffect, useMemo, useState } from "react";
import TrendCard from "@/components/trends/TrendCard";

export default function DashboardPage() {
  const [subs, setSubs] = useState<string[]>([]);
  useEffect(() => {
    if (typeof window !== "undefined") {
      const arr: string[] = [];
      for (const k of Object.keys(localStorage)) if (k.startsWith("tf_sub_")) {
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
    <div className="container mx-auto py-12 space-y-10">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight">Your dashboard</h1>
        <p className="text-muted-foreground mt-2">Trends you follow and your recent performance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KPI label="Past 24 hours" value={`$${earnings.day.toFixed(2)}`} />
        <KPI label="Past 7 days" value={`$${earnings.week.toFixed(2)}`} />
        <KPI label="Past 30 days" value={`$${earnings.month.toFixed(2)}`} />
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Subscribed trends</h2>
        {subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscriptions yet. Open a trend on the home page and subscribe to get alerts.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subs.map((id) => (
              <TrendCard key={id} trend={{
                id,
                title: `Subscribed trend ${id}`,
                category: "Subscribed",
                probability: 55,
                summary: "You're subscribed to this trend. Real data connections can be added next.",
                sources: [],
                timeline: [],
                similarEvents: [],
              }} onOpen={() => {}} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-bold">{value}</div>
    </div>
  );
}
