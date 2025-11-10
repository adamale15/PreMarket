import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { Trend } from "@/components/trends/TrendCard";

export async function POST(request: Request) {
  try {
    const trends: Trend[] = await request.json();

    if (!Array.isArray(trends)) {
      return NextResponse.json(
        { error: "Trends must be an array" },
        { status: 400 }
      );
    }

    // Prepare trends for insertion
    const trendsToInsert = trends.map((trend) => ({
      id: trend.id,
      title: trend.title,
      category: trend.category,
      probability: trend.probability,
      summary: trend.summary,
      sources: JSON.stringify(trend.sources),
      timeline: JSON.stringify(trend.timeline),
      similar_events: JSON.stringify(trend.similarEvents || []),
    }));

    // Upsert trends (insert or update if exists)
    const { data, error } = await supabase
      .from("trends")
      .upsert(trendsToInsert, {
        onConflict: "id",
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      count: data?.length || 0,
    });
  } catch (error) {
    console.error("Error storing trends:", error);
    return NextResponse.json(
      { error: "Failed to store trends" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");
    const limit = parseInt(searchParams.get("limit") || "20");

    let query = supabase
      .from("trends")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (category) {
      query = query.ilike("category", `%${category}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    // Convert back to Trend format
    const trends: Trend[] = (data || []).map((row: any) => ({
      id: row.id,
      title: row.title,
      category: row.category,
      probability: row.probability,
      summary: row.summary,
      sources: Array.isArray(row.sources) ? row.sources : JSON.parse(row.sources || "[]"),
      timeline: Array.isArray(row.timeline) ? row.timeline : JSON.parse(row.timeline || "[]"),
      similarEvents: Array.isArray(row.similar_events) ? row.similar_events : JSON.parse(row.similar_events || "[]"),
    }));

    return NextResponse.json({ trends });
  } catch (error) {
    console.error("Error fetching trends:", error);
    return NextResponse.json(
      { error: "Failed to fetch trends" },
      { status: 500 }
    );
  }
}




