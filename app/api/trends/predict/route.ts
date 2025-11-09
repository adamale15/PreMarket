import { NextResponse } from "next/server";

// NewsAPI integration for trend prediction
const NEWS_API_KEY = process.env.NEWS_API_KEY || "";
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || "";
const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";

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

// Map interests to trend prediction templates and keywords
const trendTemplates: Record<
  string,
  {
    keywords: string[];
    predictions: string[];
    timeframes: string[];
  }
> = {
  AI: {
    keywords: [
      "artificial intelligence",
      "AI",
      "machine learning",
      "LLM",
      "GPT",
      "neural network",
      "deep learning",
    ],
    predictions: [
      "{topic} adoption accelerates in {sector}",
      "{topic} regulation drives compliance tooling demand",
      "{topic} integration becomes standard in {sector}",
      "{topic} capabilities expand to {application}",
      "{topic} market consolidation accelerates",
    ],
    timeframes: ["3-6 months", "6-12 months", "12-18 months", "18-24 months"],
  },
  Policy: {
    keywords: [
      "regulation",
      "policy",
      "legislation",
      "government",
      "law",
      "compliance",
    ],
    predictions: [
      "{topic} regulation creates new market opportunities",
      "{topic} policy shifts drive industry adaptation",
      "{topic} legislation accelerates {sector} innovation",
      "{topic} compliance requirements reshape {sector}",
      "{topic} regulatory framework impacts {sector}",
    ],
    timeframes: ["6-12 months", "12-18 months", "18-24 months"],
  },
  Semiconductors: {
    keywords: [
      "semiconductor",
      "chip",
      "TSMC",
      "Intel",
      "NVIDIA",
      "processor",
      "silicon",
    ],
    predictions: [
      "{topic} supply chain shifts create opportunities",
      "{topic} demand surge drives capacity expansion",
      "{topic} innovation accelerates in {application}",
      "{topic} market consolidation reshapes industry",
      "{topic} pricing dynamics shift due to {factor}",
    ],
    timeframes: ["3-6 months", "6-12 months", "12-18 months"],
  },
  Finance: {
    keywords: [
      "finance",
      "banking",
      "cryptocurrency",
      "bitcoin",
      "stock",
      "market",
      "investment",
    ],
    predictions: [
      "{topic} adoption accelerates in {sector}",
      "{topic} regulation creates new opportunities",
      "{topic} market dynamics shift toward {trend}",
      "{topic} innovation disrupts traditional {sector}",
      "{topic} integration becomes mainstream",
    ],
    timeframes: ["3-6 months", "6-12 months", "12-18 months"],
  },
  "E-commerce": {
    keywords: [
      "e-commerce",
      "online shopping",
      "retail",
      "amazon",
      "shopify",
      "marketplace",
    ],
    predictions: [
      "{topic} platforms expand into {sector}",
      "{topic} shopping experiences evolve with {technology}",
      "{topic} market share shifts toward {trend}",
      "{topic} innovation drives {sector} growth",
      "{topic} consumer behavior shifts toward {pattern}",
    ],
    timeframes: ["3-6 months", "6-12 months", "12-18 months"],
  },
  Healthcare: {
    keywords: [
      "healthcare",
      "medical",
      "pharmaceutical",
      "health",
      "medicine",
      "treatment",
    ],
    predictions: [
      "{topic} innovation accelerates {treatment} adoption",
      "{topic} technology transforms {sector} delivery",
      "{topic} regulation opens new {sector} markets",
      "{topic} research breakthroughs enable {application}",
      "{topic} market expansion driven by {factor}",
    ],
    timeframes: ["6-12 months", "12-18 months", "18-24 months"],
  },
  Energy: {
    keywords: [
      "energy",
      "renewable energy",
      "solar energy",
      "wind energy",
      "oil",
      "gas",
      "electricity",
      "nuclear energy",
      "hydroelectric",
      "geothermal",
      "battery",
      "energy storage",
      "power grid",
      "energy policy",
      "energy transition",
      "clean energy",
      "fossil fuels",
      "natural gas",
      "crude oil",
      "petroleum",
      "energy infrastructure",
      "energy market",
      "energy prices",
      "energy sector",
      "energy investment",
      "energy technology",
      "solar power",
      "wind power",
      "energy efficiency",
      "energy consumption",
      "energy production",
      "energy crisis",
      "energy security",
      "energy independence",
      "carbon neutral",
      "net zero",
      "green energy",
    ],
    predictions: [
      "{topic} transition accelerates in {region}",
      "{topic} adoption creates new market opportunities",
      "{topic} infrastructure expansion drives {sector} growth",
      "{topic} policy shifts accelerate {technology} deployment",
      "{topic} market dynamics favor {trend}",
    ],
    timeframes: ["6-12 months", "12-18 months", "18-24 months"],
  },
  Crypto: {
    keywords: [
      "cryptocurrency",
      "bitcoin",
      "ethereum",
      "blockchain",
      "crypto",
      "DeFi",
    ],
    predictions: [
      "{topic} adoption expands to {sector}",
      "{topic} regulation creates clarity for {application}",
      "{topic} innovation drives {technology} growth",
      "{topic} market maturation enables {trend}",
      "{topic} integration becomes mainstream in {sector}",
    ],
    timeframes: ["3-6 months", "6-12 months", "12-18 months"],
  },
  Climate: {
    keywords: [
      "climate",
      "environment",
      "carbon",
      "emissions",
      "sustainability",
      "green",
    ],
    predictions: [
      "{topic} initiatives drive {sector} transformation",
      "{topic} regulation accelerates {technology} adoption",
      "{topic} market shifts favor {sector} innovation",
      "{topic} investment flows into {application}",
      "{topic} policy creates opportunities in {sector}",
    ],
    timeframes: ["6-12 months", "12-18 months", "18-24 months"],
  },
  Gaming: {
    keywords: [
      "gaming",
      "video game",
      "video games",
      "esports",
      "e-sports",
      "console",
      "gaming industry",
      "streaming",
      "twitch",
      "youtube gaming",
      "playstation",
      "xbox",
      "nintendo",
      "steam",
      "epic games",
      "roblox",
      "mobile gaming",
      "pc gaming",
      "game development",
      "game publisher",
      "gaming market",
      "gaming revenue",
      "game sales",
      "gaming platform",
      "virtual reality gaming",
      "VR gaming",
      "gaming tournament",
      "gaming event",
    ],
    predictions: [
      "{topic} market expansion driven by {technology}",
      "{topic} innovation transforms {sector} experiences",
      "{topic} adoption accelerates in {demographic}",
      "{topic} platforms evolve toward {trend}",
      "{topic} market dynamics shift toward {pattern}",
    ],
    timeframes: ["3-6 months", "6-12 months", "12-18 months"],
  },
};

