import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Polymarket Gamma API integration
const POLYMARKET_API_BASE = "https://gamma-api.polymarket.com";
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface PolymarketEvent {
  id: string;
  slug: string;
  title: string;
  description?: string;
  image?: string;
  tags?: Array<{ id: string; name: string }>;
  endDate?: string;
  liquidity?: number;
  volume?: number;
  url?: string;
}

interface PolymarketResponse {
  data?: PolymarketEvent[];
  error?: string;
}

// Map our categories to Polymarket tags/keywords
const categoryToPolymarketTags: Record<string, string[]> = {
  AI: ["ai", "artificial-intelligence", "technology", "tech"],
  Policy: ["politics", "policy", "regulation", "government"],
  Semiconductors: ["technology", "semiconductors", "chips", "tech"],
  Finance: ["finance", "crypto", "economics", "markets"],
  "E-commerce": ["business", "commerce", "retail"],
  Healthcare: ["health", "healthcare", "medicine", "medical"],
  Energy: ["energy", "oil", "renewable", "climate"],
  Crypto: ["crypto", "cryptocurrency", "bitcoin", "blockchain"],
  Climate: ["climate", "environment", "sustainability"],
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
  ],
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
  Finance: [],
  Crypto: [],
  Healthcare: ["crypto", "bitcoin", "trading", "price"],
  Energy: ["crypto", "bitcoin", "trading", "price"],
  Climate: ["crypto", "bitcoin", "trading", "price"],
  "E-commerce": ["crypto", "bitcoin", "trading", "price"],
};

// Expand keywords with synonyms and related terms
function expandKeywordsWithSynonyms(
  keywords: string[],
  category?: string,
): string[] {
  const expanded: string[] = [...keywords];

  // Sports-related synonyms and expansions
  const sportsExpansions: Record<string, string[]> = {
    quarterfinals: [
      "playoffs",
      "tournament",
      "championship",
      "bracket",
      "knockout",
      "elimination",
    ],
    quarterfinal: [
      "playoffs",
      "tournament",
      "championship",
      "bracket",
      "knockout",
      "elimination",
    ],
    semifinals: [
      "playoffs",
      "tournament",
      "championship",
      "bracket",
      "final four",
    ],
    semifinal: [
      "playoffs",
      "tournament",
      "championship",
      "bracket",
      "final four",
    ],
    finals: ["championship", "tournament", "playoffs", "title game"],
    final: ["championship", "tournament", "playoffs", "title game"],
    victory: ["win", "triumph", "success", "championship"],
    victories: ["wins", "triumphs", "successes"],
    leads: ["wins", "beats", "defeats", "victory"],
    ssaa: [
      "high school",
      "high school sports",
      "prep sports",
      "scholastic sports",
      "athletics",
    ],
    mdca: ["high school", "school", "academy"],
    foundation: ["school", "academy", "prep"],
    nhl: ["hockey", "ice hockey", "professional hockey", "stanley cup"],
    nba: [
      "basketball",
      "professional basketball",
      "nba playoffs",
      "nba finals",
      "playoffs",
    ],
    nfl: [
      "football",
      "american football",
      "professional football",
      "super bowl",
      "nfl playoffs",
    ],
    mlb: ["baseball", "professional baseball", "world series", "mlb playoffs"],
    rangers: ["hockey", "nhl", "new york"],
    yankees: ["baseball", "mlb", "new york"],
    knicks: ["basketball", "nba", "new york"],
    // Basketball expansions
    basketball: [
      "nba",
      "college basketball",
      "ncaa basketball",
      "march madness",
      "ncaa tournament",
      "final four",
    ],
    // Football expansions
    football: [
      "nfl",
      "american football",
      "super bowl",
      "college football",
      "ncaa football",
      "cfp",
      "college football playoff",
    ],
    // Baseball expansions
    baseball: [
      "mlb",
      "world series",
      "college baseball",
      "ncaa baseball",
      "college world series",
    ],
    // Hockey expansions
    hockey: [
      "nhl",
      "ice hockey",
      "stanley cup",
      "college hockey",
      "ncaa hockey",
    ],
    // Tennis expansions
    tennis: [
      "wimbledon",
      "us open",
      "french open",
      "australian open",
      "atp",
      "wta",
      "grand slam",
    ],
    // Golf expansions
    golf: ["pga", "masters", "us open", "british open", "pga tour", "liv golf"],
    freshmen: ["freshman", "first year", "rookie", "debut"],
    freshman: ["freshmen", "first year", "rookie", "debut"],
    debut: ["first game", "first appearance", "rookie", "debut season"],
    rolls: ["wins", "victory", "defeats", "beats"],
    wood: ["player", "athlete"],
    sam: ["player", "athlete"],
    // Soccer-specific expansions
    soccer: [
      "football",
      "futbol",
      "mls",
      "premier league",
      "champions league",
      "world cup",
      "euro",
      "college soccer",
      "ncaa soccer",
    ],
    "men's soccer": ["soccer", "football", "mls", "college soccer", "ncaa"],
    "women's soccer": ["soccer", "football", "nwsl", "college soccer", "ncaa"],
    maryland: ["terrapins", "terps", "college", "university"],
    "big ten": ["big ten conference", "b1g", "college", "ncaa", "conference"],
    "michigan state": ["spartans", "msu", "college", "university"],
    outlast: ["beats", "defeats", "wins", "victory"],
  };

  // Gaming/esports expansions
  const gamingExpansions: Record<string, string[]> = {
    "counter-strike": ["csgo", "cs", "counterstrike", "fps", "esports"],
    csgo: ["counter-strike", "cs", "counterstrike", "fps", "esports"],
    valorant: ["riot games", "fps", "esports", "tactical shooter"],
    "league of legends": ["lol", "moba", "riot games", "esports"],
    dota: ["dota 2", "moba", "esports", "valve"],
  };

  // General expansions
  const generalExpansions: Record<string, string[]> = {
    championship: ["title", "trophy", "cup", "crown"],
    tournament: ["competition", "championship", "bracket", "playoffs"],
    playoffs: ["postseason", "tournament", "championship", "bracket"],
  };

  // Combine all expansions
  const allExpansions = { ...sportsExpansions, ...generalExpansions };
  if (category === "Gaming") {
    Object.assign(allExpansions, gamingExpansions);
  }

  // Expand each keyword
  keywords.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase();

    // Check for exact matches
    if (allExpansions[keywordLower]) {
      expanded.push(...allExpansions[keywordLower]);
    }

    // Check for partial matches
    Object.entries(allExpansions).forEach(([key, synonyms]) => {
      if (keywordLower.includes(key) || key.includes(keywordLower)) {
        expanded.push(...synonyms);
      }
    });
  });

  // Remove duplicates
  return Array.from(new Set(expanded));
}

