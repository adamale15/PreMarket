"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ChevronDown } from "lucide-react";
import TrendCard, { Trend } from "@/components/trends/TrendCard";
import TrendDetail from "@/components/trends/TrendDetail";

const makeSampleTrends = (): Trend[] => [
  {
    id: "ai-regulation-eu",
    title: "EU AI regulation sparks LLM compliance tooling boom",
    category: "AI • Policy",
    probability: 68,
    summary:
      "Emerging compliance frameworks and legal scrutiny are accelerating demand for model governance and audit tooling across the EU.",
    sources: [
      { name: "Financial Times — AI Act passes", url: "https://www.ft.com/", type: "news" },
      { name: "@techpolicy — thread on enforcement", url: "https://twitter.com/", type: "social" },
      { name: "Open-source governance repo", url: "https://github.com/", type: "research" },
    ],
    timeline: [
      { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 9).toISOString(), label: "Bill entered finalization phase" },
      { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(), label: "Key committee sign-off" },
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 20).toISOString(), label: "Expected rollout guidance" },
    ],
    similarEvents: [
      { title: "Will EU finalize AI Act guidance by Q2?", url: "https://polymarket.com/" },
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
      { name: "Reuters — TikTok Shop data", url: "https://www.reuters.com/", type: "news" },
      { name: "@ecomgrowth — adoption stats", url: "https://twitter.com/", type: "social" },
      { name: "Industry whitepaper", url: "https://example.com/", type: "research" },
    ],
    timeline: [
      { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(), label: "Pilot programs expand" },
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 10).toISOString(), label: "Creator marketplace incentives" },
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 40).toISOString(), label: "Broader market launch" },
    ],
    similarEvents: [
      { title: "Will TikTok Shop GMV exceed forecast?", url: "https://polymarket.com/" },
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
      { name: "Bloomberg — OEM guidance", url: "https://www.bloomberg.com/", type: "news" },
      { name: "@chipswatch — fab rumor", url: "https://twitter.com/", type: "social" },
      { name: "Vendor backlog data", url: "https://example.com/", type: "research" },
    ],
    timeline: [
      { date: new Date(Date.now() - 1000 * 60 * 60 * 24 * 12).toISOString(), label: "Lead times extend" },
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 15).toISOString(), label: "Allocation guidance" },
      { date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 55).toISOString(), label: "Normalization window" },
    ],
    similarEvents: [
      { title: "Will edge chip prices climb 10%+?", url: "https://polymarket.com/" },
    ],
  },
];

export default function MainClient() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<Trend | null>(null);
  const [showInterestModal, setShowInterestModal] = useState(false);
  const [interests, setInterests] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        return JSON.parse(localStorage.getItem("tf_interests") || "[]");
      } catch {
        return [];
      }
    }
    return [];
  });

  const sampleTrends = useMemo(() => makeSampleTrends(), []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("tf_interests", JSON.stringify(interests));
    }
  }, [interests]);

  const filtered = useMemo(() => {
    if (interests.length === 0) return sampleTrends;
    return sampleTrends.filter((t) =>
      interests.some((i) => t.category.toLowerCase().includes(i.toLowerCase())),
    );
  }, [interests, sampleTrends]);

  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 opacity-40 pointer-events-none">
          <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-fuchsia-400 blur-3xl" />
          <div className="absolute top-40 -right-20 h-80 w-80 rounded-full bg-violet-500 blur-3xl" />
        </div>
        <div className="container mx-auto py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border bg-secondary px-3 py-1 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Predictive insight platform
            </span>
            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">See tomorrow's trends today</h1>
            <p className="text-lg text-muted-foreground max-w-xl">We analyze news, social, and real-time sources to forecast what will trend. Subscribe, explore sources, and ask the in-built AI for outcomes and probabilities.</p>
            <div className="flex items-center gap-3">
              <button onClick={() => setShowInterestModal(true)} className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-5 py-3 text-sm font-semibold shadow-lg hover:brightness-110">Get started — pick interests</button>
              <a href="#trends" className="inline-flex items-center justify-center rounded-md border bg-secondary px-5 py-3 text-sm hover:bg-secondary/80">Explore trends</a>
            </div>
            <p className="text-xs text-muted-foreground">No spam. Tune alerts like “notify me when probability ≥ 50%”.</p>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-card p-6 shadow-xl">
              <div className="grid grid-cols-3 gap-4">
                <MiniCard label="AI • Policy" value="68%" caption="LLM compliance surge" />
                <MiniCard label="Social • Commerce" value="61%" caption="Short-form checkout" />
                <MiniCard label="Semiconductors" value="43%" caption="Edge chip squeeze" />
              </div>
              <div className="mt-6 rounded-xl border bg-secondary p-4 text-sm text-muted-foreground">Ask: “If regulation tightens, how does the timeline shift?”</div>
            </div>
          </div>
        </div>
      </section>

      <section id="trends" className="container mx-auto py-12 space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Possible future trends</h2>
            <p className="text-muted-foreground">Signals from news, X, research, and more.</p>
          </div>
          <button id="filter-btn" className="inline-flex items-center gap-2 rounded-md border bg-secondary px-3 py-2 text-sm hover:bg-secondary/80">Filter <ChevronDown className="h-4 w-4" /></button>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((t) => (
            <TrendCard key={t.id} trend={t} onOpen={(x) => { setActive(x); setOpen(true); }} />
          ))}
        </div>
      </section>

      <InterestModal interests={interests} setInterests={setInterests} open={showInterestModal} onClose={() => setShowInterestModal(false)} />

      <TrendDetail trend={active} open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function MiniCard({ label, value, caption }: { label: string; value: string; caption: string }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-[11px] uppercase tracking-wider text-foreground/60">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground mt-1">{caption}</div>
    </div>
  );
}

function InterestModal({ interests, setInterests, open, onClose }: { interests: string[]; setInterests: (v: string[]) => void; open: boolean; onClose: () => void }) {
  const tags = ["AI", "Policy", "Semiconductors", "Finance", "E-commerce", "Healthcare", "Energy", "Crypto", "Climate", "Gaming"]; 
  const toggle = (t: string) => {
    setInterests(
      interests.includes(t) ? interests.filter((x) => x !== t) : [...interests, t]
    );
  };
  
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-24 mx-auto max-w-2xl rounded-2xl border bg-card p-6 shadow-xl">
        <h3 className="text-xl font-bold">Pick your topics of interest</h3>
        <p className="text-sm text-muted-foreground mt-1">We'll personalize your feed and alerts.</p>
        <div className="mt-5 flex flex-wrap gap-2">
          {tags.map((t) => (
            <button
              key={t}
              onClick={() => toggle(t)}
              className={
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm " +
                (interests.includes(t) ? "bg-primary text-primary-foreground border-primary" : "bg-secondary hover:bg-secondary/80")
              }
            >
              {interests.includes(t) && <span className="h-4 w-4 grid place-items-center">✓</span>} {t}
            </button>
          ))}
        </div>
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-semibold">Save preferences</button>
        </div>
      </div>
    </div>
  );
}