// Exclusion keywords to filter out unrelated events
const categoryExclusions: Record<string, string[]> = {
  Gaming: [
    "crypto",
    "bitcoin",
    "ethereum",
    "solana",
    "xrp",
    "trading",
    "price",
    "up or down",
    "cryptocurrency",
    "blockchain",
    "defi",
    "nft",
  ],
  AI: ["crypto", "bitcoin", "trading", "price"],
  Semiconductors: ["crypto", "bitcoin", "trading", "price"],
  Policy: ["crypto", "bitcoin", "trading", "price"],
  Finance: [], // Finance can include crypto
  Crypto: [], // Crypto is crypto
  Healthcare: ["crypto", "bitcoin", "trading", "price"],
  Energy: ["crypto", "bitcoin", "trading", "price"],
  Climate: ["crypto", "bitcoin", "trading", "price"],
  "E-commerce": ["crypto", "bitcoin", "trading", "price"],
};

// Category-specific sectors and factors
const categorySpecificData: Record<
  string,
  {
    sectors: string[];
    factors: string[];
    topics: string[];
  }
> = {
  Gaming: {
    sectors: [
      "console",
      "mobile",
      "PC",
      "streaming",
      "esports",
      "indie",
      "cloud gaming",
      "VR",
      "AR",
    ],
    factors: [
      "adoption",
      "innovation",
      "revenue",
      "user growth",
      "content",
      "subscription",
      "free-to-play",
    ],
    topics: [
      "gaming",
      "video games",
      "esports",
      "streaming",
      "console",
      "mobile gaming",
      "game development",
      "gaming platforms",
    ],
  },
  AI: {
    sectors: ["enterprise", "consumer", "healthcare", "finance"],
    factors: ["adoption", "innovation", "regulation", "investment"],
    topics: ["AI", "artificial intelligence", "machine learning", "LLM"],
  },
  Semiconductors: {
    sectors: ["consumer electronics", "automotive", "data centers", "mobile"],
    factors: ["supply", "demand", "innovation", "capacity"],
    topics: ["semiconductors", "chips", "processors", "silicon"],
  },
  Policy: {
    sectors: ["government", "regulatory", "compliance"],
    factors: ["regulation", "legislation", "enforcement", "policy"],
    topics: ["policy", "regulation", "legislation", "government"],
  },
  Finance: {
    sectors: ["banking", "investment", "crypto", "markets"],
    factors: ["regulation", "adoption", "innovation", "volatility"],
    topics: ["finance", "banking", "cryptocurrency", "markets"],
  },
  "E-commerce": {
    sectors: ["retail", "marketplace", "logistics"],
    factors: ["adoption", "growth", "innovation", "competition"],
    topics: ["e-commerce", "retail", "online shopping", "marketplace"],
  },
  Healthcare: {
    sectors: ["pharmaceutical", "medical devices", "telemedicine"],
    factors: ["innovation", "regulation", "adoption", "research"],
    topics: ["healthcare", "medical", "pharmaceutical", "health"],
  },
  Energy: {
    sectors: ["renewable", "oil & gas", "electricity"],
    factors: ["transition", "adoption", "policy", "investment"],
    topics: ["energy", "renewable", "solar", "wind"],
  },
  Crypto: {
    sectors: ["DeFi", "NFTs", "trading", "payments"],
    factors: ["adoption", "regulation", "innovation", "volatility"],
    topics: ["crypto", "cryptocurrency", "bitcoin", "blockchain"],
  },
  Climate: {
    sectors: ["renewable energy", "carbon capture", "sustainability"],
    factors: ["policy", "investment", "adoption", "innovation"],
    topics: ["climate", "environment", "carbon", "sustainability"],
  },
};

// Validate articles are actually related to the interest category
function validateArticlesRelevance(
  articles: NewsArticle[],
  interest: string,
): NewsArticle[] {
  const template = trendTemplates[interest];
  if (!template) return articles;

  const keywords = template.keywords.map((k) => k.toLowerCase());
  const exclusions = categoryExclusions[interest] || [];
  const exclusionLower = exclusions.map((e) => e.toLowerCase());

  return articles.filter((article) => {
    const text =
      `${article.title} ${article.description} ${article.content || ""}`.toLowerCase();

    // Exclude if contains exclusion keywords (but be lenient - only exclude if clearly unrelated)
    if (
      exclusionLower.some((exclusion) => {
        // For Gaming, only exclude if it's clearly crypto-related, not just mentions "trading" in gaming context
        if (interest === "Gaming" && exclusion === "trading") {
          // Only exclude if it's about crypto trading, not game trading
          return text.includes("crypto") && text.includes("trading");
        }
        return text.includes(exclusion);
      })
    ) {
      return false;
    }

    // Must contain at least one category keyword (use flexible matching)
    return keywords.some((keyword) => {
      // For multi-word keywords, check if all words appear
      if (keyword.includes(" ")) {
        const words = keyword.split(" ");
        return words.every((word) => text.includes(word));
      }
      // For single words, use word boundary or flexible matching
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "i",
      );
      return regex.test(text) || text.includes(keyword);
    });
  });
}

// Extract key topics and sectors from articles (category-aware)
function extractKeyTopics(
  articles: NewsArticle[],
  interest: string,
): {
  topics: string[];
  sectors: string[];
  factors: string[];
} {
  const categoryData =
    categorySpecificData[interest] || categorySpecificData["AI"];

  const allText = articles
    .map((a) => `${a.title} ${a.description} ${a.content || ""}`)
    .join(" ")
    .toLowerCase();

  // Find matching sectors from category-specific list
  const foundSectors = categoryData.sectors.filter((s) =>
    allText.includes(s.toLowerCase()),
  );

  // Find matching factors from category-specific list
  const foundFactors = categoryData.factors.filter((f) =>
    allText.includes(f.toLowerCase()),
  );

  // Use category-specific topics, but also extract relevant terms from articles
  const topics: string[] = [...categoryData.topics];

  // Extract category-relevant terms from articles
  articles.forEach((article) => {
    const titleLower = article.title.toLowerCase();
    // Look for category keywords in title
    categoryData.topics.forEach((topic) => {
      if (titleLower.includes(topic.toLowerCase()) && !topics.includes(topic)) {
        topics.push(topic);
      }
    });
  });

  return {
    topics: [...new Set(topics)].slice(0, 5),
    sectors:
      foundSectors.length > 0
        ? foundSectors
        : [categoryData.sectors[0] || "consumer"],
    factors:
      foundFactors.length > 0
        ? foundFactors
        : [categoryData.factors[0] || "innovation"],
  };
}

