import { NextResponse } from "next/server";

// Twitter API v2 integration
// You'll need to add TWITTER_BEARER_TOKEN to your .env file
const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || "";

interface TwitterTweet {
  id: string;
  text: string;
  created_at: string;
  public_metrics: {
    retweet_count: number;
    like_count: number;
    reply_count: number;
    quote_count: number;
  };
  author_id?: string;
}

interface TwitterUser {
  id: string;
  username: string;
  name: string;
}

interface TwitterApiResponse {
  data?: TwitterTweet[];
  includes?: {
    users?: TwitterUser[];
  };
  errors?: any[];
  meta?: {
    result_count: number;
  };
}

// Map interests to Twitter search keywords
const categoryKeywords: Record<string, string[]> = {
  AI: [
    "artificial intelligence",
    "AI",
    "machine learning",
    "LLM",
    "GPT",
    "neural network",
  ],
  Policy: ["regulation", "policy", "legislation", "government", "law"],
  Semiconductors: [
    "semiconductor",
    "chip",
    "TSMC",
    "Intel",
    "NVIDIA",
    "processor",
  ],
  Finance: [
    "finance",
    "banking",
    "cryptocurrency",
    "bitcoin",
    "stock",
    "market",
  ],
  "E-commerce": [
    "e-commerce",
    "online shopping",
    "retail",
    "amazon",
    "shopify",
  ],
  Healthcare: ["healthcare", "medical", "pharmaceutical", "health", "medicine"],
  Energy: ["energy", "renewable", "solar", "wind", "oil", "gas"],
  Crypto: ["cryptocurrency", "bitcoin", "ethereum", "blockchain", "crypto"],
  Climate: ["climate", "environment", "carbon", "emissions", "sustainability"],
  Gaming: ["gaming", "video game", "esports", "console", "gaming industry"],
};

// Extract category from tweet content
function extractCategory(tweet: TwitterTweet, tweetText: string): string {
  const text = tweetText.toLowerCase();

  // Find matching categories (can match multiple)
  const matchedCategories: string[] = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => text.includes(keyword.toLowerCase()))) {
      matchedCategories.push(category);
    }
  }

  // Return first match, or combine if multiple (e.g., "AI • Policy")
  if (matchedCategories.length === 0) {
    return "General";
  } else if (matchedCategories.length === 1) {
    return matchedCategories[0];
  } else {
    // Return combined category for tweets matching multiple interests
    return matchedCategories.slice(0, 2).join(" • ");
  }
}

// Generate trend probability based on tweet signals
function calculateProbability(tweet: TwitterTweet): number {
  let base = 40;

  // Increase probability based on engagement
  const metrics = tweet.public_metrics;
  const totalEngagement =
    (metrics?.retweet_count || 0) +
    (metrics?.like_count || 0) +
    (metrics?.reply_count || 0) +
    (metrics?.quote_count || 0);

  if (totalEngagement > 1000) base += 25;
  else if (totalEngagement > 500) base += 20;
  else if (totalEngagement > 100) base += 15;
  else if (totalEngagement > 50) base += 10;
  else if (totalEngagement > 10) base += 5;

  // Increase probability based on recency (more recent = higher probability)
  const tweetDate = new Date(tweet.created_at);
  const hoursAgo = (Date.now() - tweetDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 1) base += 15;
  else if (hoursAgo < 6) base += 10;
  else if (hoursAgo < 24) base += 5;
  else if (hoursAgo < 48) base += 2;

  // Boost for high retweet count (viral potential)
  if ((metrics?.retweet_count || 0) > 100) base += 5;

  return Math.min(90, Math.max(25, base));
}

