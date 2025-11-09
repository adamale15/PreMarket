import { NextResponse } from "next/server";

// Reddit API integration (free alternative to Twitter)
// No API key needed for public data!

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    subreddit: string;
    author: string;
    score: number;
    num_comments: number;
    created_utc: number;
    url: string;
    permalink: string;
    upvote_ratio: number;
  };
}

interface RedditApiResponse {
  data: {
    children: RedditPost[];
    after?: string;
  };
}

// Map interests to Reddit subreddits and keywords
const categorySubreddits: Record<string, string[]> = {
  AI: ["artificial", "MachineLearning", "ChatGPT", "OpenAI", "singularity"],
  Policy: ["politics", "law", "government", "Policy"],
  Semiconductors: ["hardware", "intel", "nvidia", "AMD", "technology"],
  Finance: ["finance", "investing", "stocks", "cryptocurrency", "bitcoin"],
  "E-commerce": ["ecommerce", "shopify", "amazon", "business"],
  Healthcare: ["healthcare", "medicine", "pharmacy", "medical"],
  Energy: ["energy", "renewable", "solar", "wind", "environment"],
  Crypto: ["cryptocurrency", "bitcoin", "ethereum", "CryptoCurrency", "defi"],
  Climate: ["climate", "environment", "sustainability", "renewable"],
  Gaming: ["gaming", "games", "pcgaming", "xbox", "playstation", "nintendo"],
};

const categoryKeywords: Record<string, string[]> = {
  AI: ["artificial intelligence", "AI", "machine learning", "LLM", "GPT", "neural network"],
  Policy: ["regulation", "policy", "legislation", "government", "law"],
  Semiconductors: ["semiconductor", "chip", "TSMC", "Intel", "NVIDIA", "processor"],
  Finance: ["finance", "banking", "cryptocurrency", "bitcoin", "stock", "market"],
  "E-commerce": ["e-commerce", "online shopping", "retail", "amazon", "shopify"],
  Healthcare: ["healthcare", "medical", "pharmaceutical", "health", "medicine"],
  Energy: ["energy", "renewable", "solar", "wind", "oil", "gas"],
  Crypto: ["cryptocurrency", "bitcoin", "ethereum", "blockchain", "crypto"],
  Climate: ["climate", "environment", "carbon", "emissions", "sustainability"],
  Gaming: ["gaming", "video game", "esports", "console", "gaming industry"],
};

// Extract category from post content
function extractCategory(post: RedditPost["data"]): string {
  const text = `${post.title} ${post.selftext}`.toLowerCase();
  
  // Check subreddit first
  const subredditLower = post.subreddit.toLowerCase();
  for (const [category, subreddits] of Object.entries(categorySubreddits)) {
    if (subreddits.some(sub => subredditLower.includes(sub.toLowerCase()))) {
      return category;
    }
  }
  
  // Then check keywords
  const matchedCategories: string[] = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
      matchedCategories.push(category);
    }
  }
  
  if (matchedCategories.length === 0) {
    return "General";
  } else if (matchedCategories.length === 1) {
    return matchedCategories[0];
  } else {
    return matchedCategories.slice(0, 2).join(" • ");
  }
}

// Generate trend probability based on Reddit signals
function calculateProbability(post: RedditPost["data"]): number {
  let base = 40;
  
  // Increase probability based on upvotes (score)
  const score = post.score || 0;
  if (score > 1000) base += 25;
  else if (score > 500) base += 20;
  else if (score > 100) base += 15;
  else if (score > 50) base += 10;
  else if (score > 10) base += 5;
  
  // Increase probability based on comments (engagement)
  const comments = post.num_comments || 0;
  if (comments > 100) base += 10;
  else if (comments > 50) base += 7;
  else if (comments > 20) base += 5;
  else if (comments > 10) base += 3;
  
  // Increase probability based on upvote ratio (consensus)
  const upvoteRatio = post.upvote_ratio || 0.5;
  if (upvoteRatio > 0.9) base += 5;
  else if (upvoteRatio > 0.8) base += 3;
  
  // Increase probability based on recency
  const postDate = new Date(post.created_utc * 1000);
  const hoursAgo = (Date.now() - postDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) base += 15;
  else if (hoursAgo < 6) base += 10;
  else if (hoursAgo < 24) base += 5;
  else if (hoursAgo < 48) base += 2;
  
  return Math.min(90, Math.max(25, base));
}