// Detect category/subcategory type from keywords (sports, AI, semiconductors, etc.)
function detectCategoryType(
  keywords: string[],
  category?: string,
): string | null {
  const keywordLower = keywords.map((k) => k.toLowerCase()).join(" ");

  // First check for sports (if Gaming category)
  const sportKeywords: Record<string, string[]> = {
    soccer: [
      "soccer",
      "football",
      "futbol",
      "mls",
      "premier league",
      "champions league",
      "world cup",
      "men's soccer",
      "women's soccer",
      "college soccer",
      "ncaa soccer",
    ],
    basketball: [
      "basketball",
      "nba",
      "college basketball",
      "ncaa basketball",
      "march madness",
      "ncaa tournament",
      "final four",
      "nba playoffs",
      "nba finals",
    ],
    football: [
      "nfl",
      "american football",
      "football",
      "super bowl",
      "college football",
      "ncaa football",
      "cfp",
      "college football playoff",
      "nfl playoffs",
    ],
    baseball: [
      "baseball",
      "mlb",
      "world series",
      "college baseball",
      "ncaa baseball",
      "college world series",
      "mlb playoffs",
    ],
    hockey: [
      "hockey",
      "nhl",
      "ice hockey",
      "stanley cup",
      "college hockey",
      "ncaa hockey",
    ],
    tennis: [
      "tennis",
      "wimbledon",
      "us open",
      "french open",
      "australian open",
      "atp",
      "wta",
      "grand slam",
    ],
    golf: [
      "golf",
      "pga",
      "masters",
      "us open",
      "british open",
      "pga tour",
      "liv golf",
    ],
  };

  // Check for sports first (if Gaming category)
  if (category === "Gaming") {
    for (const [sport, terms] of Object.entries(sportKeywords)) {
      if (terms.some((term) => keywordLower.includes(term))) {
        return `sport:${sport}`;
      }
    }
  }

  // Check for other category-specific keywords
  const categoryKeywords: Record<string, string[]> = {
    ai: [
      "ai",
      "artificial intelligence",
      "machine learning",
      "ml",
      "llm",
      "gpt",
      "chatgpt",
      "openai",
      "anthropic",
      "claude",
      "deepmind",
      "neural network",
      "deep learning",
      "generative ai",
      "agi",
      "transformer",
      "language model",
    ],
    semiconductors: [
      "semiconductor",
      "chip",
      "gpu",
      "cpu",
      "nvidia",
      "intel",
      "amd",
      "tsmc",
      "samsung",
      "qualcomm",
      "broadcom",
      "micron",
      "blackwell",
      "hopper",
      "h100",
      "a100",
      "silicon",
      "wafer",
      "foundry",
    ],
    finance: [
      "finance",
      "banking",
      "fed",
      "federal reserve",
      "interest rate",
      "inflation",
      "stock",
      "nasdaq",
      "sp500",
      "dow jones",
      "s&p 500",
      "market",
      "trading",
      "economy",
      "recession",
      "gdp",
      "unemployment",
    ],
    healthcare: [
      "health",
      "healthcare",
      "medicine",
      "medical",
      "fda",
      "drug",
      "pharmaceutical",
      "treatment",
      "therapy",
      "vaccine",
      "clinical trial",
      "approval",
      "biotech",
      "hospital",
      "patient",
      "diagnosis",
    ],
    energy: [
      "energy",
      "oil",
      "gas",
      "renewable",
      "solar",
      "wind",
      "nuclear",
      "battery",
      "tesla",
      "electric",
      "ev",
      "crude",
      "petroleum",
      "fossil fuel",
      "green energy",
      "power plant",
      "grid",
    ],
    climate: [
      "climate",
      "environment",
      "sustainability",
      "carbon",
      "emissions",
      "global warming",
      "greenhouse",
      "renewable",
      "solar",
      "wind",
      "clean energy",
      "pollution",
      "epa",
      "environmental",
      "conservation",
    ],
    "e-commerce": [
      "e-commerce",
      "commerce",
      "retail",
      "amazon",
      "shopify",
      "online shopping",
      "marketplace",
      "sales",
      "revenue",
      "consumer",
      "shopping",
      "delivery",
    ],
    policy: [
      "policy",
      "politics",
      "regulation",
      "government",
      "congress",
      "senate",
      "house",
      "bill",
      "legislation",
      "law",
      "vote",
      "election",
      "president",
      "senator",
      "representative",
      "federal",
      "state",
    ],
    crypto: [
      "crypto",
      "cryptocurrency",
      "bitcoin",
      "ethereum",
      "blockchain",
      "btc",
      "eth",
      "defi",
      "nft",
      "solana",
      "trading",
      "exchange",
      "wallet",
    ],
  };

  // Check for category-specific keywords
  for (const [cat, terms] of Object.entries(categoryKeywords)) {
    if (terms.some((term) => keywordLower.includes(term))) {
      return `category:${cat}`;
    }
  }

  // If category is provided, use it as fallback
  if (category) {
    return `category:${category.toLowerCase()}`;
  }

  return null;
}

// Separate trend-specific keywords from category keywords
function separateKeywords(
  keywords: string[],
  category?: string,
): {
  trendKeywords: string[];
  categoryKeywords: string[];
} {
  const categoryTags = category ? categoryToPolymarketTags[category] || [] : [];
  const categoryLower = categoryTags.map((t) => t.toLowerCase());

  const trendKeywords: string[] = [];
  const categoryKeywords: string[] = [];

  keywords.forEach((keyword) => {
    const keywordLower = keyword.toLowerCase();
    // If keyword matches a category tag, it's a category keyword
    if (
      categoryLower.some(
        (tag) => keywordLower.includes(tag) || tag.includes(keywordLower),
      )
    ) {
      categoryKeywords.push(keyword);
    } else {
      // Otherwise it's trend-specific
      trendKeywords.push(keyword);
    }
  });

  return { trendKeywords, categoryKeywords };
}

