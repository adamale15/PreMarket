-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (linked to Clerk user IDs)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  interests TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trends table (stores fetched trends from news)
CREATE TABLE IF NOT EXISTS trends (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  probability INTEGER NOT NULL CHECK (probability >= 0 AND probability <= 100),
  summary TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::jsonb,
  timeline JSONB DEFAULT '[]'::jsonb,
  similar_events JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User subscriptions table (user subscriptions to trends)
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trend_id TEXT NOT NULL REFERENCES trends(id) ON DELETE CASCADE,
  threshold INTEGER DEFAULT 50 CHECK (threshold >= 0 AND threshold <= 100),
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, trend_id)
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX IF NOT EXISTS idx_trends_category ON trends(category);
CREATE INDEX IF NOT EXISTS idx_trends_created_at ON trends(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_trend_id ON subscriptions(trend_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_subscribed ON subscriptions(subscribed) WHERE subscribed = true;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to auto-update updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_trends_updated_at BEFORE UPDATE ON trends
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) policies
-- Note: Since we're using Clerk for auth (not Supabase Auth), 
-- authentication is handled server-side in API routes.
-- RLS is enabled but policies may need adjustment if using Supabase client directly.
-- For now, API routes handle auth via Clerk server-side.

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Trends are publicly readable (no auth needed)
CREATE POLICY "Trends are publicly readable" ON trends
  FOR SELECT USING (true);

-- Trends can be inserted/updated by anyone (auth handled in API routes)
CREATE POLICY "Trends are publicly writable" ON trends
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Trends are publicly updatable" ON trends
  FOR UPDATE USING (true) WITH CHECK (true);

-- For users and subscriptions, we rely on API route authentication
-- If you want to use Supabase client directly, you'll need to:
-- 1. Set up Clerk-Supabase JWT integration, OR
-- 2. Disable RLS and handle auth in API routes only (current approach)

-- Temporary: Allow all operations (auth handled in API routes)
-- Remove these if you set up proper Clerk-Supabase JWT integration
CREATE POLICY "Allow all users operations" ON users
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all subscriptions operations" ON subscriptions
  FOR ALL USING (true) WITH CHECK (true);

