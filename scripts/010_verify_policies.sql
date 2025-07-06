-- Verification script to check all policies are correct
-- Run this to verify the cleanup worked

-- Check chat_rooms policies
SELECT 
  'chat_rooms' as table_name,
  policyname,
  cmd as action,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'chat_rooms'
ORDER BY policyname;

-- Check messages policies  
SELECT 
  'messages' as table_name,
  policyname,
  cmd as action,
  permissive,
  roles
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;

-- Check for any duplicate policies (should return 0 rows)
SELECT 
  tablename,
  cmd,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE tablename IN ('chat_rooms', 'messages')
  AND permissive = 'PERMISSIVE'
GROUP BY tablename, cmd
HAVING COUNT(*) > 1;