// Extract marketable events from articles (events that could become Polymarket markets)
function extractMarketableEvents(articles: NewsArticle[]): NewsArticle[] {
  // First filter out software packages, versions, etc.
  const filteredArticles = articles.filter((article) => {
    const text =
      `${article.title} ${article.description} ${article.content || ""}`.toLowerCase();

    // Exclude software packages / versions
    if (
      /\b(v\d+\.\d+\.\d+|version \d+|package|library|npm|pypi|pip install|github\.com)\b/i.test(
        text,
      )
    ) {
      return false;
    }
    if (
      /\b(lib\w+|pkg\w+|module|dependency|install|update|upgrade)\b/i.test(text)
    ) {
      return false;
    }
    if (/\b(\w+-\d+\.\d+\.\d+|\d+\.\d+\.\d+\.\d+)\b/i.test(text)) {
      // Version numbers like 0.0.17.1 or libtpu-0.0.17.1
      return false;
    }

    return true;
  });

  const marketableKeywords = [
    "will",
    "by",
    "deadline",
    "approval",
    "decision",
    "vote",
    "launch",
    "release",
    "announcement",
    "regulation",
    "bill",
    "legislation",
    "FDA",
    "SEC",
    "IPO",
    "merger",
    "acquisition",
    "election",
    "referendum",
    "target",
    "goal",
  ];

  return filteredArticles.filter((article) => {
    const text =
      `${article.title} ${article.description} ${article.content || ""}`.toLowerCase();
    const keywordMatches = marketableKeywords.filter((keyword) =>
      text.includes(keyword),
    ).length;

    // Must have at least 2 marketable keywords
    return keywordMatches >= 2;
  });
}

