import { NextResponse } from "next/server";

// Identify trends that could become Polymarket prediction markets
// Focus on: measurable outcomes, time-bound events, clear decisions

const NEWS_API_KEY = process.env.NEWS_API_KEY || "";

interface NewsArticle {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
  content?: string;
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

// Keywords that indicate marketable events (things that could become prediction markets)
const marketableEventPatterns = {
  // Time-bound events
  deadlines: ["by", "deadline", "due", "before", "until", "by end of", "by the end"],
  dates: ["on", "in", "this month", "next month", "this year", "next year", "2024", "2025"],
  
  // Decisions/outcomes
  decisions: ["will", "vote", "decision", "approve", "reject", "pass", "fail", "announce", "announcement"],
  regulatory: ["regulation", "regulatory", "approval", "FDA", "SEC", "approval", "license", "permit"],
  policy: ["bill", "legislation", "law", "act", "policy", "rule"],
  
  // Product/company events
  launches: ["launch", "release", "unveil", "debut", "ship", "rollout"],
  financial: ["IPO", "merger", "acquisition", "earnings", "quarterly", "report"],
  
  // Measurable outcomes
  metrics: ["reach", "exceed", "above", "below", "target", "goal", "threshold"],
  milestones: ["first", "breakthrough", "achieve", "complete", "finish"],
  
  // Elections/votes
  elections: ["election", "vote", "ballot", "referendum", "primary"],
};

// Extract marketable events from news articles
function extractMarketableEvents(articles: NewsArticle[]): any[] {
  const events: any[] = [];
  
  for (const article of articles) {
    const text = `${article.title} ${article.description} ${article.content || ""}`.toLowerCase();
    
    // Check if article describes a marketable event
    const hasDeadline = marketableEventPatterns.deadlines.some(pattern => text.includes(pattern));
    const hasDate = marketableEventPatterns.dates.some(pattern => text.includes(pattern));
    const hasDecision = marketableEventPatterns.decisions.some(pattern => text.includes(pattern));
    const hasRegulatory = marketableEventPatterns.regulatory.some(pattern => text.includes(pattern));
    const hasPolicy = marketableEventPatterns.policy.some(pattern => text.includes(pattern));
    const hasLaunch = marketableEventPatterns.launches.some(pattern => text.includes(pattern));
    const hasFinancial = marketableEventPatterns.financial.some(pattern => text.includes(pattern));
    const hasElection = marketableEventPatterns.elections.some(pattern => text.includes(pattern));
    
    // Must have at least 2 indicators to be marketable
    const indicators = [
      hasDeadline, hasDate, hasDecision, hasRegulatory, 
      hasPolicy, hasLaunch, hasFinancial, hasElection
    ].filter(Boolean).length;
    
    if (indicators >= 2) {
      // Extract date/deadline if mentioned
      const dateMatch = text.match(/(?:by|on|before|until)\s+([a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|[a-z]+\s+\d{4})/i);
      const deadline = dateMatch ? dateMatch[1] : null;
      
      // Determine event type
      let eventType = "General";
      if (hasRegulatory) eventType = "Regulatory Decision";
      else if (hasPolicy) eventType = "Policy Decision";
      else if (hasLaunch) eventType = "Product Launch";
      else if (hasFinancial) eventType = "Financial Event";
      else if (hasElection) eventType = "Election";
      else if (hasDecision) eventType = "Decision";
      
      // Extract potential outcome/question
      const question = extractQuestion(article.title, article.description);
      
      events.push({
        id: `marketable-${article.url.split('/').pop()}-${Date.now()}`,
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        eventType,
        deadline,
        question,
        indicators: {
          hasDeadline,
          hasDate,
          hasDecision,
          hasRegulatory,
          hasPolicy,
          hasLaunch,
          hasFinancial,
          hasElection,
        },
        marketabilityScore: calculateMarketabilityScore(indicators, hasDeadline, hasDate),
      });
    }
  }
  
  return events.sort((a, b) => b.marketabilityScore - a.marketabilityScore);
}

// Extract a question/outcome that could become a prediction market
function extractQuestion(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  
  // Look for question patterns
  const questionPatterns = [
    /will (.+?)\?/i,
    /will (.+?) (?:by|on|before)/i,
    /(.+?) (?:will|to) (?:be|get|have|reach)/i,
    /(?:approve|reject|pass|fail) (.+?)/i,
  ];
  
  for (const pattern of questionPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  
  // Extract key decision point from title
  if (title.includes("will") || title.includes("approval") || title.includes("decision")) {
    return title.substring(0, 100);
  }
  
  return null;
}

// Calculate how marketable this event is (0-100)
function calculateMarketabilityScore(
  indicatorCount: number,
  hasDeadline: boolean,
  hasDate: boolean
): number {
  let score = indicatorCount * 10; // Base score from indicators
  
  // Bonus for having specific deadline/date
  if (hasDeadline) score += 20;
  if (hasDate) score += 15;
  
  // Cap at 100
  return Math.min(100, score);
}

// Map interests to search keywords for marketable events
const categoryKeywords: Record<string, string[]> = {
  AI: ["AI regulation", "AI approval", "GPT launch", "AI policy", "AI legislation"],
  Policy: ["bill", "legislation", "regulation", "vote", "approval", "policy decision"],
  Semiconductors: ["chip approval", "semiconductor regulation", "TSMC", "Intel", "NVIDIA"],
  Finance: ["IPO", "merger", "acquisition", "earnings", "SEC approval", "Fed decision"],
  "E-commerce": ["launch", "IPO", "merger", "acquisition"],
  Healthcare: ["FDA approval", "drug approval", "clinical trial", "medical device"],
  Energy: ["energy policy", "renewable energy", "regulation", "approval"],
  Crypto: ["crypto regulation", "bitcoin ETF", "approval", "SEC decision"],
  Climate: ["climate policy", "carbon regulation", "climate bill", "approval"],
  Gaming: ["game launch", "console release", "acquisition", "merger"],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interests = searchParams.get("interests")?.split(",") || [];
  
  if (!NEWS_API_KEY) {
    return NextResponse.json({
      events: [],
      message: "NewsAPI key not configured",
    });
  }
  
  try {
    const allEvents: any[] = [];
    
    for (const interest of interests) {
      const keywords = categoryKeywords[interest] || [interest];
      const query = keywords.slice(0, 3).join(" OR ");
      
      // Search for recent news about marketable events
      const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`;
      
      const response = await fetch(apiUrl, {
        next: { revalidate: 300 },
      });
      
      if (!response.ok) {
        console.error(`NewsAPI error for ${interest}: ${response.status}`);
        continue;
      }
      
      const data: NewsApiResponse = await response.json();
      
      if (data.status === "ok" && data.articles.length > 0) {
        const marketableEvents = extractMarketableEvents(data.articles);
        allEvents.push(...marketableEvents.map(event => ({
          ...event,
          category: interest,
        })));
      }
    }
    
    // Sort by marketability score
    allEvents.sort((a, b) => b.marketabilityScore - a.marketabilityScore);
    
    return NextResponse.json({
      events: allEvents.slice(0, 20),
      total: allEvents.length,
      message: `Found ${allEvents.length} potential Polymarket events`,
    });
  } catch (error) {
    console.error("Error fetching marketable events:", error);
    return NextResponse.json(
      {
        events: [],
        error: error instanceof Error ? error.message : "Failed to fetch marketable events",
      },
      { status: 500 }
    );
  }
}

