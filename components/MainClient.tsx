"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Sparkles, ChevronDown, Filter } from "lucide-react";
import TrendCard, { Trend } from "@/components/trends/TrendCard";
import TrendDetail from "@/components/trends/TrendDetail";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Generate sample trends with a base date to avoid hydration mismatches
const getSampleTrends = (baseDate: number): Trend[] => [
  {
    id: "ai-regulation-eu",
    title: "EU AI regulation sparks LLM compliance tooling boom",
    category: "AI • Policy",
    probability: 68,
    summary:
      "Emerging compliance frameworks and legal scrutiny are accelerating demand for model governance and audit tooling across the EU.",
    sources: [
      {
        name: "Financial Times — AI Act passes",
        url: "https://www.ft.com/",
        type: "news",
      },
      {
        name: "@techpolicy — thread on enforcement",
        url: "https://twitter.com/",
        type: "social",
      },
      {
        name: "Open-source governance repo",
        url: "https://github.com/",
        type: "research",
      },
    ],
    timeline: [
      {
        date: new Date(baseDate - 1000 * 60 * 60 * 24 * 9).toISOString(),
        label: "Bill entered finalization phase",
      },
      {
        date: new Date(baseDate - 1000 * 60 * 60 * 24 * 2).toISOString(),
        label: "Key committee sign-off",
      },
      {
        date: new Date(baseDate + 1000 * 60 * 60 * 24 * 20).toISOString(),
        label: "Expected rollout guidance",
      },
    ],
    similarEvents: [
      {
        title: "Will EU finalize AI Act guidance by Q2?",
        url: "https://polymarket.com/",
      },
    ],
  },
  {
    id: "short-form-commerce",
    title: "Short-form video shopping expands to Western markets",
    category: "Social • Commerce",
    probability: 61,
    summary:
      "Creators and retailers pilot native checkout in short-form ecosystems, mirroring APAC traction and increasing conversion.",
    sources: [
      {
        name: "Reuters — TikTok Shop data",
        url: "https://www.reuters.com/",
        type: "news",
      },
      {
        name: "@ecomgrowth — adoption stats",
        url: "https://twitter.com/",
        type: "social",
      },
      {
        name: "Industry whitepaper",
        url: "https://example.com/",
        type: "research",
      },
    ],
    timeline: [
      {
        date: new Date(baseDate - 1000 * 60 * 60 * 24 * 5).toISOString(),
        label: "Pilot programs expand",
      },
      {
        date: new Date(baseDate + 1000 * 60 * 60 * 24 * 10).toISOString(),
        label: "Creator marketplace incentives",
      },
      {
        date: new Date(baseDate + 1000 * 60 * 60 * 24 * 40).toISOString(),
        label: "Broader market launch",
      },
    ],
    similarEvents: [
      {
        title: "Will TikTok Shop GMV exceed forecast?",
        url: "https://polymarket.com/",
      },
    ],
  },
  {
    id: "chips-supply-glut",
    title: "Edge AI chips face short-term supply squeeze",
    category: "Semiconductors",
    probability: 43,
    summary:
      "OEMs report elongated lead times as edge accelerators see sudden demand spikes across consumer and industrial SKUs.",
    sources: [
      {
        name: "Bloomberg — OEM guidance",
        url: "https://www.bloomberg.com/",
        type: "news",
      },
      {
        name: "@chipswatch — fab rumor",
        url: "https://twitter.com/",
        type: "social",
      },
      {
        name: "Vendor backlog data",
        url: "https://example.com/",
        type: "research",
      },
    ],
    timeline: [
      {
        date: new Date(baseDate - 1000 * 60 * 60 * 24 * 12).toISOString(),
        label: "Lead times extend",
      },
      {
        date: new Date(baseDate + 1000 * 60 * 60 * 24 * 15).toISOString(),
        label: "Allocation guidance",
      },
      {
        date: new Date(baseDate + 1000 * 60 * 60 * 24 * 55).toISOString(),
        label: "Normalization window",
      },
    ],
    similarEvents: [
      {
        title: "Will edge chip prices climb 10%+?",
        url: "https://polymarket.com/",
      },
    ],
  },
];