// Convert tweet to trend format
function tweetToTrend(
  tweet: TwitterTweet,
  author: TwitterUser | null,
  index: number,
): any {
  const tweetText = tweet.text;
  const category = extractCategory(tweet, tweetText);
  const probability = calculateProbability(tweet);

  const authorUsername = author?.username || "twitter";
  const authorName = author?.name || "Twitter User";

  // Create title from tweet (truncate if too long)
  const title =
    tweetText.length > 100 ? `${tweetText.substring(0, 97)}...` : tweetText;

  // Create summary with engagement metrics
  const metrics = tweet.public_metrics;
  const retweetCount = metrics?.retweet_count || 0;
  const likeCount = metrics?.like_count || 0;
  const engagementText =
    retweetCount > 0 || likeCount > 0
      ? ` (${retweetCount} retweets, ${likeCount} likes)`
      : "";

  const summary = `Social signal from @${authorUsername}: ${tweetText}${engagementText}`;

  return {
    id: `twitter-${index}-${tweet.id}`,
    title,
    category: category,
    probability,
    summary,
    sources: [
      {
        name: `@${authorUsername} — Twitter`,
        url: `https://twitter.com/${authorUsername}/status/${tweet.id}`,
        type: "social" as const,
      },
    ],
    timeline: [
      {
        date: tweet.created_at,
        label: "Tweet posted",
      },
    ],
    similarEvents: [],
    isTwitter: true,
    engagement: {
      retweets: retweetCount,
      likes: likeCount,
      replies: metrics?.reply_count || 0,
      quotes: metrics?.quote_count || 0,
    },
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interests = searchParams.get("interests")?.split(",") || [];
  const query = searchParams.get("q") || "technology";

  if (!TWITTER_BEARER_TOKEN) {
    console.warn("TWITTER_BEARER_TOKEN not set. Using sample data.");
    return NextResponse.json({
      trends: [],
      message:
        "Twitter Bearer Token not configured. Please add TWITTER_BEARER_TOKEN to your .env file.",
    });
  }

  try {
    // Build query based on interests
    let twitterQuery = query;
    if (interests.length > 0) {
      // Get keywords for each interest
      const allKeywords = interests
        .flatMap((interest) => {
          const keywords = categoryKeywords[interest] || [interest];
          return keywords;
        })
        .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
        .slice(0, 10); // Limit to 10 keywords for Twitter API

      if (allKeywords.length > 0) {
        // Use OR to find tweets matching any keyword
        // Exclude retweets and limit to English
        twitterQuery = `(${allKeywords.join(" OR ")}) -is:retweet lang:en`;
      }

      console.log(
        `Twitter query for interests [${interests.join(", ")}]: ${twitterQuery}`,
      );
    } else {
      // Default query excludes retweets and limits to English
      twitterQuery = `${query} -is:retweet lang:en`;
    }

    // Fetch from Twitter API v2
    // Note: Recent search endpoint only returns tweets from last 7 days
    const apiUrl = `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(twitterQuery)}&max_results=20&tweet.fields=created_at,public_metrics,author_id&expansions=author_id&user.fields=username,name`;

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${TWITTER_BEARER_TOKEN}`,
        "Content-Type": "application/json",
      },
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      if (response.status === 429) {
        // Extract rate limit info from headers if available
        const resetTime = response.headers.get("x-rate-limit-reset");
        const remaining = response.headers.get("x-rate-limit-remaining");

        let errorMessage =
          "Twitter API rate limit exceeded. Please try again later.";
        if (resetTime) {
          const resetDate = new Date(parseInt(resetTime) * 1000);
          const minutesUntilReset = Math.ceil(
            (resetDate.getTime() - Date.now()) / (1000 * 60),
          );
          errorMessage = `Twitter API rate limit exceeded. Rate limit resets in approximately ${minutesUntilReset} minutes.`;
        }

        return NextResponse.json(
          {
            trends: [],
            error: errorMessage,
            rateLimitInfo: {
              resetTime: resetTime
                ? new Date(parseInt(resetTime) * 1000).toISOString()
                : null,
              remaining: remaining ? parseInt(remaining) : null,
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": resetTime
                ? String(
                    Math.ceil((parseInt(resetTime) * 1000 - Date.now()) / 1000),
                  )
                : "900",
            },
          },
        );
      }

      const errorText = await response.text();
      console.error(`Twitter API error: ${response.status} - ${errorText}`);
      throw new Error(`Twitter API error: ${response.statusText}`);
    }

    const data: TwitterApiResponse = await response.json();

    if (data.errors) {
      console.error("Twitter API errors:", data.errors);
      throw new Error(
        `Twitter API returned errors: ${JSON.stringify(data.errors)}`,
      );
    }

    if (!data.data || data.data.length === 0) {
      return NextResponse.json({
        trends: [],
        total: 0,
        message: "No tweets found matching the query.",
      });
    }

    // Map author information
    const authorMap = new Map<string, TwitterUser>();
    if (data.includes?.users) {
      data.includes.users.forEach((user) => {
        authorMap.set(user.id, user);
      });
    }

    // Convert tweets to trends
    const trends = data.data
      .filter((tweet) => tweet.text && tweet.text.length > 20) // Filter very short tweets
      .slice(0, 15) // Limit to 15 trends
      .map((tweet, index) => {
        const author = tweet.author_id
          ? authorMap.get(tweet.author_id) || null
          : null;
        return tweetToTrend(tweet, author, index);
      });

    // Filter by interests if provided
    let filteredTrends = trends;
    if (interests.length > 0) {
      filteredTrends = trends.filter((trend) => {
        const trendCategoryLower = trend.category.toLowerCase();
        return interests.some((interest) => {
          const interestLower = interest.toLowerCase();
          // Check if category contains interest or vice versa
          return (
            trendCategoryLower.includes(interestLower) ||
            interestLower.includes(trendCategoryLower) ||
            // Also check if any part of category matches (for "AI • Policy" format)
            trendCategoryLower
              .split(/[•·\-\s]+/)
              .some((part) => part.trim() === interestLower)
          );
        });
      });

      // If filtering returns no results, return all trends (better UX)
      if (filteredTrends.length === 0 && trends.length > 0) {
        console.log(
          `No trends matched interests: ${interests.join(", ")}. Returning all trends.`,
        );
        filteredTrends = trends;
      }
    }

    // Extract rate limit info from response headers
    const rateLimitRemaining = response.headers.get("x-rate-limit-remaining");
    const rateLimitReset = response.headers.get("x-rate-limit-reset");

    return NextResponse.json({
      trends: filteredTrends,
      total: filteredTrends.length,
      filtered: interests.length > 0 && filteredTrends.length < trends.length,
      rateLimitInfo: {
        remaining: rateLimitRemaining ? parseInt(rateLimitRemaining) : null,
        resetTime: rateLimitReset
          ? new Date(parseInt(rateLimitReset) * 1000).toISOString()
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching Twitter trends:", error);
    return NextResponse.json(
      {
        trends: [],
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch Twitter trends",
      },
      { status: 500 },
    );
  }
}
