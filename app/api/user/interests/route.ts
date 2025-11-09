import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { supabase } from "@/lib/supabase";

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ interests: [] }, { status: 200 });
    }

    // Get or create user in Supabase
    let { data: user, error: userError } = await supabase
      .from("users")
      .select("interests")
      .eq("clerk_user_id", userId)
      .single();

    if (userError && userError.code === "PGRST116") {
      // User doesn't exist, create one
      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({ clerk_user_id: userId, interests: [] })
        .select("interests")
        .single();

      if (createError) {
        throw createError;
      }

      return NextResponse.json({ interests: newUser.interests || [] });
    }

    if (userError) {
      throw userError;
    }

    return NextResponse.json({ interests: user?.interests || [] });
  } catch (error) {
    console.error("Error fetching user interests:", error);
    return NextResponse.json(
      { error: "Failed to fetch interests" },
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

    const { interests } = await request.json();

    if (!Array.isArray(interests)) {
      return NextResponse.json(
        { error: "Interests must be an array" },
        { status: 400 }
      );
    }

    // Upsert user interests
    const { data, error } = await supabase
      .from("users")
      .upsert(
        {
          clerk_user_id: userId,
          interests,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "clerk_user_id",
        }
      )
      .select("interests")
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ interests: data?.interests || [] });
  } catch (error) {
    console.error("Error saving user interests:", error);
    return NextResponse.json(
      { error: "Failed to save interests" },
      { status: 500 }
    );
  }
}