// Search Polymarket events by keywords
async function searchPolymarketEvents(
  keywords: string[],
  limit: number = 5,
  category?: string,
  originalTitle?: string,
): Promise<PolymarketEvent[]> {
  try {
    // Try to fetch events and filter by keywords in title/description
    // Fetch more events to have better pool for keyword matching
    // Increased limit for better matching
    const response = await fetch(
      `${POLYMARKET_API_BASE}/events?closed=false&limit=200&order=id&ascending=false`,
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      },
    );

    if (!response.ok) {
      console.error(
        `Polymarket API error: ${response.status} ${response.statusText}`,
      );
      return [];
    }

    const data = await response.json();

    // Handle different response formats
    let events: PolymarketEvent[] = [];
    if (Array.isArray(data)) {
      events = data;
    } else if (data?.data && Array.isArray(data.data)) {
      events = data.data;
    } else if (data?.results && Array.isArray(data.results)) {
      events = data.results;
    } else if (data?.events && Array.isArray(data.events)) {
      events = data.events;
    }

    console.log(`Fetched ${events.length} events from Polymarket API`);

    if (events.length === 0) {
      console.warn("Polymarket API returned no events");
      return [];
    }

    // Expand keywords with synonyms and related terms
    const expandedKeywords = expandKeywordsWithSynonyms(keywords, category);
    console.log(
      `Expanded keywords (${expandedKeywords.length} total): ${expandedKeywords.slice(0, 15).join(", ")}`,
    );

    // Separate trend-specific keywords from category keywords (using expanded keywords)
    const { trendKeywords, categoryKeywords: catKeywords } = separateKeywords(
      expandedKeywords,
      category,
    );
    const trendKeywordLower = trendKeywords.map((k) => k.toLowerCase());
    const categoryKeywordLower = catKeywords.map((k) => k.toLowerCase());
    const allKeywordLower = keywords.map((k) => k.toLowerCase());

    const exclusions = categoryExclusions[category || ""] || [];
    const exclusionLower = exclusions.map((e) => e.toLowerCase());

    // Score and filter events
    const scoredEvents = events
      .map((event) => {
        const titleLower = (event.title || "").toLowerCase();
        const descLower = (event.description || "").toLowerCase();
        const tagsLower = (event.tags || [])
          .map((t) => (typeof t === "string" ? t : t.name || "").toLowerCase())
          .join(" ");
        const text = `${titleLower} ${descLower} ${tagsLower}`;

        // Exclude if any exclusion keyword is found
        if (
          exclusionLower.some((exclusion) => {
            // For Gaming, be lenient with "trading"
            if (category === "Gaming" && exclusion === "trading") {
              return text.includes("crypto") && text.includes("trading");
            }
            return text.includes(exclusion);
          })
        ) {
          return null;
        }

        // Score based on keyword matches - prioritize trend-specific keywords heavily
        let score = 0;
        let trendMatchCount = 0;
        let categoryMatchCount = 0;
        const matchedKeywords: string[] = [];

        // CRITICAL: If we have trend-specific keywords, require at least one match
        // Otherwise we might match on generic category keywords (e.g., "gaming" matching Counter-Strike)
        let hasTrendMatch = false;

        // First, check trend-specific keywords (much higher priority)
        const sortedTrendKeywords = [...trendKeywordLower].sort((a, b) => {
          const aWords = a.split(" ").length;
          const bWords = b.split(" ").length;
          if (aWords !== bWords) return bWords - aWords;
          return b.length - a.length;
        });

        sortedTrendKeywords.forEach((keyword) => {
          let matched = false;
          if (keyword.includes(" ")) {
            const wordCount = keyword.split(" ").length;
            if (text.includes(keyword)) {
              // Trend-specific matches get MUCH higher scores
              if (wordCount >= 4) {
                score += 20; // Very high for 4+ word trend phrases
              } else if (wordCount === 3) {
                score += 15; // High for trigrams
              } else {
                score += 10; // High for bigrams
              }
              trendMatchCount++;
              matchedKeywords.push(keyword);
              matched = true;
              hasTrendMatch = true;
            } else {
              // Partial phrase match
              const keywordWords = keyword.split(" ");
              const allWordsPresent = keywordWords.every((word) => {
                const wordRegex = new RegExp(
                  `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                  "i",
                );
                return wordRegex.test(text);
              });
              if (allWordsPresent && keywordWords.length >= 2) {
                score += wordCount === 3 ? 8 : 5; // Still high for partial trend matches
                trendMatchCount++;
                matchedKeywords.push(keyword);
                matched = true;
                hasTrendMatch = true;
              }
            }
          } else {
            // Try exact word boundary match first
            const regex = new RegExp(
              `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
              "i",
            );
            if (regex.test(text)) {
              score += 5; // High score for trend-specific single words
              trendMatchCount++;
              matchedKeywords.push(keyword);
              matched = true;
              hasTrendMatch = true;
            } else {
              // Fallback: try partial match (keyword appears anywhere in text)
              // This helps match variations like "soccer" matching "soccerball" or compound words
              if (text.includes(keyword)) {
                score += 2; // Lower score for partial match, but still count it
                trendMatchCount++;
                matchedKeywords.push(keyword);
                matched = true;
                hasTrendMatch = true;
              }
            }
          }

          // Extra bonus for trend keywords in title
          if (matched && titleLower.includes(keyword)) {
            score += keyword.includes(" ") ? 5 : 3;
          }
        });

        // Then check category keywords (lower priority, only if no trend matches)
        const sortedCategoryKeywords = [...categoryKeywordLower].sort(
          (a, b) => {
            const aWords = a.split(" ").length;
            const bWords = b.split(" ").length;
            if (aWords !== bWords) return bWords - aWords;
            return b.length - a.length;
          },
        );

        sortedCategoryKeywords.forEach((keyword) => {
          if (keyword.includes(" ")) {
            const wordCount = keyword.split(" ").length;
            if (text.includes(keyword)) {
              // Category matches get lower scores
              score += wordCount === 3 ? 2 : 1;
              categoryMatchCount++;
              matchedKeywords.push(keyword);
            }
          } else {
            const regex = new RegExp(
              `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
              "i",
            );
            if (regex.test(text)) {
              score += 0.5; // Very low score for category single words
              categoryMatchCount++;
              matchedKeywords.push(keyword);
            }
          }
        });

        // CRITICAL RULE: If we have trend-specific keywords but no trend match,
        // and only category matches, exclude this event (it's not relevant)
        // BUT: If we have very few trend keywords (less than 3), be more lenient
        // This allows category matches when trend keywords are sparse
        if (
          trendKeywordLower.length > 0 &&
          !hasTrendMatch &&
          categoryMatchCount > 0 &&
          trendKeywordLower.length >= 3 // Only exclude if we have enough trend keywords to be confident
        ) {
          return null; // Don't show events that only match on category, not the actual trend
        }

        // For Gaming category: Filter out esports if trend is about sports, and vice versa
        if (category === "Gaming") {
          const sportsKeywords = [
            "nhl",
            "nba",
            "nfl",
            "mlb",
            "hockey",
            "basketball",
            "football",
            "baseball",
            "soccer",
            "tennis",
            "golf",
            "rangers",
            "yankees",
            "knicks",
          ];
          const esportsKeywords = [
            "counter-strike",
            "csgo",
            "valorant",
            "league of legends",
            "dota",
            "overwatch",
            "esports",
          ];

          const trendIsSports = trendKeywordLower.some((k) =>
            sportsKeywords.some((sk) => k.includes(sk) || sk.includes(k)),
          );
          const trendIsEsports = trendKeywordLower.some((k) =>
            esportsKeywords.some((ek) => k.includes(ek) || ek.includes(k)),
          );

          const eventIsSports = sportsKeywords.some((sk) => text.includes(sk));
          const eventIsEsports = esportsKeywords.some((ek) =>
            text.includes(ek),
          );

          // If trend is about sports but event is esports (or vice versa), exclude it
          if (trendIsSports && eventIsEsports) {
            return null; // Don't show esports events for sports trends
          }
          if (trendIsEsports && eventIsSports) {
            return null; // Don't show sports events for esports trends
          }
        }

        const matchCount = trendMatchCount + categoryMatchCount;

        // Extra bonus for matching multiple trend keywords (very specific to this trend)
        if (trendMatchCount >= 3) {
          score += 10; // Many trend keyword matches = very relevant
        } else if (trendMatchCount >= 2) {
          score += 5; // Multiple trend keyword matches = relevant
        } else if (trendMatchCount >= 1 && matchCount >= 3) {
          score += 3; // One trend match + other matches
        }

        // Bonus for high liquidity/volume (more active/popular markets)
        if (event.liquidity && event.liquidity > 10000) {
          score += 2; // High liquidity = popular market (reduced to not override relevance)
        }
        if (event.volume && event.volume > 50000) {
          score += 1; // High volume = active market (reduced)
        }

        // Require at least one match
        if (matchCount === 0) {
          return null;
        }

        // If we have trend keywords, prioritize events with trend matches
        // Even if category-only matches exist, trend matches should rank higher
        if (
          trendKeywordLower.length > 0 &&
          trendMatchCount === 0 &&
          categoryMatchCount > 0
        ) {
          // Already filtered out above, but keep this as safety check
          return null;
        }

        return { event, score, matchCount };
      })
      .filter(
        (
          item,
        ): item is {
          event: PolymarketEvent;
          score: number;
          matchCount: number;
        } => item !== null,
      )
      .sort((a, b) => {
        // Sort by score (highest first), then by match count, then by liquidity
        if (b.score !== a.score) return b.score - a.score;
        if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
        // If scores are equal, prioritize events with higher liquidity
        const aLiquidity = a.event.liquidity || 0;
        const bLiquidity = b.event.liquidity || 0;
        return bLiquidity - aLiquidity;
      })
      .slice(0, limit)
      .map((item) => item.event);

    // If no matches found, try fallback: only if we have trend keywords, try more lenient matching
    if (scoredEvents.length === 0) {
      console.log(
        `No exact matches found with keywords: ${keywords.slice(0, 5).join(", ")}`,
      );

      // CRITICAL: If we have trend-specific keywords, don't fall back to category-only matches
      // This prevents Counter-Strike from matching NHL trends
      if (trendKeywordLower.length > 0) {
        console.log(
          `Has trend-specific keywords but no matches. Trying lenient trend matching...`,
        );

        // Fallback: Try more lenient matching on trend keywords (partial word matches, etc.)
        const lenientEvents = events
          .map((event) => {
            const titleLower = (event.title || "").toLowerCase();
            const descLower = (event.description || "").toLowerCase();
            const text = `${titleLower} ${descLower}`;

            // Exclude if any exclusion keyword is found
            const exclusions = categoryExclusions[category || ""] || [];
            const exclusionLower = exclusions.map((e) => e.toLowerCase());
            if (
              exclusionLower.some((exclusion) => {
                if (category === "Gaming" && exclusion === "trading") {
                  return text.includes("crypto") && text.includes("trading");
                }
                return text.includes(exclusion);
              })
            ) {
              return null;
            }

            // For Gaming: Apply sports vs esports filtering
            if (category === "Gaming") {
              const sportsKeywords = [
                "nhl",
                "nba",
                "nfl",
                "mlb",
                "hockey",
                "basketball",
                "football",
                "baseball",
                "soccer",
                "tennis",
                "golf",
                "rangers",
                "yankees",
                "knicks",
              ];
              const esportsKeywords = [
                "counter-strike",
                "csgo",
                "valorant",
                "league of legends",
                "dota",
                "overwatch",
                "esports",
              ];

              const trendIsSports = trendKeywordLower.some((k) =>
                sportsKeywords.some((sk) => k.includes(sk) || sk.includes(k)),
              );
              const trendIsEsports = trendKeywordLower.some((k) =>
                esportsKeywords.some((ek) => k.includes(ek) || ek.includes(k)),
              );

              const eventIsSports = sportsKeywords.some((sk) =>
                text.includes(sk),
              );
              const eventIsEsports = esportsKeywords.some((ek) =>
                text.includes(ek),
              );

              if (trendIsSports && eventIsEsports) {
                return null; // Don't show esports for sports trends
              }
              if (trendIsEsports && eventIsSports) {
                return null; // Don't show sports for esports trends
              }
            }

            // Check for ANY trend keyword match (even partial) - VERY lenient
            let matchCount = 0;
            for (const keyword of trendKeywordLower) {
              // Try exact phrase match first
              if (text.includes(keyword)) {
                matchCount++;
                break;
              }

              // Try partial match (keyword contains event text or vice versa)
              const keywordWords = keyword.split(" ");
              if (keywordWords.length > 1) {
                // For multi-word keywords, check if words appear (more lenient)
                const wordsFound = keywordWords.filter((word) => {
                  // Try word boundary match first
                  const wordRegex = new RegExp(
                    `\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                    "i",
                  );
                  if (wordRegex.test(text)) return true;
                  // Fallback: partial match (word appears anywhere)
                  return text.includes(word);
                });

                // If at least 2/3 of words match (or all words for 2-word phrases), consider it a match
                const matchThreshold =
                  keywordWords.length === 2
                    ? 2
                    : Math.ceil(keywordWords.length * 0.67);
                if (wordsFound.length >= matchThreshold) {
                  matchCount++;
                  break;
                }
              } else {
                // Single word - try word boundary match first
                const regex = new RegExp(
                  `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                  "i",
                );
                if (regex.test(text)) {
                  matchCount++;
                  break;
                }
                // Fallback: partial match (keyword appears anywhere in text)
                // This helps match variations and compound words
                if (text.includes(keyword)) {
                  matchCount++;
                  break;
                }
              }
            }

            if (matchCount === 0) {
              return null; // No trend keyword match
            }

            return { event, matchCount };
          })
          .filter(
            (item): item is { event: PolymarketEvent; matchCount: number } =>
              item !== null,
          )
          .sort((a, b) => {
            // Sort by liquidity (highest first)
            const aLiquidity = a.event.liquidity || 0;
            const bLiquidity = b.event.liquidity || 0;
            return bLiquidity - aLiquidity;
          })
          .slice(0, limit)
          .map((item) => item.event);

        if (lenientEvents.length > 0) {
          console.log(`Found ${lenientEvents.length} lenient trend matches`);
          return lenientEvents.map((event) => ({
            ...event,
            url: `https://polymarket.com/event/${event.slug || event.id}`,
          }));
        }

        // If still no matches with trend keywords, try category/sport-based matching
        // Always try this fallback, even if we have trend keywords
        const detectedType =
          detectCategoryType(expandedKeywords, category) ||
          (category ? `category:${category.toLowerCase()}` : null);
        if (detectedType) {
          const [type, value] = detectedType.split(":");
          console.log(
            `Detected ${type}: ${value}. Searching for ${value}-related events...`,
          );

          // Build search keywords based on detected type
          let searchTerms: string[] = [];

          if (type === "sport") {
            // Sport-specific keywords
            const sportKeywords: Record<string, string[]> = {
              soccer: [
                "soccer",
                "football",
                "futbol",
                "mls",
                "premier league",
                "champions league",
                "world cup",
                "euro",
                "college soccer",
                "ncaa soccer",
              ],
              basketball: [
                "basketball",
                "nba",
                "college basketball",
                "ncaa basketball",
                "march madness",
                "ncaa tournament",
                "final four",
                "nba playoffs",
                "nba finals",
              ],
              football: [
                "nfl",
                "american football",
                "football",
                "super bowl",
                "college football",
                "ncaa football",
                "cfp",
                "college football playoff",
                "nfl playoffs",
              ],
              baseball: [
                "baseball",
                "mlb",
                "world series",
                "college baseball",
                "ncaa baseball",
                "college world series",
                "mlb playoffs",
              ],
              hockey: [
                "hockey",
                "nhl",
                "ice hockey",
                "stanley cup",
                "college hockey",
                "ncaa hockey",
              ],
              tennis: [
                "tennis",
                "wimbledon",
                "us open",
                "french open",
                "australian open",
                "atp",
                "wta",
                "grand slam",
              ],
              golf: [
                "golf",
                "pga",
                "masters",
                "us open",
                "british open",
                "pga tour",
                "liv golf",
              ],
            };
            searchTerms = sportKeywords[value] || [];
          } else if (type === "category") {
            // Category-specific keywords
            const categorySearchKeywords: Record<string, string[]> = {
              ai: [
                "ai",
                "artificial intelligence",
                "machine learning",
                "llm",
                "gpt",
                "chatgpt",
                "openai",
                "anthropic",
                "claude",
                "deepmind",
                "neural network",
                "generative ai",
              ],
              semiconductors: [
                "semiconductor",
                "chip",
                "gpu",
                "cpu",
                "nvidia",
                "intel",
                "amd",
                "tsmc",
                "samsung",
                "qualcomm",
                "broadcom",
                "micron",
                "blackwell",
                "hopper",
              ],
              finance: [
                "finance",
                "banking",
                "fed",
                "federal reserve",
                "interest rate",
                "inflation",
                "stock",
                "nasdaq",
                "sp500",
                "dow jones",
                "market",
                "economy",
              ],
              healthcare: [
                "health",
                "healthcare",
                "medicine",
                "medical",
                "fda",
                "drug",
                "pharmaceutical",
                "treatment",
                "therapy",
                "vaccine",
                "clinical trial",
                "biotech",
              ],
              energy: [
                "energy",
                "oil",
                "gas",
                "renewable",
                "solar",
                "wind",
                "nuclear",
                "battery",
                "tesla",
                "electric",
                "ev",
                "crude",
                "petroleum",
              ],
              climate: [
                "climate",
                "environment",
                "sustainability",
                "carbon",
                "emissions",
                "global warming",
                "renewable",
                "solar",
                "wind",
                "clean energy",
                "pollution",
              ],
              "e-commerce": [
                "e-commerce",
                "commerce",
                "retail",
                "amazon",
                "shopify",
                "online shopping",
                "marketplace",
                "sales",
                "consumer",
              ],
              policy: [
                "policy",
                "politics",
                "regulation",
                "government",
                "congress",
                "senate",
                "house",
                "bill",
                "legislation",
                "law",
                "vote",
                "election",
              ],
              crypto: [
                "crypto",
                "cryptocurrency",
                "bitcoin",
                "ethereum",
                "blockchain",
                "btc",
                "eth",
                "defi",
                "nft",
                "solana",
              ],
              gaming: [
                "gaming",
                "video game",
                "esports",
                "console",
                "playstation",
                "xbox",
                "nintendo",
              ],
            };
            searchTerms =
              categorySearchKeywords[value] ||
              categoryToPolymarketTags[category || ""] ||
              [];
          }

          if (searchTerms.length > 0) {
            const categoryEvents = events
              .filter((event) => {
                const titleLower = (event.title || "").toLowerCase();
                const descLower = (event.description || "").toLowerCase();
                const tagsLower = (event.tags || [])
                  .map((t) =>
                    (typeof t === "string" ? t : t.name || "").toLowerCase(),
                  )
                  .join(" ");
                const text = `${titleLower} ${descLower} ${tagsLower}`;

                // Exclude if any exclusion keyword is found
                const exclusions = categoryExclusions[category || ""] || [];
                const exclusionLower = exclusions.map((e) => e.toLowerCase());
                if (
                  exclusionLower.some((exclusion) => text.includes(exclusion))
                ) {
                  return false;
                }

                // For Gaming: Don't show esports for sports trends
                if (category === "Gaming" && type === "sport") {
                  const esportsKeywords = [
                    "counter-strike",
                    "csgo",
                    "valorant",
                    "league of legends",
                    "dota",
                    "overwatch",
                    "esports",
                  ];
                  if (esportsKeywords.some((ek) => text.includes(ek))) {
                    return false;
                  }
                }

                // Check if event matches search terms (lenient matching)
                return searchTerms.some((term) => {
                  // Try exact match first
                  if (text.includes(term)) return true;

                  // For multi-word terms, check if individual words appear
                  if (term.includes(" ")) {
                    const termWords = term.split(" ");
                    // If at least 2/3 of words match, consider it a match
                    const matchThreshold =
                      termWords.length === 2
                        ? 2
                        : Math.ceil(termWords.length * 0.67);
                    const wordsFound = termWords.filter((word) =>
                      text.includes(word),
                    );
                    return wordsFound.length >= matchThreshold;
                  }

                  return false;
                });
              })
              .sort((a, b) => {
                // Sort by liquidity (highest first)
                const aLiquidity = a.liquidity || 0;
                const bLiquidity = b.liquidity || 0;
                return bLiquidity - aLiquidity;
              })
              .slice(0, limit);

            if (categoryEvents.length > 0) {
              console.log(
                `Found ${categoryEvents.length} ${value}-related events`,
              );
              return categoryEvents.map((event) => ({
                ...event,
                url: `https://polymarket.com/event/${event.slug || event.id}`,
              }));
            }
          }
        }

        // If still no matches, return empty (don't show unrelated category matches)
        console.log(
          `No matches found even with lenient trend matching and category-based search. Returning empty to avoid irrelevant results.`,
        );
        return [];
      }

      // Only if we have NO trend keywords, fall back to category matches
      // But still apply sports vs esports filtering for Gaming
      if (category) {
        console.log(`No trend keywords, trying category-based fallback`);
        const categoryTags = categoryToPolymarketTags[category] || [
          category.toLowerCase(),
        ];
        const categoryKeywordLower = categoryTags.map((k) => k.toLowerCase());

        const fallbackEvents = events
          .filter((event) => {
            const titleLower = (event.title || "").toLowerCase();
            const descLower = (event.description || "").toLowerCase();
            const text = `${titleLower} ${descLower}`;

            // Exclude if any exclusion keyword is found
            const exclusions = categoryExclusions[category] || [];
            const exclusionLower = exclusions.map((e) => e.toLowerCase());
            if (exclusionLower.some((exclusion) => text.includes(exclusion))) {
              return false;
            }

            // For Gaming: Don't show esports if original title suggests sports
            if (category === "Gaming" && originalTitle) {
              const titleLower = originalTitle.toLowerCase();
              const sportsKeywords = [
                "nhl",
                "nba",
                "nfl",
                "mlb",
                "hockey",
                "basketball",
                "football",
                "baseball",
                "soccer",
                "tennis",
                "golf",
                "rangers",
              ];
              const esportsKeywords = [
                "counter-strike",
                "csgo",
                "valorant",
                "league of legends",
                "dota",
                "overwatch",
                "esports",
              ];

              const titleIsSports = sportsKeywords.some((sk) =>
                titleLower.includes(sk),
              );
              const eventIsEsports = esportsKeywords.some((ek) =>
                text.includes(ek),
              );

              if (titleIsSports && eventIsEsports) {
                return false; // Don't show esports for sports trends
              }
            }

            // Check if any category keyword matches
            return categoryKeywordLower.some((keyword) => {
              if (keyword.includes(" ")) {
                return text.includes(keyword);
              } else {
                const regex = new RegExp(
                  `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
                  "i",
                );
                return regex.test(text);
              }
            });
          })
          .sort((a, b) => {
            // Sort by liquidity (highest first)
            const aLiquidity = a.liquidity || 0;
            const bLiquidity = b.liquidity || 0;
            return bLiquidity - aLiquidity;
          })
          .slice(0, limit);

        if (fallbackEvents.length > 0) {
          console.log(
            `Found ${fallbackEvents.length} category-related events as fallback`,
          );
          return fallbackEvents.map((event) => ({
            ...event,
            url: `https://polymarket.com/event/${event.slug || event.id}`,
          }));
        }
      }

      // Final fallback: Return empty if no matches (better than showing irrelevant results)
      console.log(`No matches found. Returning empty.`);
      return [];
    }

    console.log(
      `Found ${scoredEvents.length} relevant Polymarket events. Top matches:`,
      scoredEvents.slice(0, 3).map((e) => e.title),
    );
    const matchedEvents = scoredEvents;

    // Add Polymarket URL to events
    return matchedEvents.map((event) => ({
      ...event,
      url: `https://polymarket.com/event/${event.slug || event.id}`,
    }));
  } catch (error) {
    console.error("Error fetching Polymarket events:", error);
    return [];
  }
}

// Extract key entities (company names, product names, specific terms)
function extractKeyEntities(text: string, category?: string): string[] {
  if (!text) return [];

  const entities: string[] = [];
  const textLower = text.toLowerCase();

  // Common company/product names to look for by category
  const knownEntities: Record<string, string[]> = {
    Semiconductors: [
      "nvidia",
      "intel",
      "amd",
      "tsmc",
      "samsung",
      "qualcomm",
      "broadcom",
      "micron",
      "blackwell",
      "hopper",
      "h100",
      "a100",
      "gpu",
      "chip",
      "semiconductor",
      "taiwan semiconductor",
      "asml",
      "applied materials",
    ],
    AI: [
      "openai",
      "chatgpt",
      "gpt",
      "anthropic",
      "claude",
      "google",
      "deepmind",
      "gemini",
      "llm",
      "ai",
      "machine learning",
      "artificial intelligence",
      "neural network",
    ],
    Finance: [
      "fed",
      "federal reserve",
      "interest rate",
      "inflation",
      "bitcoin",
      "ethereum",
      "crypto",
      "stock",
      "nasdaq",
      "sp500",
      "dow jones",
      "s&p 500",
    ],
    Energy: [
      "solar",
      "wind",
      "nuclear",
      "oil",
      "gas",
      "renewable",
      "tesla",
      "battery",
      "energy storage",
      "crude oil",
      "natural gas",
    ],
    Gaming: [
      // Sports (not esports)
      "nhl",
      "nba",
      "nfl",
      "mlb",
      "hockey",
      "basketball",
      "football",
      "baseball",
      "soccer",
      "tennis",
      "golf",
      "rangers",
      "yankees",
      "knicks",
      "giants",
      "jets",
      "mets",
      "islanders",
      "nets",
      // Esports/Video Games
      "playstation",
      "xbox",
      "nintendo",
      "steam",
      "epic games",
      "roblox",
      "fortnite",
      "gaming",
      "esports",
      "sony",
      "microsoft",
      "switch",
      "ps5",
      "counter-strike",
      "csgo",
      "valorant",
      "league of legends",
      "dota",
      "overwatch",
    ],
    Crypto: [
      "bitcoin",
      "ethereum",
      "solana",
      "crypto",
      "blockchain",
      "defi",
      "nft",
      "btc",
      "eth",
    ],
  };

  // Extract capitalized words/phrases (likely proper nouns - company names, products)
  const capitalizedMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (capitalizedMatches) {
    entities.push(...capitalizedMatches.map((e) => e.toLowerCase()));
  }

  // Extract known entities for category if provided
  if (category && knownEntities[category]) {
    const categoryEntities = knownEntities[category];
    categoryEntities.forEach((entity) => {
      // Check if entity appears in text (as whole word or phrase)
      const entityWords = entity.split(" ");
      if (entityWords.length > 1) {
        // Multi-word entity - check for phrase match
        if (textLower.includes(entity)) {
          entities.push(entity);
        }
      } else {
        // Single word entity - check for word boundary match
        const regex = new RegExp(
          `\\b${entity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
          "i",
        );
        if (regex.test(text)) {
          entities.push(entity);
        }
      }
    });
  }

  return entities;
}

// Extract meaningful keywords from text - improved version
function extractKeywords(text: string, category?: string): string[] {
  if (!text) return [];

  const keywords: string[] = [];
  const textLower = text.toLowerCase();

  // Common stop words to exclude (including common prediction language)
  const stopWords = new Set([
    "the",
    "a",
    "an",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
    "for",
    "of",
    "with",
    "by",
    "from",
    "will",
    "this",
    "that",
    "these",
    "those",
    "when",
    "what",
    "how",
    "why",
    "where",
    "is",
    "are",
    "was",
    "were",
    "be",
    "been",
    "being",
    "have",
    "has",
    "had",
    "do",
    "does",
    "did",
    "can",
    "could",
    "should",
    "would",
    "may",
    "might",
    "must",
    "shall",
    "its",
    "it's",
    "they",
    "them",
    "their",
    "there",
    "then",
    "than",
    "based",
    "recent",
    "signals",
    "key",
    "indicators",
    "suggest",
    "likelihood",
    "within",
    "driven",
    "transforms",
    "accelerates",
    "evolve",
    "shifts",
    "expansion",
    "innovation",
    "market",
    "trends",
    "applications",
    "technology",
    "patterns",
    "demographics",
    "ceo",
    "company",
    "companies",
    "news",
    "article",
    "report",
    "says",
    "sees",
    "expects",
    "among",
    "top",
    "well",
    "put",
    "drops",
    "gloves",
    "exciting",
    "debut", // Common sports/news words
  ]);

  // STEP 1: Extract key entities first (company names, products, proper nouns)
  const entities = extractKeyEntities(text, category);
  keywords.push(...entities.slice(0, 20)); // Prioritize entities heavily

  // STEP 2: Extract proper nouns (capitalized words/phrases) - these are names, teams, etc.
  const properNounMatches = text.match(/\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b/g);
  if (properNounMatches) {
    properNounMatches.forEach((match) => {
      const matchLower = match.toLowerCase();
      // Only add if it's meaningful (not already in entities, not a stop word)
      if (!keywords.includes(matchLower) && match.length > 2) {
        keywords.push(matchLower);
        // Also add individual capitalized words if multi-word
        if (match.includes(" ")) {
          const words = match.split(" ");
          words.forEach((word) => {
            const wordLower = word.toLowerCase();
            if (
              word.length > 2 &&
              !stopWords.has(wordLower) &&
              !keywords.includes(wordLower)
            ) {
              keywords.push(wordLower);
            }
          });
        }
      }
    });
  }

  // STEP 3: Extract meaningful phrases (only adjacent capitalized words or known entities)
  const words = textLower
    .replace(/[^\w\s]/g, " ") // Replace punctuation with spaces
    .split(/\s+/)
    .filter(
      (word) => word.length > 2 && !stopWords.has(word) && !word.match(/^\d+$/),
    );

  // Extract meaningful 2-word phrases (only if both words are significant AND form a meaningful unit)
  const meaningfulBigrams: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    // Only create bigram if both words are meaningful
    if (
      !stopWords.has(word1) &&
      !stopWords.has(word2) &&
      word1.length > 2 &&
      word2.length > 2
    ) {
      const bigram = `${word1} ${word2}`;
      // Only add if:
      // 1. It's not already a single keyword
      // 2. At least one word is a proper noun or entity (more likely to be meaningful)
      // 3. Or both words are significant nouns/adjectives
      const word1IsEntity = entities.some(
        (e) => e.includes(word1) || word1.includes(e),
      );
      const word2IsEntity = entities.some(
        (e) => e.includes(word2) || word2.includes(e),
      );
      const isProperNounPair = properNounMatches?.some((pn) => {
        const pnLower = pn.toLowerCase();
        return pnLower.includes(bigram) || bigram.includes(pnLower);
      });

      if (
        !keywords.includes(bigram) &&
        (word1IsEntity || word2IsEntity || isProperNounPair)
      ) {
        meaningfulBigrams.push(bigram);
      }
    }
  }

  // Extract meaningful 3-word phrases (ONLY for proper noun sequences - names, teams, etc.)
  const meaningfulTrigrams: string[] = [];
  for (let i = 0; i < words.length - 2; i++) {
    const word1 = words[i];
    const word2 = words[i + 1];
    const word3 = words[i + 2];
    // Only create trigram if all words are meaningful
    if (
      !stopWords.has(word1) &&
      !stopWords.has(word2) &&
      !stopWords.has(word3) &&
      word1.length > 2 &&
      word2.length > 2 &&
      word3.length > 2
    ) {
      const trigram = `${word1} ${word2} ${word3}`;
      // ONLY add if it's a proper noun sequence (like "Caleb Wilson among" -> "Caleb Wilson" is the key part)
      // Check if this trigram contains a proper noun phrase
      const isProperNounSequence = properNounMatches?.some((pn) => {
        const pnLower = pn.toLowerCase();
        // Check if the proper noun is contained in or overlaps with the trigram
        return (
          trigram.includes(pnLower) ||
          pnLower.split(" ").some((pnWord) => trigram.includes(pnWord))
        );
      });

      // Also check if it contains known entities
      const containsEntity = entities.some((e) => {
        const eWords = e.split(" ");
        return eWords.length >= 2 && trigram.includes(e);
      });

      if (
        (isProperNounSequence || containsEntity) &&
        !keywords.includes(trigram)
      ) {
        meaningfulTrigrams.push(trigram);
      }
    }
  }

  // STEP 4: Extract important single words (nouns, sports terms, etc.)
  const importantWords: string[] = [];
  words.forEach((word) => {
    if (!keywords.includes(word) && !stopWords.has(word) && word.length > 2) {
      importantWords.push(word);
    }
  });

  // Combine: prioritize entities, then meaningful phrases, then single words
  keywords.push(...meaningfulTrigrams.slice(0, 5)); // Limited meaningful trigrams
  keywords.push(...meaningfulBigrams.slice(0, 10)); // More meaningful bigrams
  keywords.push(...importantWords.slice(0, 15)); // Important single words

  // Remove duplicates while preserving order
  const uniqueKeywords = Array.from(new Set(keywords));

  // Limit to most relevant (prioritize longer, more specific keywords)
  return uniqueKeywords
    .sort((a, b) => {
      const aWords = a.split(" ").length;
      const bWords = b.split(" ").length;
      if (aWords !== bWords) return bWords - aWords; // Longer phrases first
      return b.length - a.length; // Then by length
    })
    .slice(0, 25); // Limit to top 25 most relevant keywords
}

// Use Claude to rank and filter Polymarket events by semantic relevance
async function rankEventsWithClaude(
  events: PolymarketEvent[],
  trendTitle: string,
  trendSummary: string,
  category: string,
  limit: number,
): Promise<PolymarketEvent[]> {
  if (!ANTHROPIC_API_KEY || events.length === 0) {
    return events.slice(0, limit);
  }

  try {
    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Prepare event list for Claude (limit to avoid token limits)
    const eventsToRank = events.slice(0, 30);
    const eventsList = eventsToRank
      .map(
        (event, index) =>
          `${index + 1}. "${event.title}"${event.description ? ` - ${event.description.substring(0, 200)}` : ""}`,
      )
      .join("\n");

    const systemPrompt = `You are an expert at matching prediction market events to trends. Your task is to identify which Polymarket events are semantically relevant to a given trend, even if they don't share exact keywords.

Consider:
- Semantic similarity (e.g., "NHL playoffs" matches "hockey championship")
- Related concepts (e.g., "presidential election" matches "political campaign")
- Context and domain (e.g., "AI regulation" matches "tech policy")
- Exclude events that are only tangentially related or completely unrelated

Return ONLY a JSON array of numbers (1-indexed) representing the most relevant events, ordered by relevance (most relevant first). Limit to the top ${limit} events.`;

    const userPrompt = `Trend Title: "${trendTitle}"
Trend Summary: "${trendSummary}"
Category: ${category}

Polymarket Events:
${eventsList}

Which events are semantically relevant to this trend? Return a JSON array of event numbers (1-indexed), ordered by relevance: [1, 5, 3, ...]`;

    const message = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Use Haiku for faster, cheaper analysis
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
    });

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON array from response
    const jsonMatch = responseText.match(/\[[\d,\s]+\]/);
    if (jsonMatch) {
      const rankedIndices: number[] = JSON.parse(jsonMatch[0]);
      // Convert 1-indexed to 0-indexed and filter valid indices
      const rankedEvents = rankedIndices
        .map((idx) => idx - 1)
        .filter((idx) => idx >= 0 && idx < eventsToRank.length)
        .map((idx) => eventsToRank[idx])
        .filter((event) => event !== undefined);

      // If Claude returned valid rankings, use them
      if (rankedEvents.length > 0) {
        return rankedEvents.slice(0, limit);
      }
    }

    // Fallback: return original events if Claude response is invalid
    console.warn("Claude returned invalid ranking, using original order");
    return events.slice(0, limit);
  } catch (error: any) {
    console.error("Error using Claude to rank events:", error);
    // Fallback to original keyword matching
    return events.slice(0, limit);
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");
  const title = searchParams.get("title");
  const summary = searchParams.get("summary"); // Also accept summary/description
  const limit = parseInt(searchParams.get("limit") || "8"); // Increased default from 5 to 8

  try {
    // Build keywords prioritizing title/summary over category
    const keywords: string[] = [];
    const categoryKeywords: string[] = [];

    // Extract keywords from title (most important - trend-specific)
    if (title) {
      const titleKeywords = extractKeywords(title, category || undefined);
      keywords.push(...titleKeywords);
      console.log(
        `Extracted keywords from title "${title}": ${titleKeywords.slice(0, 8).join(", ")}`,
      );
    }

    // Extract keywords from summary/description (secondary - trend-specific)
    if (summary) {
      const summaryKeywords = extractKeywords(summary, category || undefined);
      // Add summary keywords but prioritize title keywords (increased limit)
      keywords.push(...summaryKeywords.slice(0, 15)); // Increased from 8 to 15
      console.log(
        `Extracted keywords from summary: ${summaryKeywords.slice(0, 10).join(", ")}`,
      );
    }

    // Category tags as fallback (always add for better matching)
    if (category) {
      const categoryTags = categoryToPolymarketTags[category] || [
        category.toLowerCase(),
      ];
      categoryKeywords.push(...categoryTags.slice(0, 5)); // Increased to 5 category tags
      console.log(
        `Adding category keywords: ${categoryTags.slice(0, 5).join(", ")}`,
      );
    }

    // Combine: prioritize trend-specific keywords, then category
    const allKeywords = [...keywords, ...categoryKeywords];

    // Remove duplicates while preserving order (trend-specific first)
    const uniqueKeywords = Array.from(new Set(allKeywords));

    // Limit to most relevant keywords (prioritize phrases and longer keywords)
    const prioritizedKeywords = uniqueKeywords
      .sort((a, b) => {
        // Prioritize longer keywords (phrases)
        const aWords = a.split(" ").length;
        const bWords = b.split(" ").length;
        if (aWords !== bWords) return bWords - aWords; // More words = higher priority
        if (a.includes(" ") && !b.includes(" ")) return -1;
        if (!a.includes(" ") && b.includes(" ")) return 1;
        return b.length - a.length;
      })
      .slice(0, 30); // Increased to 30 keywords for better matching

    console.log(
      `Searching Polymarket for trend "${title}" with keywords: ${prioritizedKeywords.slice(0, 8).join(", ")}`,
    );

    if (prioritizedKeywords.length === 0) {
      return NextResponse.json({
        events: [],
        message: "No keywords provided",
      });
    }

    // Fetch similar events from Polymarket using trend-specific keywords
    // Fetch more events initially for Claude to rank
    let events = await searchPolymarketEvents(
      prioritizedKeywords,
      limit * 2, // Fetch more for Claude to rank
      category || undefined,
      title || undefined,
    );

    // If Claude API is available, use it to improve relevance
    if (ANTHROPIC_API_KEY && events.length > 0 && title) {
      try {
        events = await rankEventsWithClaude(
          events,
          title,
          summary || "",
          category || "",
          limit,
        );
        console.log(`Claude ranked ${events.length} events for relevance`);
      } catch (claudeError) {
        console.warn("Claude ranking failed, using keyword matching:", claudeError);
        // Fall back to keyword matching - just take top results
        events = events.slice(0, limit);
      }
    } else {
      // If no Claude, just take top results from keyword matching
      events = events.slice(0, limit);
    }

    // Format events to match our similarEvents structure
    const similarEvents = events.map((event) => ({
      title: event.title,
      url:
        event.url || `https://polymarket.com/event/${event.slug || event.id}`,
      description: event.description,
      liquidity: event.liquidity,
      volume: event.volume,
    }));

    return NextResponse.json({
      events: similarEvents,
      total: similarEvents.length,
    });
  } catch (error) {
    console.error("Error in Polymarket events API:", error);
    return NextResponse.json(
      {
        events: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Polymarket events",
      },
      { status: 500 },
    );
  }
}
