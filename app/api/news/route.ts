import { NextResponse } from "next/server";

// NewsAPI integration
// You'll need to add NEWS_API_KEY to your .env file
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

// Map news categories to NewsAPI keywords
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

// Extract category from article content
function extractCategory(article: NewsArticle): string {
  const text = `${article.title} ${article.description} ${article.content || ""}`.toLowerCase();
  
  // Find matching categories (can match multiple)
  const matchedCategories: string[] = [];
  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some(keyword => text.includes(keyword.toLowerCase()))) {
      matchedCategories.push(category);
    }
  }
  
  // Return first match, or combine if multiple (e.g., "AI • Policy")
  if (matchedCategories.length === 0) {
    return "General";
  } else if (matchedCategories.length === 1) {
    return matchedCategories[0];
  } else {
    // Return combined category for articles matching multiple interests
    return matchedCategories.slice(0, 2).join(" • ");
  }
}

// Generate trend probability based on article signals
function calculateProbability(article: NewsArticle, category: string): number {
  let base = 50;
  
  // Increase probability based on recency (more recent = higher probability)
  const publishedDate = new Date(article.publishedAt);
  const hoursAgo = (Date.now() - publishedDate.getTime()) / (1000 * 60 * 60);
  if (hoursAgo < 24) base += 15;
  else if (hoursAgo < 48) base += 10;
  else if (hoursAgo < 72) base += 5;
  
  // Increase probability based on source credibility
  const credibleSources = ["Reuters", "Bloomberg", "Financial Times", "The Wall Street Journal", "TechCrunch"];
  if (credibleSources.some(source => article.source.name.includes(source))) {
    base += 10;
  }
  
  // Increase probability if article has substantial content
  const contentLength = (article.content || article.description || "").length;
  if (contentLength > 500) base += 5;
  
  return Math.min(95, Math.max(20, base));
}

// Convert news article to trend format
function articleToTrend(article: NewsArticle, index: number): any {
  const category = extractCategory(article);
  const probability = calculateProbability(article, category);
  
  return {
    id: `news-${index}-${Date.now()}`,
    title: article.title,
    category: category,
    probability,
    summary: article.description || article.title,
    sources: [
      {
        name: article.source.name,
        url: article.url,
        type: "news" as const,
      },
    ],
    timeline: [
      {
        date: article.publishedAt,
        label: "News published",
      },
    ],
    similarEvents: [],
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const interests = searchParams.get("interests")?.split(",") || [];
  const query = searchParams.get("q") || "technology";
  
  if (!NEWS_API_KEY) {
    console.warn("NEWS_API_KEY not set. Using sample data.");
    return NextResponse.json({
      trends: [],
      message: "NewsAPI key not configured. Please add NEWS_API_KEY to your .env file.",
    });
  }

  try {
    // Build query based on interests
    let newsQuery = query;
    if (interests.length > 0) {
      // Get keywords for each interest
      const allKeywords = interests
        .flatMap(interest => {
          const keywords = categoryKeywords[interest] || [interest];
          return keywords;
        })
        .filter((v, i, a) => a.indexOf(v) === i) // Remove duplicates
        .slice(0, 10); // Limit to 10 keywords for NewsAPI
      
      if (allKeywords.length > 0) {
        // Use OR to find articles matching any keyword
        newsQuery = allKeywords.join(" OR ");
      }
      
      console.log(`News query for interests [${interests.join(", ")}]: ${newsQuery}`);
    }

    // Fetch from NewsAPI
    const apiUrl = `https://newsapi.org/v2/everything?q=${encodeURIComponent(newsQuery)}&sortBy=publishedAt&pageSize=20&language=en&apiKey=${NEWS_API_KEY}`;
    
    const response = await fetch(apiUrl, {
      next: { revalidate: 300 }, // Cache for 5 minutes
    });

    if (!response.ok) {
      throw new Error(`NewsAPI error: ${response.statusText}`);
    }

    const data: NewsApiResponse = await response.json();

    if (data.status !== "ok") {
      throw new Error("NewsAPI returned error status");
    }

    // Convert articles to trends
    const trends = data.articles
      .filter(article => article.title && article.description)
      .slice(0, 15) // Limit to 15 trends
      .map((article, index) => articleToTrend(article, index));

    // Filter by interests if provided
    let filteredTrends = trends;
    if (interests.length > 0) {
      filteredTrends = trends.filter(trend => {
        const trendCategoryLower = trend.category.toLowerCase();
        return interests.some(interest => {
          const interestLower = interest.toLowerCase();
          // Check if category contains interest or vice versa
          return trendCategoryLower.includes(interestLower) || 
                 interestLower.includes(trendCategoryLower) ||
                 // Also check if any part of category matches (for "AI • Policy" format)
                 trendCategoryLower.split(/[•·\-\s]+/).some(part => part.trim() === interestLower);
        });
      });
      
      // If filtering returns no results, return all trends (better UX)
      // This happens when API doesn't have articles matching interests yet
      if (filteredTrends.length === 0 && trends.length > 0) {
        console.log(`No trends matched interests: ${interests.join(", ")}. Returning all trends.`);
        filteredTrends = trends;
      }
    }

    return NextResponse.json({
      trends: filteredTrends,
      total: filteredTrends.length,
      filtered: interests.length > 0 && filteredTrends.length < trends.length,
    });
  } catch (error) {
    console.error("Error fetching news:", error);
    return NextResponse.json(
      {
        trends: [],
        error: error instanceof Error ? error.message : "Failed to fetch news",
      },
      { status: 500 }
    );
  }
}