export default function MainClient() {
  const router = useRouter();
  const { isSignedIn, user } = useUser();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Trend | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [interests, setInterests] = useState<string[]>([]);
  const [realTrends, setRealTrends] = useState<Trend[]>([]);
  const [loadingTrends, setLoadingTrends] = useState(false);
  const [filterProbability, setFilterProbability] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("probability-desc");

  // Initialize interests and mounted state on client only
  useEffect(() => {
    setMounted(true);

    // Fetch interests from Supabase if user is signed in
    const fetchInterests = async () => {
      if (isSignedIn) {
        try {
          const response = await fetch("/api/user/interests");
          const data = await response.json();
          if (data.interests && Array.isArray(data.interests)) {
            setInterests(data.interests);
          }
        } catch (error) {
          console.error("Error fetching interests:", error);
          // Fallback to localStorage for migration
          try {
            const stored = localStorage.getItem("tf_interests");
            if (stored) {
              const parsed = JSON.parse(stored);
              if (Array.isArray(parsed)) {
                setInterests(parsed);
                // Migrate to Supabase
                await fetch("/api/user/interests", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ interests: parsed }),
                });
              }
            }
          } catch {
            // Ignore errors
          }
        }
      } else {
        // For non-signed-in users, use localStorage
        try {
          const stored = localStorage.getItem("tf_interests");
          if (stored) {
            setInterests(JSON.parse(stored));
          }
        } catch {
          // Ignore errors
        }
      }
    };

    fetchInterests();
  }, [isSignedIn]);

  // Fetch real trends from news API when interests are set
  useEffect(() => {
    if (!mounted) return;

    const fetchTrends = async () => {
      setLoadingTrends(true);
      try {
        // Build API URL for predictive trends based on interests
        let url = "/api/trends/predict?";
        if (interests.length > 0) {
          url += `interests=${encodeURIComponent(interests.join(","))}`;
          console.log(`Fetching trends for interests: ${interests.join(", ")}`);
        } else {
          // If no interests, show empty state
          setRealTrends([]);
          setLoadingTrends(false);
          return;
        }

        console.log(`Fetching from: ${url}`);
        const response = await fetch(url);
        const data = await response.json();
        console.log(`API response:`, {
          trendsCount: data.trends?.length || 0,
          interests,
        });

        if (data.trends && data.trends.length > 0) {
          console.log(
            `Fetched ${data.trends.length} trends for interests:`,
            interests,
          );
          setRealTrends(data.trends);

          // Store trends in Supabase (non-blocking)
          fetch("/api/trends/store", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data.trends),
          }).catch((error) => {
            console.error("Error storing trends:", error);
          });
        } else {
          console.log("No trends returned from API");
          // Don't show sample trends if they don't match interests
          setRealTrends([]);
        }
      } catch (error) {
        console.error("Error fetching trends:", error);
        // Don't show sample trends on error - let user know we're working on it
        setRealTrends([]);
      } finally {
        setLoadingTrends(false);
      }
    };

    fetchTrends();
  }, [mounted, interests]);

  useEffect(() => {
    if (!mounted) return;

    // Save interests to Supabase if user is signed in
    if (isSignedIn && interests.length >= 0) {
      fetch("/api/user/interests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interests }),
      }).catch((error) => {
        console.error("Error saving interests:", error);
      });
    }

    // Also save to localStorage as backup
    try {
      localStorage.setItem("tf_interests", JSON.stringify(interests));
    } catch {
      // Ignore errors
    }
  }, [interests, mounted, isSignedIn]);

  const filtered = useMemo(() => {
    if (!mounted || realTrends.length === 0) return [];
    if (interests.length === 0) return realTrends;

    // Filter trends by interests
    let filtered = realTrends.filter((t) => {
      const categoryLower = t.category.toLowerCase();
      return interests.some((i) => {
        const interestLower = i.toLowerCase();
        // Check multiple matching strategies
        return (
          categoryLower.includes(interestLower) ||
          interestLower.includes(categoryLower) ||
          // Handle "AI • Policy" format - check each part
          categoryLower
            .split(/[•·\-\s]+/)
            .some((part) => part.trim() === interestLower)
        );
      });
    });

    // Apply probability filter
    if (filterProbability !== "all") {
      filtered = filtered.filter((t) => {
        const prob = t.probability || 0;
        switch (filterProbability) {
          case "high":
            return prob >= 60;
          case "medium":
            return prob >= 40 && prob < 60;
          case "low":
            return prob < 40;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "probability-desc":
          return (b.probability || 0) - (a.probability || 0);
        case "probability-asc":
          return (a.probability || 0) - (b.probability || 0);
        case "date-desc":
          // Sort by first timeline date if available
          const aDate = a.timeline?.[0]?.date
            ? new Date(a.timeline[0].date).getTime()
            : 0;
          const bDate = b.timeline?.[0]?.date
            ? new Date(b.timeline[0].date).getTime()
            : 0;
          return bDate - aDate;
        case "date-asc":
          const aDateAsc = a.timeline?.[0]?.date
            ? new Date(a.timeline[0].date).getTime()
            : 0;
          const bDateAsc = b.timeline?.[0]?.date
            ? new Date(b.timeline[0].date).getTime()
            : 0;
          return aDateAsc - bDateAsc;
        default:
          return 0;
      }
    });

    return filtered;
  }, [interests, realTrends, mounted, filterProbability, sortBy]);

  return (
    <div>
      <section className="relative overflow-hidden min-h-[80vh] flex items-center">
        <div className="absolute inset-0 -z-10 opacity-60 dark:opacity-30 pointer-events-none">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-400 dark:bg-fuchsia-500/50 blur-3xl animate-pulse" />
          <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-violet-500 dark:bg-violet-600/50 blur-3xl animate-pulse delay-1000" />
          <div className="absolute bottom-20 left-1/2 h-60 w-60 rounded-full bg-blue-400 dark:bg-blue-500/30 blur-3xl animate-pulse delay-2000" />
        </div>
        <div className="container mx-auto py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center px-4">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full backdrop-blur-xl bg-primary/10 dark:bg-primary/20 border border-primary/30 dark:border-primary/40 px-4 py-2 text-xs font-semibold shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Predictive
              insight platform
            </span>
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text text-transparent">
              Predict future trends from today&apos;s signals
            </h1>
            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              We analyze current news, research, and market signals to predict
              what trends will emerge in the coming months. Select your
              interests to see personalized future predictions with probability
              scores and timelines.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (isSignedIn) {
                    setShowInterestModal(true);
                  } else {
                    router.push("/sign-in");
                  }
                }}
                className="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground px-6 py-3 text-sm font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-primary/20"
              >
                Get started — pick interests
              </button>
              <a
                href="#trends"
                className="inline-flex items-center justify-center rounded-xl backdrop-blur-xl bg-background/50 dark:bg-background/30 border border-border/50 px-6 py-3 text-sm font-medium hover:bg-background/80 dark:hover:bg-background/50 transition-all duration-300 hover:scale-105 shadow-lg"
              >
                Explore trends
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              No spam. Tune alerts like &quot;notify me when probability ≥ 50%&quot;.
            </p>
          </div>

          <div className="relative">
            <div className="rounded-3xl backdrop-blur-2xl bg-card/60 dark:bg-card/40 border border-border/50 p-8 shadow-2xl hover:shadow-3xl transition-all duration-500">
              <div className="grid grid-cols-3 gap-4">
                <MiniCard
                  label="AI • Policy"
                  value="68%"
                  caption="LLM compliance surge"
                />
                <MiniCard
                  label="Social • Commerce"
                  value="61%"
                  caption="Short-form checkout"
                />
                <MiniCard
                  label="Semiconductors"
                  value="43%"
                  caption="Edge chip squeeze"
                />
              </div>
              <div className="mt-6 rounded-xl backdrop-blur-sm bg-secondary/50 dark:bg-secondary/30 border border-border/50 p-4 text-sm text-muted-foreground">
                Ask: &quot;If regulation tightens, how does the timeline shift?&quot;
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="trends" className="container mx-auto py-12 space-y-6 px-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Future trend predictions
            </h2>
            <p className="text-muted-foreground mt-2">
              Predictive insights based on current signals from news, research,
              and market data.
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              id="filter-btn"
              className="inline-flex items-center gap-2 rounded-xl backdrop-blur-xl bg-background/50 dark:bg-background/30 border border-border/50 px-4 py-2 text-sm font-medium hover:bg-background/80 dark:hover:bg-background/50 transition-all duration-300 shadow-lg hover:scale-105"
            >
              <Filter className="h-4 w-4" />
              Filter <ChevronDown className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Probability</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setFilterProbability("all")}
                className={filterProbability === "all" ? "bg-accent" : ""}
              >
                All probabilities
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilterProbability("high")}
                className={filterProbability === "high" ? "bg-accent" : ""}
              >
                High (≥60%)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilterProbability("medium")}
                className={filterProbability === "medium" ? "bg-accent" : ""}
              >
                Medium (40-59%)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setFilterProbability("low")}
                className={filterProbability === "low" ? "bg-accent" : ""}
              >
                Low ({"<"} 40%)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuItem
                onClick={() => setSortBy("probability-desc")}
                className={sortBy === "probability-desc" ? "bg-accent" : ""}
              >
                Probability (High → Low)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("probability-asc")}
                className={sortBy === "probability-asc" ? "bg-accent" : ""}
              >
                Probability (Low → High)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("date-desc")}
                className={sortBy === "date-desc" ? "bg-accent" : ""}
              >
                Date (Newest First)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setSortBy("date-asc")}
                className={sortBy === "date-asc" ? "bg-accent" : ""}
              >
                Date (Oldest First)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {loadingTrends ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-muted-foreground">
              Analyzing signals and generating predictions...
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="text-muted-foreground text-center">
              <p className="text-lg font-medium mb-2">
                No trends found for your selected interests
              </p>
              <p className="text-sm">
                {interests.length > 0
                  ? `We couldn't find relevant trends for: ${interests.join(", ")}. Try selecting different interests or check back later.`
                  : "Please select your interests to see personalized trends."}
              </p>
            </div>
            <button
              onClick={() => {
                if (isSignedIn) {
                  setShowInterestModal(true);
                } else {
                  router.push("/sign-in");
                }
              }}
              className="inline-flex items-center justify-center rounded-xl backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground px-6 py-3 text-sm font-semibold shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 border border-primary/20"
            >
              {interests.length > 0 ? "Change interests" : "Select interests"}
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((t) => (
              <TrendCard
                key={t.id}
                trend={t}
                onOpen={(x) => {
                  setActive(x);
                  setOpen(true);
                }}
              />
            ))}
          </div>
        )}
      </section>

      <InterestModal
        interests={interests}
        setInterests={setInterests}
        open={showInterestModal}
        onClose={() => setShowInterestModal(false)}
      />

      <TrendDetail trend={active} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function MiniCard({
  label,
  value,
  caption,
}: {
  label: string;
  value: string;
  caption: string;
}) {
  return (
    <div className="rounded-xl backdrop-blur-sm bg-background/40 dark:bg-background/30 border border-border/50 p-4 hover:bg-background/60 dark:hover:bg-background/40 transition-all duration-300 shadow-sm">
      <div className="text-[11px] uppercase tracking-wider text-foreground/70 dark:text-foreground/60 font-semibold">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
        {value}
      </div>
      <div className="text-xs text-muted-foreground mt-1">{caption}</div>
    </div>
  );
}

