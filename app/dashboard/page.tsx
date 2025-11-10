"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import TrendCard from "@/components/trends/TrendCard";
import TrendDetail from "@/components/trends/TrendDetail";
import { Trend } from "@/components/trends/TrendCard";

export default function DashboardPage() {
  const { user, isSignedIn } = useUser();
  const [subs, setSubs] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrend, setActiveTrend] = useState<Trend | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    try {
      let trendIds: string[] = [];

      if (isSignedIn) {
        const response = await fetch("/api/user/subscriptions");
        const data = await response.json();
        if (data.subscriptions && Array.isArray(data.subscriptions)) {
          trendIds = data.subscriptions.map((sub: any) => sub.trend_id);
        }
      } else {
        // Fallback to localStorage for non-signed-in users
        if (typeof window !== "undefined") {
          for (const k of Object.keys(localStorage))
            if (k.startsWith("tf_sub_")) {
              try {
                const v = JSON.parse(localStorage.getItem(k) || "{}");
                if (v.subscribed) trendIds.push(k.replace("tf_sub_", ""));
              } catch {}
            }
        }
      }

      // Fetch full trend data for each subscription
      if (trendIds.length > 0) {
        if (isSignedIn) {
          // For signed-in users, subscriptions API now returns trend data
          const response = await fetch("/api/user/subscriptions");
          const data = await response.json();

          if (data.subscriptions && Array.isArray(data.subscriptions)) {
            // Filter to only subscribed trends (subscribed === true)
            // Include all subscriptions, even if trend data is missing (will show fallback)
            const subscribedTrends = data.subscriptions
              .filter((sub: any) => sub.subscribed === true)
              .map((sub: any) => {
                if (sub.trend) {
                  return sub.trend;
                } else {
                  // Create a fallback trend if data is missing
                  console.warn(`Missing trend data for subscription: ${sub.trend_id}`);
                  return {
                    id: sub.trend_id,
                    title: `Trend ${sub.trend_id}`,
                    category: "General",
                    probability: 50,
                    summary: "Trend data is being loaded...",
                    sources: [],
                    timeline: [],
                    similarEvents: [],
                  } as Trend;
                }
              }) as Trend[];
            setSubs(subscribedTrends);
          } else {
            setSubs([]);
          }
        } else {
          // For non-signed-in users, fetch from localStorage and try to get trend data
          // Try fetching from trends store
          try {
            const trendsResponse = await fetch("/api/trends/store");
            const trendsData = await trendsResponse.json();

            const subscribedTrends = (trendsData.trends || []).filter(
              (trend: Trend) => trendIds.includes(trend.id),
            );

            setSubs(subscribedTrends);
          } catch (err) {
            console.error("Error fetching trends:", err);
            setSubs([]);
          }
        }
      } else {
        setSubs([]);
      }
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      setSubs([]);
    } finally {
      setLoading(false);
    }
  }, [isSignedIn]);

  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  const earnings = useMemo(() => {
    const base = subs.length * 12;
    return {
      day: base,
      week: base * 4,
      month: base * 12,
    };
  }, [subs.length]);

  const handleTrendOpen = (trend: Trend) => {
    setActiveTrend(trend);
    setIsDetailOpen(true);
  };

  const userName =
    user?.fullName || user?.firstName || user?.username || "User";

  return (
    <div className="container mx-auto py-12 space-y-10 px-4">
      <div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          Welcome back, {userName}!
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
        {loading ? (
          <p className="text-sm text-muted-foreground">
            Loading subscriptions...
          </p>
        ) : subs.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No subscriptions yet. Open a trend on the home page and subscribe to
            get alerts.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {subs.map((trend) => (
              <TrendCard
                key={trend.id}
                trend={trend}
                onOpen={() => handleTrendOpen(trend)}
              />
            ))}
          </div>
        )}
      </div>

      <TrendDetail
        trend={activeTrend}
        open={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setActiveTrend(null);
        }}
        onSubscriptionChange={() => {
          // Refresh subscriptions only when subscription status actually changes
          fetchSubscriptions();
        }}
      />
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