// Generate predictive trend from articles - focus on marketable events
function generatePredictiveTrend(
  interest: string,
  articles: NewsArticle[],
  index: number,
): any {
  // Prioritize marketable events (things that could become Polymarket markets)
  const marketableArticles = extractMarketableEvents(articles);
  const articlesToUse =
    marketableArticles.length > 0 ? marketableArticles : articles;

  // Use the most recent/newsworthy article as the base
  const primaryArticle = articlesToUse[0] || articles[0];

  // Extract event details from article
  const articleText =
    `${primaryArticle.title} ${primaryArticle.description}`.toLowerCase();

  // Try to extract a specific event/question
  let title = primaryArticle.title;
  let question: string | null = null;

  // Look for question patterns
  if (articleText.includes("will")) {
    const willMatch = primaryArticle.title.match(/will (.+?)(?:\?|\.|$)/i);
    if (willMatch) {
      question = `Will ${willMatch[1]}?`;
      title = question;
    }
  }

  // Extract deadline/date if mentioned
  const dateMatch = articleText.match(
    /(?:by|on|before|until)\s+([a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|[a-z]+\s+\d{4})/i,
  );
  const deadline = dateMatch ? dateMatch[1] : null;

  // Determine event type
  let eventType = "General Event";
  if (
    articleText.includes("approval") ||
    articleText.includes("fda") ||
    articleText.includes("sec")
  ) {
    eventType = "Regulatory Decision";
  } else if (
    articleText.includes("bill") ||
    articleText.includes("legislation") ||
    articleText.includes("vote")
  ) {
    eventType = "Policy Decision";
  } else if (
    articleText.includes("launch") ||
    articleText.includes("release")
  ) {
    eventType = "Product Launch";
  } else if (
    articleText.includes("ipo") ||
    articleText.includes("merger") ||
    articleText.includes("acquisition")
  ) {
    eventType = "Financial Event";
  } else if (articleText.includes("election") || articleText.includes("vote")) {
    eventType = "Election";
  }

  const template = trendTemplates[interest] || trendTemplates["AI"];
  const timeframe =
    template.timeframes[Math.floor(Math.random() * template.timeframes.length)];

  // Calculate probability based on article signals - more conservative approach
  let probability = 35; // Lower base probability

  // More recent articles = higher probability (but more conservative)
  const recentCount = articles.filter((a) => {
    const hoursAgo =
      (Date.now() - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60);
    return hoursAgo < 48;
  }).length;
  probability += Math.min(12, recentCount * 2); // Reduced from 20 to 12

  // More articles = higher confidence (but more conservative)
  probability += Math.min(10, articles.length * 1.5); // Reduced from 15 to 10

  // Marketable events get bonus (but smaller)
  if (marketableArticles.length > 0) {
    probability += 8; // Reduced from 10 to 8
  }

  // Credible sources boost probability (but smaller)
  const credibleSources = [
    "Reuters",
    "Bloomberg",
    "Financial Times",
    "The Wall Street Journal",
    "TechCrunch",
  ];
  const credibleCount = articles.filter((a) =>
    credibleSources.some((s) => a.source.name.includes(s)),
  ).length;
  probability += Math.min(8, credibleCount * 1.5); // Reduced from 10 to 8

  // More conservative range: 20-70% instead of 30-85%
  probability = Math.min(70, Math.max(20, probability));

  // Generate timeline with deadline if available
  const baseDate = Date.now();
  const daysInTimeframe = timeframe.includes("3-6")
    ? 90
    : timeframe.includes("6-12")
      ? 180
      : timeframe.includes("12-18")
        ? 360
        : 540;

  const timeline = [
    {
      date: new Date(baseDate).toISOString(),
      label: "Event detected",
    },
  ];

  if (deadline) {
    timeline.push({
      date: new Date(deadline).toISOString(),
      label: `Expected deadline: ${deadline}`,
    });
  } else {
    timeline.push({
      date: new Date(
        baseDate + 1000 * 60 * 60 * 24 * Math.floor(daysInTimeframe / 2),
      ).toISOString(),
      label: `Mid-point (${timeframe})`,
    });
  }

  timeline.push({
    date: new Date(
      baseDate + 1000 * 60 * 60 * 24 * daysInTimeframe,
    ).toISOString(),
    label: `Outcome expected (${timeframe})`,
  });

  // Generate summary focused on marketable event
  const summary =
    marketableArticles.length > 0
      ? `${primaryArticle.title}. ${primaryArticle.description || ""} This event could become a Polymarket prediction market.`
      : `Based on ${articles.length} recent signal${articles.length > 1 ? "s" : ""} from ${articles
          .slice(0, 3)
          .map((a) => a.source.name)
          .join(
            ", ",
          )}, ${title.toLowerCase()}. Key indicators suggest ${probability}% likelihood within ${timeframe}.`;

  return {
    id: `prediction-${interest.toLowerCase()}-${index}-${Date.now()}`,
    title: question || title,
    category: interest,
    probability,
    summary,
    eventType,
    deadline,
    isMarketable: marketableArticles.length > 0,
    sources: articles.slice(0, 3).map((a) => ({
      name: `${a.source.name} — ${a.title.substring(0, 50)}...`,
      url: a.url,
      type: "news" as const,
    })),
    timeline,
    similarEvents: [], // Will be fetched dynamically in TrendDetail
  };
}

// Map categories to Polymarket search keywords
const categoryToPolymarketKeywords: Record<string, string[]> = {
  AI: ["ai", "artificial intelligence", "machine learning", "llm", "gpt"],
  Policy: ["policy", "regulation", "government", "legislation"],
  Semiconductors: [
    "semiconductor",
    "chip",
    "tsmc",
    "intel",
    "nvidia",
    "processor",
    "silicon",
  ],
  Finance: ["finance", "banking", "economics", "markets"],
  "E-commerce": ["e-commerce", "retail", "commerce", "shopping"],
  Healthcare: ["healthcare", "medical", "health", "medicine"],
  Energy: ["energy", "renewable", "solar", "wind", "oil"],
  Crypto: ["crypto", "cryptocurrency", "bitcoin", "ethereum", "blockchain"],
  Climate: ["climate", "environment", "carbon", "sustainability"],
  Gaming: [
    "gaming",
    "video game",
    "esports",
    "console",
    "playstation",
    "xbox",
    "nintendo",
    "steam",
    "twitch",
    "streaming game",
  ],
};

// Exclusion patterns - things that are NOT marketable events
const exclusionPatterns = [
  // Job postings / hiring
  /\b(hiring|hire|looking to hire|job|position|apply|resume|cv|salary|wage)\b/i,
  /\b(seeking|wanted|needed|available|open position|full time|part time)\b/i,

  // Personal requests / ads
  /\b(buy|sell|trade|for sale|wanted|looking for|need help|can someone)\b/i,
  /\b(anyone|somebody|someone|help me|please help|advice needed)\b/i,

  // Questions / help requests
  /\b(how do|how to|what is|why|when should|where can|help with|question about)\b/i,
  /\b(need advice|looking for advice|can anyone|does anyone know)\b/i,

  // General discussions (not events)
  /\b(thoughts|opinions|discussion|what do you think|what's your take)\b/i,
  /\b(just|only|simply|basically|just wondering|curious)\b/i,

  // Personal experiences / stories
  /\b(my|i|me|personally|in my opinion|i think|i feel|i believe)\b/i,

  // Non-event content
  /\b(review|tutorial|guide|tips|tricks|how to|explanation)\b/i,

  // Software packages / libraries / versions (not marketable events)
  /\b(v\d+\.\d+\.\d+|version \d+|package|library|npm|pypi|pip install|github\.com)\b/i,
  /\b(lib\w+|pkg\w+|module|dependency|install|update|upgrade)\b/i,
  /\b(\w+-\d+\.\d+\.\d+|\d+\.\d+\.\d+\.\d+)\b/i, // Version numbers like 0.0.17.1
];

// Check if a post/tweet describes a marketable event (could become Polymarket market)
function isMarketableEvent(text: string): boolean {
  const textLower = text.toLowerCase();

  // First check exclusions - if it matches exclusion patterns, it's NOT marketable
  for (const pattern of exclusionPatterns) {
    if (pattern.test(text)) {
      // But allow if it's clearly about a major event (e.g., "FDA will approve" even if it says "I think")
      const majorEventKeywords = [
        "fda",
        "sec",
        "approval",
        "regulation",
        "bill",
        "legislation",
        "election",
        "ipo",
        "merger",
      ];
      const hasMajorEvent = majorEventKeywords.some((keyword) =>
        textLower.includes(keyword),
      );
      if (!hasMajorEvent) {
        return false;
      }
    }
  }

  // Must be about an actual event/decision, not a question or discussion
  const eventIndicators = [
    // Clear event markers
    /\b(will|to|expected to|planned to|scheduled to|set to)\s+(approve|reject|pass|fail|launch|release|announce|decide)/i,
    /\b(approval|decision|vote|launch|release|announcement)\s+(by|on|before|in|this|next)/i,
    /\b(fda|sec|congress|senate|house|government|regulator)\s+(will|to|expected|planned)/i,
    /\b(bill|legislation|regulation|policy)\s+(will|to|expected|pass|fail)/i,
    /\b(ipo|merger|acquisition|earnings)\s+(expected|scheduled|planned|announced)/i,
    /\b(election|vote|referendum|ballot)\s+(on|for|in|this|next)/i,
  ];

  // Check if it matches event indicator patterns
  const hasEventIndicator = eventIndicators.some((pattern) =>
    pattern.test(text),
  );
  if (!hasEventIndicator) {
    return false;
  }

  // Must have time-bound element or decision outcome
  const timeBoundKeywords = [
    "by",
    "deadline",
    "on",
    "before",
    "until",
    "this month",
    "next month",
    "this year",
    "next year",
    "2024",
    "2025",
    "q1",
    "q2",
    "q3",
    "q4",
  ];
  const hasTimeBound = timeBoundKeywords.some((keyword) =>
    textLower.includes(keyword),
  );

  const decisionKeywords = [
    "approval",
    "rejection",
    "decision",
    "vote",
    "pass",
    "fail",
    "announce",
    "launch",
    "release",
    "approve",
    "reject",
  ];
  const hasDecision = decisionKeywords.some((keyword) =>
    textLower.includes(keyword),
  );

  // Must have both time-bound AND decision, OR be a clear regulatory/policy event
  const isRegulatoryEvent =
    /\b(fda|sec|congress|senate|house|government|regulator|bill|legislation)\b/i.test(
      text,
    );

  return (hasTimeBound && hasDecision) || isRegulatoryEvent;
}

// Extract marketable event details from text
function extractMarketableEventDetails(
  text: string,
  title: string,
): {
  question: string | null;
  deadline: string | null;
  eventType: string;
} {
  const textLower = text.toLowerCase();
  const titleLower = title.toLowerCase();
  const fullText = `${titleLower} ${textLower}`;

  // Extract question
  let question: string | null = null;
  const willMatch = title.match(/will (.+?)(?:\?|\.|$)/i);
  if (willMatch) {
    question = `Will ${willMatch[1]}?`;
  }

  // Extract deadline/date
  const dateMatch = fullText.match(
    /(?:by|on|before|until)\s+([a-z]+\s+\d{1,2},?\s+\d{4}|\d{1,2}\/\d{1,2}\/\d{4}|[a-z]+\s+\d{4}|this month|next month|this year|next year)/i,
  );
  const deadline = dateMatch ? dateMatch[1] : null;

  // Determine event type
  let eventType = "General Event";
  if (
    fullText.includes("approval") ||
    fullText.includes("fda") ||
    fullText.includes("sec")
  ) {
    eventType = "Regulatory Decision";
  } else if (
    fullText.includes("bill") ||
    fullText.includes("legislation") ||
    fullText.includes("vote")
  ) {
    eventType = "Policy Decision";
  } else if (fullText.includes("launch") || fullText.includes("release")) {
    eventType = "Product Launch";
  } else if (
    fullText.includes("ipo") ||
    fullText.includes("merger") ||
    fullText.includes("acquisition")
  ) {
    eventType = "Financial Event";
  } else if (fullText.includes("election") || fullText.includes("vote")) {
    eventType = "Election";
  }

  return { question, deadline, eventType };
}

// Fetch Reddit trends and convert to trend format - ONLY marketable events
async function fetchRedditTrends(
  interest: string,
  limit: number = 3,
): Promise<any[]> {
  try {
    const template = trendTemplates[interest];
    if (!template) return [];

    // Get subreddits for this interest
    const categorySubreddits: Record<string, string[]> = {
      AI: ["artificial", "MachineLearning", "ChatGPT", "OpenAI"],
      Policy: ["politics", "law", "government"],
      Semiconductors: ["hardware", "intel", "nvidia", "AMD"],
      Finance: ["finance", "investing", "stocks", "cryptocurrency"],
      "E-commerce": ["ecommerce", "shopify", "business"],
      Healthcare: ["healthcare", "medicine", "pharmacy"],
      Energy: [
        "energy",
        "renewable",
        "solar",
        "wind",
        "nuclear",
        "energy",
        "oil",
        "gas",
        "electricity",
        "batteries",
        "energy_storage",
      ],
      Crypto: ["cryptocurrency", "bitcoin", "ethereum"],
      Climate: ["climate", "environment", "sustainability"],
      Gaming: ["gaming", "games", "pcgaming", "xbox", "playstation"],
    };

    const subreddits = categorySubreddits[interest] || [];
    const keywords = template.keywords.slice(0, 3).join(" OR ");

    // Search in relevant subreddits - fetch more to filter for marketable events
    let apiUrl: string;
    if (subreddits.length > 0) {
      const subredditList = subreddits.slice(0, 3).join("+");
      apiUrl = `https://www.reddit.com/r/${subredditList}/search.json?q=${encodeURIComponent(keywords)}&sort=hot&limit=${limit * 10}&t=day`;
    } else {
      apiUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(keywords)}&sort=hot&limit=${limit * 10}&t=day`;
    }

    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "OrbitField/1.0",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.log(`Reddit API rate limit exceeded for ${interest}`);
        return [];
      }
      console.error(`Reddit API error for ${interest}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.data?.children || data.data.children.length === 0) {
      return [];
    }

    // Filter for marketable events only
    const marketablePosts = data.data.children
      .filter((post: any) => {
        if (!post.data.title || post.data.title.length < 10) return false;
        const text = `${post.data.title} ${post.data.selftext || ""}`;
        return isMarketableEvent(text);
      })
      .slice(0, limit);

    if (marketablePosts.length === 0) {
      console.log(`No marketable events found in Reddit for ${interest}`);
      return [];
    }

    // Convert to trend format
    return marketablePosts.map((post: any, index: number) => {
      const score = post.data.score || 0;
      const comments = post.data.num_comments || 0;
      const text = `${post.data.title} ${post.data.selftext || ""}`;

      // Extract marketable event details
      const { question, deadline, eventType } = extractMarketableEventDetails(
        text,
        post.data.title,
      );

      let probability = 30; // Lower base probability
      if (score > 1000)
        probability += 15; // Reduced from 20
      else if (score > 500)
        probability += 12; // Reduced from 15
      else if (score > 100) probability += 8; // Reduced from 10

      if (comments > 100)
        probability += 8; // Reduced from 10
      else if (comments > 50) probability += 5; // Reduced from 7

      const hoursAgo =
        (Date.now() - post.data.created_utc * 1000) / (1000 * 60 * 60);
      if (hoursAgo < 6)
        probability += 8; // Reduced from 10
      else if (hoursAgo < 24) probability += 4; // Reduced from 5

      // Bonus for marketable events (smaller)
      probability += 8; // Reduced from 10

      // More conservative range: 20-70% instead of 30-85%
      probability = Math.min(70, Math.max(20, probability));

      const title =
        question ||
        (post.data.title.length > 80
          ? `${post.data.title.substring(0, 77)}...`
          : post.data.title);

      return {
        id: `reddit-${interest.toLowerCase()}-${post.data.id}-${Date.now()}`,
        title,
        category: interest,
        probability,
        summary: `Marketable event from r/${post.data.subreddit}: ${post.data.title}${deadline ? ` (deadline: ${deadline})` : ""} (${score} upvotes, ${comments} comments)`,
        eventType,
        deadline,
        isMarketable: true,
        sources: [
          {
            name: `r/${post.data.subreddit} — Reddit`,
            url: `https://reddit.com${post.data.permalink}`,
            type: "social" as const,
          },
        ],
        timeline: [
          {
            date: new Date(post.data.created_utc * 1000).toISOString(),
            label: "Posted on Reddit",
          },
          ...(deadline
            ? [
                {
                  date: new Date(deadline).toISOString(),
                  label: `Expected deadline: ${deadline}`,
                },
              ]
            : []),
        ],
        similarEvents: [],
        isReddit: true,
        engagement: {
          upvotes: score,
          comments: comments,
        },
      };
    });
  } catch (error) {
    console.error(`Error fetching Reddit trends for ${interest}:`, error);
    return [];
  }
}

// Fetch Twitter trends and convert to trend format - ONLY marketable events
async function fetchTwitterTrends(
  interest: string,
  limit: number = 3,
): Promise<any[]> {
  if (!TWITTER_BEARER_TOKEN) {
    return [];
  }

  try {
    const template = trendTemplates[interest];
    if (!template) return [];

    // Use keywords for Twitter search - add marketable event keywords
    const keywords = template.keywords.slice(0, 5).join(" OR ");
    // Add marketable event keywords to search query
    const marketableTerms =
      "will OR approval OR decision OR launch OR release OR announcement OR deadline OR by";
    const twitterQuery = `(${keywords}) (${marketableTerms}) -is:retweet lang:en`;

    // Fetch more tweets to filter for marketable events
    const apiUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(twitterQuery)}&max_results=${limit * 10}&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      if (response.status === 429) {
        const resetTime = response.headers.get("x-rate-limit-reset");
        const remaining = response.headers.get("x-rate-limit-remaining");
        console.log(
          `Twitter API rate limit exceeded for ${interest}. Remaining: ${remaining}, Reset: ${resetTime}`,
        );
        return [];
      }
      console.error(`Twitter API error for ${interest}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (data.errors || !data.data || data.data.length === 0) {
      return [];
    }

    // Map author information
    const authorMap = new Map();
    if (data.includes?.users) {
      data.includes.users.forEach((user: any) => {
        authorMap.set(user.id, user);
      });
    }

    // Filter for marketable events only
    const tweetsWithAuthors = data.data
      .map((tweet: any) => ({
        ...tweet,
        author: authorMap.get(tweet.author_id),
      }))
      .filter((tweet: any) => {
        if (!tweet.text || tweet.text.length < 20) return false;
        return isMarketableEvent(tweet.text);
      });

    if (tweetsWithAuthors.length === 0) {
      console.log(`No marketable events found in Twitter for ${interest}`);
      return [];
    }

    // Validate relevance and limit
    const keywordsLower = template.keywords.map((k) => k.toLowerCase());
    const relevantTweets = tweetsWithAuthors
      .filter((tweet: any) => {
        const text = tweet.text.toLowerCase();
        return keywordsLower.some((keyword) => text.includes(keyword));
      })
      .slice(0, limit);

    if (relevantTweets.length === 0) {
      return [];
    }

    // Convert to trend format
    return relevantTweets.map((tweet: any, index: number) => {
      const metrics = tweet.public_metrics || {};
      const totalEngagement =
        (metrics.retweet_count || 0) + (metrics.like_count || 0);

      // Extract marketable event details
      const { question, deadline, eventType } = extractMarketableEventDetails(
        tweet.text,
        tweet.text,
      );

      let probability = 30; // Lower base probability
      if (totalEngagement > 1000)
        probability += 15; // Reduced from 20
      else if (totalEngagement > 500)
        probability += 12; // Reduced from 15
      else if (totalEngagement > 100) probability += 8; // Reduced from 10

      const hoursAgo =
        (Date.now() - new Date(tweet.created_at).getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 6)
        probability += 8; // Reduced from 10
      else if (hoursAgo < 24) probability += 4; // Reduced from 5

      // Bonus for marketable events (smaller)
      probability += 8; // Reduced from 10

      // More conservative range: 20-70% instead of 30-85%
      probability = Math.min(70, Math.max(20, probability));

      const author = tweet.author?.username || "twitter";
      const title =
        question ||
        (tweet.text.length > 80
          ? `${tweet.text.substring(0, 77)}...`
          : tweet.text);

      return {
        id: `twitter-${interest.toLowerCase()}-${tweet.id}-${Date.now()}`,
        title,
        category: interest,
        probability,
        summary: `Marketable event from @${author}: ${tweet.text}${deadline ? ` (deadline: ${deadline})` : ""}`,
        eventType,
        deadline,
        isMarketable: true,
        sources: [
          {
            name: `@${author} — Twitter`,
            url: `https://twitter.com/${author}/status/${tweet.id}`,
            type: "social" as const,
          },
        ],
        timeline: [
          {
            date: tweet.created_at,
            label: "Tweet posted",
          },
          ...(deadline
            ? [
                {
                  date: new Date(deadline).toISOString(),
                  label: `Expected deadline: ${deadline}`,
                },
              ]
            : []),
        ],
        similarEvents: [],
        isTwitter: true,
        engagement: {
          retweets: metrics.retweet_count || 0,
          likes: metrics.like_count || 0,
        },
      };
    });
  } catch (error) {
    console.error(`Error fetching Twitter trends for ${interest}:`, error);
    return [];
  }
}

