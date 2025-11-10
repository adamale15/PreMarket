import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const trendId = searchParams.get("trendId");
    
    if (!userId) {
      return NextResponse.json(
        trendId ? { subscription: null } : { subscriptions: [] },
        { status: 200 }
      );
    }

    // Get user ID from Supabase
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        trendId ? { subscription: null } : { subscriptions: [] },
        { status: 200 }
      );
    }

    // If trendId is provided, get specific subscription
    if (trendId) {
      const { data: subscription, error } = await supabase
        .from("subscriptions")
        .select("trend_id, threshold, subscribed")
        .eq("user_id", user.id)
        .eq("trend_id", trendId)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      return NextResponse.json({
        subscription: subscription || null,
      });
    }

    // Get all user subscriptions
    const { data: subscriptions, error } = await supabase
      .from("subscriptions")
      .select("trend_id, threshold, subscribed")
      .eq("user_id", user.id)
      .eq("subscribed", true);

    if (error) {
      console.error("Error fetching subscriptions:", error);
      throw error;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No subscriptions found for user ${user.id}`);
      return NextResponse.json({
        subscriptions: [],
      });
    }

    console.log(`Found ${subscriptions.length} subscriptions for user ${user.id}`);

    // Fetch trend data for all subscribed trends
    const trendIds = subscriptions.map((sub: any) => sub.trend_id);
    console.log(`Fetching trend data for ${trendIds.length} trends:`, trendIds.slice(0, 5));
    
    const { data: trends, error: trendsError } = await supabase
      .from("trends")
      .select("*")
      .in("id", trendIds);

    if (trendsError) {
      console.error("Error fetching trends:", trendsError);
      // Return subscriptions without trend data if trends fetch fails
      return NextResponse.json({
        subscriptions: subscriptions.map((sub: any) => ({
          trend_id: sub.trend_id,
          threshold: sub.threshold,
          subscribed: sub.subscribed,
          trend: null,
        })),
      });
    }

    console.log(`Found ${trends?.length || 0} trends in database out of ${trendIds.length} requested`);

    // Create a map of trend_id -> trend data
    const trendsMap = new Map();
    
    // Process all trends - only filter out obvious placeholders
    (trends || []).forEach((trend: any) => {
      // Only filter out clear placeholders (not real trends)
      // Be more strict: only filter if BOTH title and summary are placeholders
      const isPlaceholder = 
        (!trend.title || trend.title.trim() === "") ||
        (trend.title === `Trend ${trend.id}` && 
         trend.summary === "Trend subscription" &&
         (!trend.sources || (Array.isArray(trend.sources) ? trend.sources.length === 0 : JSON.parse(trend.sources || "[]").length === 0)));
      
      // Skip only obvious placeholders
      if (isPlaceholder) {
        console.log(`Filtering out placeholder trend: ${trend.id} (title: "${trend.title}", summary: "${trend.summary}")`);
        return;
      }

      // Use real trend data
      trendsMap.set(trend.id, {
        id: trend.id,
        title: trend.title,
        category: trend.category,
        probability: trend.probability,
        summary: trend.summary,
        sources: Array.isArray(trend.sources) ? trend.sources : JSON.parse(trend.sources || "[]"),
        timeline: Array.isArray(trend.timeline) ? trend.timeline : JSON.parse(trend.timeline || "[]"),
        similarEvents: Array.isArray(trend.similar_events) ? trend.similar_events : JSON.parse(trend.similar_events || "[]"),
      });
    });

    // Format subscriptions with trend data
    const formattedSubscriptions = subscriptions.map((sub: any) => {
      const trend = trendsMap.get(sub.trend_id);
      if (!trend) {
        console.warn(`No trend data found for subscription: ${sub.trend_id} (trend may not exist in trends table or was filtered as placeholder)`);
      }
      return {
        trend_id: sub.trend_id,
        threshold: sub.threshold,
        subscribed: sub.subscribed,
        trend: trend || null,
      };
    });

    const subscriptionsWithTrendData = formattedSubscriptions.filter(s => s.trend !== null).length;
    const subscriptionsWithoutTrendData = formattedSubscriptions.length - subscriptionsWithTrendData;
    console.log(`Returning ${formattedSubscriptions.length} subscriptions: ${subscriptionsWithTrendData} with trend data, ${subscriptionsWithoutTrendData} without trend data`);

    return NextResponse.json({
      subscriptions: formattedSubscriptions,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscriptions" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { trendId, subscribed, threshold, trend: trendData } = await request.json();

    if (!trendId) {
      return NextResponse.json(
        { error: "trendId is required" },
        { status: 400 }
      );
    }

    // Get or create user in Supabase
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("id")
      .eq("clerk_user_id", userId)
      .single();

    if (userError && userError.code === "PGRST116") {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({ clerk_user_id: userId, interests: [] })
        .select("id")
        .single();

      if (createError) {
        throw createError;
      }
      user = newUser;
    } else if (userError) {
      throw userError;
    }

    // Save/update the full trend data if provided (ensures exact content is preserved)
    if (trendData && subscribed) {
      // Only save/update trend data when subscribing (not unsubscribing)
      const trendToSave = {
        id: trendData.id || trendId,
        title: trendData.title || `Trend ${trendId}`,
        category: trendData.category || "General",
        probability: trendData.probability ?? 50,
        summary: trendData.summary || "Trend subscription",
        sources: JSON.stringify(trendData.sources || []),
        timeline: JSON.stringify(trendData.timeline || []),
        similar_events: JSON.stringify(trendData.similarEvents || []),
      };

      const { error: trendError } = await supabase
        .from("trends")
        .upsert(trendToSave, {
          onConflict: "id",
          ignoreDuplicates: false,
        });

      if (trendError) {
        console.error("Error saving trend data:", trendError);
        // Continue anyway - subscription might still work
      } else {
        console.log(`Successfully saved trend data for ${trendId}: ${trendData.title}`);
      }
    } else if (!trendData && subscribed) {
      // If subscribing but no trend data provided, log a warning
      console.warn(`Subscribing to ${trendId} but no trend data provided`);
    } else {
      // If trend data not provided, check if trend exists (for backward compatibility)
      const { data: existingTrend, error: checkError } = await supabase
        .from("trends")
        .select("id")
        .eq("id", trendId)
        .single();

      if (checkError && checkError.code === "PGRST116") {
        // Trend doesn't exist - create a minimal placeholder
        const { error: insertError } = await supabase
          .from("trends")
          .insert({
            id: trendId,
            title: `Trend ${trendId}`,
            category: "General",
            probability: 50,
            summary: "Trend subscription",
            sources: "[]",
            timeline: "[]",
            similar_events: "[]",
          });

        if (insertError) {
          console.warn("Trend insert error (non-critical):", insertError);
        }
      } else if (checkError) {
        console.warn("Trend check error (non-critical):", checkError);
      }
    }

    // Upsert subscription
    const { data, error } = await supabase
      .from("subscriptions")
      .upsert(
        {
          user_id: user.id,
          trend_id: trendId,
          subscribed: subscribed ?? true,
          threshold: threshold ?? 50,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id,trend_id",
        }
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ subscription: data });
  } catch (error) {
    console.error("Error saving subscription:", error);
    return NextResponse.json(
      { error: "Failed to save subscription" },
      { status: 500 }
    );
  }
}

