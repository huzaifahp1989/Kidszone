-- ============================================================================
-- FIX 24-HOUR QUIZ BLOCKING - FOR EXISTING QUIZ ATTEMPTS
-- ============================================================================
-- This SQL ensures that:
-- 1. Existing quiz_attempts have completed_at timestamp
-- 2. Users are locked for 24 hours after completing a quiz
-- 3. Verify locks are working

-- ============================================================================
-- STEP 1: Add completed_at column if it doesn't exist
-- ============================================================================

ALTER TABLE quiz_attempts 
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================================================
-- STEP 2: Check current state
-- ============================================================================

-- See how many attempts exist
SELECT COUNT(*) as total_attempts FROM quiz_attempts;

-- See how many have NULL completed_at
SELECT COUNT(*) as attempts_without_completed_at 
FROM quiz_attempts 
WHERE completed_at IS NULL;

-- ============================================================================
-- STEP 3: Populate completed_at for existing attempts
-- ============================================================================

-- If created_at exists, use it. Otherwise use NOW()
UPDATE quiz_attempts 
SET completed_at = COALESCE(created_at, NOW())
WHERE completed_at IS NULL;

-- Verify all have completed_at now
SELECT COUNT(*) as attempts_with_completed_at 
FROM quiz_attempts 
WHERE completed_at IS NOT NULL;

-- ============================================================================
-- STEP 4: Check who is currently locked (24-hour rule)
-- ============================================================================

-- Show all users who completed a quiz in the last 24 hours
SELECT 
  user_id,
  COUNT(*) as attempts_last_24hrs,
  MAX(completed_at) as last_attempt_time,
  (MAX(completed_at) + INTERVAL '24 hours') as can_retry_at,
  (MAX(completed_at) + INTERVAL '24 hours' - NOW()) as time_until_unlock
FROM quiz_attempts
WHERE completed_at >= NOW() - INTERVAL '24 hours'
GROUP BY user_id
ORDER BY can_retry_at DESC;

-- ============================================================================
-- STEP 5: See all recent attempts (last 7 days)
-- ============================================================================

SELECT 
  DATE(completed_at) as date,
  COUNT(*) as attempts,
  COUNT(DISTINCT user_id) as unique_users
FROM quiz_attempts
WHERE completed_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(completed_at)
ORDER BY date DESC;

-- ============================================================================
-- STEP 6: Create helper function to check lock status
-- ============================================================================

DROP FUNCTION IF EXISTS check_quiz_24hr_lock(UUID);

CREATE OR REPLACE FUNCTION check_quiz_24hr_lock(p_user_id UUID)
RETURNS TABLE (
  is_locked BOOLEAN,
  locked_until TIMESTAMP WITH TIME ZONE,
  last_score INT,
  last_attempt_at TIMESTAMP WITH TIME ZONE,
  time_remaining INTERVAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (NOW() < MAX(qa.completed_at) + INTERVAL '24 hours')::BOOLEAN as is_locked,
    (MAX(qa.completed_at) + INTERVAL '24 hours')::TIMESTAMP WITH TIME ZONE as locked_until,
    MAX(qa.score)::int as last_score,
    MAX(qa.completed_at)::TIMESTAMP WITH TIME ZONE as last_attempt_at,
    (MAX(qa.completed_at) + INTERVAL '24 hours' - NOW())::INTERVAL as time_remaining
  FROM quiz_attempts qa
  WHERE qa.user_id = p_user_id
    AND qa.completed_at >= NOW() - INTERVAL '24 hours'
  GROUP BY qa.user_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Test: SELECT * FROM check_quiz_24hr_lock('user-id-here');

-- ============================================================================
-- STEP 7: View for monitoring all locked users
-- ============================================================================

DROP VIEW IF EXISTS quiz_locked_users CASCADE;

CREATE OR REPLACE VIEW quiz_locked_users AS
SELECT 
  qa.user_id,
  qa.score as last_score,
  qa.completed_at as last_attempt_at,
  (qa.completed_at + INTERVAL '24 hours') as unlock_time,
  (qa.completed_at + INTERVAL '24 hours' - NOW()) as time_remaining,
  CASE 
    WHEN NOW() < qa.completed_at + INTERVAL '24 hours' THEN 'LOCKED'
    ELSE 'UNLOCKED'
  END as status
FROM quiz_attempts qa
WHERE qa.completed_at >= NOW() - INTERVAL '24 hours'
ORDER BY qa.completed_at DESC;

-- ============================================================================
-- STEP 8: Final verification - all stats
-- ============================================================================

SELECT 
  COUNT(*) as total_attempts,
  COUNT(DISTINCT user_id) as total_users,
  COUNT(CASE WHEN completed_at IS NOT NULL THEN 1 END) as with_timestamp,
  COUNT(CASE WHEN completed_at IS NULL THEN 1 END) as without_timestamp
FROM quiz_attempts;

-- ============================================================================
-- END OF SQL FIX
-- ============================================================================
