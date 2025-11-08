import { NextResponse } from "next/server";

const sampleTrends = [
  {
    id: "ai-regulation-eu",
    title: "EU AI regulation sparks LLM compliance tooling boom",
    category: "AI • Policy",
    probability: 68,
    summary: "Emerging compliance frameworks and legal scrutiny are accelerating demand for model governance and audit tooling across the EU.",
  },
  {
    id: "short-form-commerce",
    title: "Short-form video shopping expands to Western markets",
    category: "Social • Commerce",
    probability: 61,
    summary: "Creators and retailers pilot native checkout in short-form ecosystems, mirroring APAC traction and increasing conversion.",
  },
  {
    id: "chips-supply-glut",
    title: "Edge AI chips face short-term supply squeeze",
    category: "Semiconductors",
    probability: 43,
    summary: "OEMs report elongated lead times as edge accelerators see sudden demand spikes across consumer and industrial SKUs.",
  },
];

export async function GET() {
  return NextResponse.json(sampleTrends);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { id, question } = body as { id?: string; question?: string };
  // Simple seeded analysis
  const base = sampleTrends.find((t) => t.id === id)?.probability ?? 50;
  let hash = 0;
  const txt = (id || "") + (question || "");
  for (let i = 0; i < txt.length; i++) hash = (hash * 31 + txt.charCodeAt(i)) >>> 0;
  const delta = (hash % 21) - 10;
  const score = Math.max(0, Math.min(100, Math.round(base + delta / 3)));
  return NextResponse.json({ score, analysis: `Based on available public signals, the likelihood is approximately ${score}%.` });
}
