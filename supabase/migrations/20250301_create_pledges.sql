-- Create pledges table
CREATE TABLE IF NOT EXISTS pledges (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL CHECK (type IN ('durood', 'zikr')),
  subtype TEXT,
  count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;

-- Create Policies
CREATE POLICY "Users can insert their own pledges" 
ON pledges FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own pledges" 
ON pledges FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "Everyone can view all pledges (for leaderboard)" 
ON pledges FOR SELECT 
TO anon, authenticated
USING (true);

-- Optional: Create a view for easier leaderboard aggregation
CREATE OR REPLACE VIEW pledge_leaderboard_view AS
SELECT 
  user_id, 
  type, 
  SUM(count) as total_count
FROM pledges
GROUP BY user_id, type;

-- Grant access to the view
GRANT SELECT ON pledge_leaderboard_view TO anon, authenticated;