function InterestModal({
  interests,
  setInterests,
  open,
  onClose,
}: {
  interests: string[];
  setInterests: (v: string[]) => void;
  open: boolean;
  onClose: () => void;
}) {
  const tags = [
    "AI",
    "Policy",
    "Semiconductors",
    "Finance",
    "E-commerce",
    "Healthcare",
    "Energy",
    "Crypto",
    "Climate",
    "Gaming",
  ];
  const toggle = (t: string) => {
    setInterests(
      interests.includes(t)
        ? interests.filter((x) => x !== t)
        : [...interests, t],
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative max-w-2xl w-full rounded-2xl backdrop-blur-2xl bg-card/80 dark:bg-card/60 border border-border/50 p-8 shadow-2xl">
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-foreground">
            Pick your topics of interest
          </h3>
          <p className="text-sm text-muted-foreground mt-2">
            We&apos;ll personalize your feed and alerts.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={
                "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-300 " +
                (interests.includes(t)
                  ? "backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground border-primary/50 shadow-lg"
                  : "backdrop-blur-sm bg-background/50 dark:bg-background/30 border-border/50 hover:bg-background/80 dark:hover:bg-background/50 text-foreground")
              }
            >
              {interests.includes(t) && (
                <span className="h-4 w-4 flex items-center justify-center text-xs">
                  ✓
                </span>
              )}
              {t}
            </button>
          ))}
        </div>

        <div className="flex justify-end pt-4 border-t border-border/50">
          <button
            onClick={onClose}
            className="rounded-lg backdrop-blur-sm bg-primary/90 dark:bg-primary/80 text-primary-foreground px-5 py-2.5 text-sm font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 border border-primary/20"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}