// Fetch Polymarket events and convert to trends
async function fetchPolymarketTrends(
  interest: string,
  limit: number = 5,
): Promise<any[]> {
  try {
    const keywords = categoryToPolymarketKeywords[interest] || [
      interest.toLowerCase(),
    ];

    // Fetch events from Polymarket
    const response = await fetch(
      `${POLYMARKET_API_BASE}/events?closed=false&limit=50&order=id&ascending=false`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 },
      },
    );

    if (!response.ok) {
      console.error(`Polymarket API error: ${response.status}`);
      return [];
    }

    const data = await response.json();

    // Handle different response formats
    let events: any[] = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (data?.data && Array.isArray(data.data)) {
      events = data.data;
    } else if (data?.results && Array.isArray(data.results)) {
      events = data.results;
    } else if (data?.events && Array.isArray(data.events)) {
      events = data.events;
    }

    // Filter events by keywords with stricter matching
    const keywordLower = keywords.map((k) => k.toLowerCase());
    const exclusions = categoryExclusions[interest] || [];
    const exclusionLower = exclusions.map((e) => e.toLowerCase());

    const matchedEvents = events
      .filter((event) => {
        const titleLower = (event.title || "").toLowerCase();
        const descLower = (event.description || "").toLowerCase();
        const text = `${titleLower} ${descLower}`;

        // Exclude if any exclusion keyword is found
        if (exclusionLower.some((exclusion) => text.includes(exclusion))) {
          return false;
        }

        // Require at least one keyword match (using word boundaries for better matching)
        const hasMatch = keywordLower.some((keyword) => {
          // Use word boundary regex for better matching
          const regex = new RegExp(
            `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
            "i",
          );
          return regex.test(text);
        });

        return hasMatch;
      })
      .slice(0, limit);

    // If no matches found, return empty array (don't show unrelated events)
    if (matchedEvents.length === 0) {
      console.log(`No relevant Polymarket events found for ${interest}`);
      return [];
    }

    // Convert Polymarket events to Trend format
    return matchedEvents.map((event, index) => {
      // Calculate probability based on liquidity/volume if available
      // For Polymarket events, we use liquidity as a proxy for market confidence
      // Note: Polymarket API doesn't expose outcome probabilities directly,
      // so we estimate based on liquidity/volume
      let probability = 40; // Lower base probability
      if (event.liquidity) {
        // Higher liquidity = higher probability (normalize to 25-65%)
        // More conservative than before
        probability = Math.min(
          65,
          Math.max(25, 25 + (event.liquidity / 10000) * 40),
        );
      }
      if (event.volume) {
        // Higher volume = slight boost (more conservative)
        probability = Math.min(
          70,
          probability + Math.min(8, event.volume / 100000),
        );
      }

      // Ensure we stay within conservative range
      probability = Math.min(70, Math.max(20, probability));

      const baseDate = Date.now();
      const endDate = event.endDate
        ? new Date(event.endDate)
        : new Date(baseDate + 1000 * 60 * 60 * 24 * 90);
      const daysUntilEnd = Math.max(
        1,
        Math.floor((endDate.getTime() - baseDate) / (1000 * 60 * 60 * 24)),
      );

      return {
        id: `polymarket-${event.id || event.slug || index}-${Date.now()}`,
        title: event.title,
        category: interest,
        probability: Math.round(probability),
        summary:
          event.description ||
          `Active prediction market on Polymarket. ${event.liquidity ? `Liquidity: $${event.liquidity.toLocaleString()}` : ""}`,
        sources: [
          {
            name: `Polymarket — ${event.title.substring(0, 40)}...`,
            url: `https://polymarket.com/event/${event.slug || event.id}`,
            type: "research" as const,
          },
        ],
        timeline: [
          {
            date: new Date(baseDate).toISOString(),
            label: "Market active on Polymarket",
          },
          {
            date: endDate.toISOString(),
            label: `Market resolution (${daysUntilEnd} days)`,
          },
        ],
        similarEvents: [],
        isPolymarket: true, // Flag to identify Polymarket events
        polymarketUrl: `https://polymarket.com/event/${event.slug || event.id}`,
      };
    });
  } catch (error) {
    console.error(`Error fetching Polymarket events for ${interest}:`, error);
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interests =
    searchParams.get("interests")?.split(",").filter(Boolean) || [];

  if (interests.length === 0) {
    return NextResponse.json({
      trends: [],
      message: "Please select interests to generate predictions",
    });
  }

  if (!NEWS_API_KEY) {
    return NextResponse.json({
      trends: [],
      message: "NewsAPI key not configured",
    });
  }

  try {
    const allTrends: any[] = [];

    console.log(
      `Generating predictions for interests: ${interests.join(", ")}`,
    );

    // Generate predictions for each interest
    for (const interest of interests) {
      const template = trendTemplates[interest];
      if (!template) {
        console.warn(`No template found for interest: ${interest}`);
        continue;
      }

      console.log(
        `Processing interest: ${interest} with keywords: ${template.keywords.slice(0, 5).join(", ")}`,
      );

      // Fetch Polymarket events, Reddit trends, Twitter trends, and news for this interest (parallel)
      const polymarketPromise = fetchPolymarketTrends(interest, 3);
      const redditPromise = fetchRedditTrends(interest, 3); // Increased from 2 to 3
      const twitterPromise = fetchTwitterTrends(interest, 3); // Increased from 2 to 3

      // Fetch news for this interest
      // Use more keywords for better coverage - especially for Gaming and Energy
      const keywordLimit =
        interest === "Gaming" || interest === "Energy" ? 15 : 8; // Increased limits
      const keywords = template.keywords.slice(0, keywordLimit).join(" OR ");
      // Increase page size for Energy to get more articles
      const pageSize = interest === "Energy" ? 40 : 20;
      const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&sortBy=publishedAt&pageSize=${pageSize}&language=en&apiKey=${NEWS_API_KEY}`;

      console.log(
        `Fetching news for ${interest} with query: ${keywords.substring(0, 100)}...`,
      );

      try {
        const [polymarketEvents, redditTrends, twitterTrends, newsResponse] =
          await Promise.all([
            polymarketPromise,
            redditPromise,
            twitterPromise,
            fetch(apiUrl, {
              next: { revalidate: 300 },
            }),
          ]);

        // Add Polymarket events to trends (highest priority - these are actual markets)
        if (polymarketEvents.length > 0) {
          console.log(
            `Found ${polymarketEvents.length} Polymarket events for ${interest}`,
          );
          allTrends.push(...polymarketEvents);
        }

        // Add Reddit trends
        if (redditTrends.length > 0) {
          console.log(
            `Found ${redditTrends.length} Reddit trends for ${interest}`,
          );
          allTrends.push(...redditTrends);
        }

        // Add Twitter trends (if not rate-limited)
        if (twitterTrends.length > 0) {
          console.log(
            `Found ${twitterTrends.length} Twitter trends for ${interest}`,
          );
          allTrends.push(...twitterTrends);
        }

        // Check if we have social media trends
        const hasSocialTrends =
          redditTrends.length > 0 || twitterTrends.length > 0;

        if (!newsResponse.ok) {
          console.log(
            `NewsAPI response not OK for ${interest}: ${newsResponse.status}`,
          );
          continue;
        }

        const data: NewsApiResponse = await newsResponse.json();

        if (data.status === "ok" && data.articles.length > 0) {
          console.log(
            `Received ${data.articles.length} articles from NewsAPI for ${interest}`,
          );
          console.log(
            `Sample titles:`,
            data.articles.slice(0, 3).map((a) => a.title),
          );

          // If no social trends, be more lenient with news filtering
          let relevantArticles: NewsArticle[];
          if (!hasSocialTrends) {
            console.log(
              `No social trends found for ${interest}, using lenient news filtering`,
            );
            // More lenient: accept articles that mention interest keywords, even if not perfect match
            const interestKeywords = template.keywords.map((k) =>
              k.toLowerCase(),
            );
            relevantArticles = data.articles.filter((article) => {
              const text =
                `${article.title} ${article.description} ${article.content || ""}`.toLowerCase();
              return interestKeywords.some((keyword) => text.includes(keyword));
            });

            // If still too few, use all articles (but filter out completely unrelated)
            if (relevantArticles.length < 5) {
              console.log(
                `Very few relevant articles, using all articles for ${interest}`,
              );
              relevantArticles = data.articles.filter((article) => {
                const text =
                  `${article.title} ${article.description}`.toLowerCase();
                // Exclude clearly unrelated content
                const unrelatedTerms = [
                  "crypto",
                  "bitcoin",
                  "trading",
                  "price",
                ];
                return !unrelatedTerms.some(
                  (term) =>
                    text.includes(term) &&
                    interest !== "Crypto" &&
                    interest !== "Finance",
                );
              });
            }
          } else {
            // Normal validation when we have social trends
            relevantArticles = validateArticlesRelevance(
              data.articles,
              interest,
            );
          }

          console.log(
            `After validation: ${relevantArticles.length} relevant articles for ${interest}`,
          );

          if (relevantArticles.length < 1) {
            console.log(
              `No relevant articles for ${interest} after filtering. Original articles:`,
              data.articles.slice(0, 5).map((a) => a.title),
            );
            // For Gaming/Energy, be more lenient - try with less strict validation
            if (interest === "Gaming" || interest === "Energy") {
              // Try a more lenient approach
              const lenientArticles = data.articles.filter((article) => {
                const text =
                  `${article.title} ${article.description}`.toLowerCase();
                const interestTerms = template.keywords.map((k) =>
                  k.toLowerCase(),
                );
                return interestTerms.some((term) => text.includes(term));
              });

              if (lenientArticles.length > 0) {
                console.log(
                  `Using lenient validation: ${lenientArticles.length} articles for ${interest}`,
                );
                relevantArticles = lenientArticles;
              }
            } else {
              continue; // Skip if no relevant articles
            }
          }

          // Generate more predictions when we don't have social trends
          const minPredictions = !hasSocialTrends
            ? interest === "Energy" || interest === "Gaming"
              ? 8
              : 6 // More when no social trends
            : interest === "Energy"
              ? 5
              : 3; // Normal amount when we have social trends

          const articlesPerPrediction = Math.max(
            2,
            Math.floor(relevantArticles.length / minPredictions),
          );

          const numPredictions = Math.min(
            minPredictions,
            Math.ceil(relevantArticles.length / articlesPerPrediction),
          );
          console.log(
            `Generating ${numPredictions} predictions for ${interest} from ${relevantArticles.length} relevant articles (hasSocialTrends: ${hasSocialTrends})`,
          );

          for (let i = 0; i < numPredictions; i++) {
            const articleGroup = relevantArticles.slice(
              i * articlesPerPrediction,
              (i + 1) * articlesPerPrediction,
            );

            // Allow single article if that's all we have (for edge cases)
            if (articleGroup.length >= 1) {
              const trend = generatePredictiveTrend(interest, articleGroup, i);
              console.log(`Generated trend for ${interest}: ${trend.title}`);
              allTrends.push(trend);
            }
          }
        }
      } catch (error) {
        console.error(`Error fetching data for ${interest}:`, error);
        // Try to at least get Polymarket events if news fails
        try {
          const polymarketEvents = await fetchPolymarketTrends(interest, 5);
          if (polymarketEvents.length > 0) {
            allTrends.push(...polymarketEvents);
          }
        } catch (pmError) {
          console.error(`Error fetching Polymarket for ${interest}:`, pmError);
        }
      }
    }

    // Sort by marketability and probability
    allTrends.sort((a, b) => {
      // Polymarket events get highest priority (actual markets)
      if (a.isPolymarket && !b.isPolymarket) return -1;
      if (!a.isPolymarket && b.isPolymarket) return 1;

      // Marketable events (could become markets) get second priority
      if (
        a.isMarketable &&
        !b.isMarketable &&
        !a.isPolymarket &&
        !b.isPolymarket
      )
        return -1;
      if (
        !a.isMarketable &&
        b.isMarketable &&
        !a.isPolymarket &&
        !b.isPolymarket
      )
        return 1;

      // Reddit/Twitter trends get third priority (social signals)
      if (
        (a.isReddit || a.isTwitter) &&
        !(b.isReddit || b.isTwitter) &&
        !a.isPolymarket &&
        !b.isPolymarket &&
        !a.isMarketable &&
        !b.isMarketable
      )
        return -1;
      if (
        !(a.isReddit || a.isTwitter) &&
        (b.isReddit || b.isTwitter) &&
        !a.isPolymarket &&
        !b.isPolymarket &&
        !a.isMarketable &&
        !b.isMarketable
      )
        return 1;

      // Then sort by probability
      return b.probability - a.probability;
    });

    // Remove duplicate trends (same or very similar titles)
    const deduplicatedTrends: any[] = [];
    const seenTitles = new Set<string>();

    for (const trend of allTrends) {
      // Normalize title for comparison (lowercase, remove extra spaces, punctuation)
      const normalizedTitle = trend.title
        .toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim();

      // Check for exact duplicates
      if (seenTitles.has(normalizedTitle)) {
        continue; // Skip duplicate
      }

      // Check for near-duplicates (very similar titles)
      let isDuplicate = false;
      for (const seenTitle of seenTitles) {
        // Calculate similarity (simple word overlap check)
        const trendWords = new Set<string>(
          normalizedTitle.split(" ").filter((w: string) => w.length > 3),
        );
        const seenWords = new Set<string>(
          seenTitle.split(" ").filter((w: string) => w.length > 3),
        );

        // Count overlapping words
        const overlap = [...trendWords].filter((w: string) =>
          seenWords.has(w),
        ).length;
        const totalUniqueWords = new Set<string>([...trendWords, ...seenWords])
          .size;

        // If more than 70% word overlap, consider it a duplicate
        if (totalUniqueWords > 0 && overlap / totalUniqueWords > 0.7) {
          isDuplicate = true;
          break;
        }

        // Also check if one title is contained in the other (for very similar titles)
        if (
          normalizedTitle.includes(seenTitle) ||
          seenTitle.includes(normalizedTitle)
        ) {
          if (Math.abs(normalizedTitle.length - seenTitle.length) < 10) {
            isDuplicate = true;
            break;
          }
        }
      }

      if (!isDuplicate) {
        seenTitles.add(normalizedTitle);
        deduplicatedTrends.push(trend);
      }
    }

    console.log(
      `Total trends generated: ${allTrends.length}, after deduplication: ${deduplicatedTrends.length} for interests: ${interests.join(", ")}`,
    );

    const result = {
      trends: deduplicatedTrends.slice(0, 20), // Increased limit to include Polymarket events
      total: deduplicatedTrends.length,
      interests: interests,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error generating predictions:", error);
    return NextResponse.json(
      {
        trends: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate predictions",
      },
      { status: 500 },
    );
  }
}
