import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || "";

interface AnalyzeRequest {
  trend: {
    title: string;
    summary: string;
    category: string;
    probability: number;
    sources?: Array<{ name: string; url: string; type: string }>;
    timeline?: Array<{ date: string; label: string }>;
  };
  question: string;
}

export async function POST(request: Request) {
  try {
    if (!ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "Anthropic API key not configured" },
        { status: 500 },
      );
    }

    const body: AnalyzeRequest = await request.json();
    const { trend, question } = body;

    if (!trend || !question) {
      return NextResponse.json(
        { error: "Trend and question are required" },
        { status: 400 },
      );
    }

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Build context about the trend
    const sourcesText = trend.sources
      ? trend.sources
          .slice(0, 5)
          .map((s) => `- ${s.name}`)
          .join("\n")
      : "No sources available";

    const timelineText = trend.timeline
      ? trend.timeline
          .map((t) => `- ${t.label} (${new Date(t.date).toLocaleDateString()})`)
          .join("\n")
      : "No timeline available";

    const systemPrompt = `You are an expert trend analyst specializing in prediction markets and probabilistic forecasting. Your role is to analyze trends and provide insightful, data-driven assessments.

When analyzing trends, consider:
1. Current market signals and momentum
2. Historical patterns and comparable events
3. Key risk factors and catalysts
4. Timeline and deadline considerations
5. Source credibility and recency

Provide thoughtful, nuanced analysis that helps users understand the likelihood and factors affecting a trend.`;

    const userPrompt = `Analyze this trend and answer the user's question:

**Trend Title:** ${trend.title}
**Category:** ${trend.category}
**Current Probability:** ${trend.probability}%
**Summary:** ${trend.summary}

**Sources:**
${sourcesText}

**Timeline:**
${timelineText}

**User Question:** ${question}

Please provide:
1. A detailed analysis addressing the user's question
2. An updated probability assessment (0-100%) based on the question and context
3. Key factors that could influence the outcome

Format your response as:
- Analysis: [your detailed analysis]
- Updated Probability: [number]%
- Key Factors: [list of 2-3 key factors]`;

    // Try Claude 3.5 Sonnet first, fallback to Claude 3 Opus if not available
    let message;
    try {
      message = await anthropic.messages.create({
        model: "claude-3-5-haiku-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages: [
          {
            role: "user",
            content: userPrompt,
          },
        ],
      });
    } catch (modelError: any) {
      // If Opus fails, try Haiku as fallback
      if (
        modelError.message?.includes("not_found") ||
        modelError.message?.includes("404")
      ) {
        console.log("claude-3-5-haiku-20241022 not available");
        message = await anthropic.messages.create({
          model: "claude-3-haiku-20240307",
          max_tokens: 1024,
          system: systemPrompt,
          messages: [
            {
              role: "user",
              content: userPrompt,
            },
          ],
        });
      } else {
        throw modelError;
      }
    }

    const responseText =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract probability from response (look for "Updated Probability: X%" or similar patterns)
    let updatedProbability = trend.probability; // Default to current probability
    const probabilityMatch = responseText.match(
      /(?:updated\s+)?probability[:\s]+(\d+)/i,
    );
    if (probabilityMatch) {
      updatedProbability = parseInt(probabilityMatch[1], 10);
      // Ensure it's between 0-100
      updatedProbability = Math.max(0, Math.min(100, updatedProbability));
    }

    return NextResponse.json({
      analysis: responseText,
      score: updatedProbability,
    });
  } catch (error: any) {
    console.error("Error calling Claude API:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze trend",
        message: error.message || "Unknown error",
      },
      { status: 500 },
    );
  }
}