// Convert Reddit post to trend format
function postToTrend(post: RedditPost["data"], index: number): any {
  const category = extractCategory(post);
  const probability = calculateProbability(post);
  
  // Create title from post title (truncate if too long)
  const title = post.title.length > 100 
    ? `${post.title.substring(0, 97)}...` 
    : post.title;
  
  // Create summary with engagement metrics
  const engagementText = post.score > 0 || post.num_comments > 0
    ? ` (${post.score} upvotes, ${post.num_comments} comments)`
    : "";
  
  const summary = post.selftext 
    ? `${post.title}: ${post.selftext.substring(0, 150)}${post.selftext.length > 150 ? "..." : ""}${engagementText}`
    : `${post.title}${engagementText}`;

  return {
    id: `reddit-${index}-${post.id}`,
    title,
    category: category,
    probability,
    summary,
    sources: [
      {
        name: `r/${post.subreddit} — Reddit`,
        url: `https://reddit.com${post.permalink}`,
        type: "social" as const,
      },
    ],
    timeline: [
      {
        date: new Date(post.created_utc * 1000).toISOString(),
        label: "Posted on Reddit",
      },
    ],
    similarEvents: [],
    isReddit: true,
    engagement: {
      upvotes: post.score || 0,
      comments: post.num_comments || 0,
      upvoteRatio: post.upvote_ratio || 0,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interests = searchParams.get("interests")?.split(",") || [];
  const query = searchParams.get("q") || "technology";
  
  try {
    // Build query based on interests
    let redditQuery = query;
    let subreddits: string[] = [];
    
    if (interests.length > 0) {
      // Get subreddits for each interest
      const allSubreddits = interests
        .flatMap(interest => {
          const subs = categorySubreddits[interest] || [];
          return subs;
        })
        .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
        .slice(0, 5); // Limit to 5 subreddits
      
      subreddits = allSubreddits;
      
      // Get keywords for search query
      const allKeywords = interests
        .flatMap(interest => {
          const keywords = categoryKeywords[interest] || [interest];
          return keywords;
        })
        .filter((v, i, a) => a.indexOf(v) === i)
        .slice(0, 5);
      
      if (allKeywords.length > 0) {
        redditQuery = allKeywords.join(" OR ");
      }
      
      console.log(`Reddit query for interests [${interests.join(", ")}]: ${redditQuery}, subreddits: ${subreddits.join(", ")}`);
    }

    // Fetch from Reddit API
    // Option 1: Search across Reddit
    let apiUrl: string;
    if (subreddits.length > 0) {
      // Search in specific subreddits
      const subredditList = subreddits.join("+");
      apiUrl = `https://www.reddit.com/r/${subredditList}/search.json?q=${encodeURIComponent(redditQuery)}&sort=hot&limit=20&t=day`;
    } else {
      // Search all of Reddit
      apiUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(redditQuery)}&sort=hot&limit=20&t=day`;
    }
    
    const response = await fetch(apiUrl, {
      headers: {
        "User-Agent": "OrbitField/1.0 (Trend Prediction Platform)", // Reddit requires User-Agent
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 429) {
        return NextResponse.json({
          trends: [],
          error: "Reddit API rate limit exceeded. Please try again later.",
        }, { status: 429 });
      }
      
      const errorText = await response.text();
      console.error(`Reddit API error: ${response.status} - ${errorText}`);
      throw new Error(`Reddit API error: ${response.statusText}`);
    }

    const data: RedditApiResponse = await response.json();

    if (!data.data || !data.data.children || data.data.children.length === 0) {
      return NextResponse.json({
        trends: [],
        total: 0,
        message: "No Reddit posts found matching the query.",
      });
    }

    // Convert posts to trends
    const trends = data.data.children
      .filter(post => post.data.title && post.data.title.length > 10) // Filter very short posts
      .slice(0, 15) // Limit to 15 trends
      .map((post, index) => postToTrend(post.data, index));

    // Filter by interests if provided
    let filteredTrends = trends;
    if (interests.length > 0) {
      filteredTrends = trends.filter(trend => {
        const trendCategoryLower = trend.category.toLowerCase();
        return interests.some(interest => {
          const interestLower = interest.toLowerCase();
          return trendCategoryLower.includes(interestLower) || 
                 interestLower.includes(trendCategoryLower) ||
                 trendCategoryLower.split(/[•·\-\s]+/).some(part => part.trim() === interestLower);
        });
      });
      
      if (filteredTrends.length === 0 && trends.length > 0) {
        console.log(`No trends matched interests: ${interests.join(", ")}. Returning all trends.`);
        filteredTrends = trends;
      }
    }

    return NextResponse.json({
      trends: filteredTrends,
      total: filteredTrends.length,
      filtered: interests.length > 0 && filteredTrends.length < trends.length,
      source: "reddit",
    });
  } catch (error) {
    console.error("Error fetching Reddit trends:", error);
    return NextResponse.json(
      {
        trends: [],
        error: error instanceof Error ? error.message : "Failed to fetch Reddit trends",
      },
      { status: 500 }
    );
  }
}

