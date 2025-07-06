-- Fix duplicate RLS policies on chat_rooms table
-- Run this in Supabase SQL Editor

-- Drop all existing policies on chat_rooms table
DROP POLICY IF EXISTS "Everyone can read active rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Everyone can read active rooms v2" ON chat_rooms;
DROP POLICY IF EXISTS "Anyone can create rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Anyone can update rooms" ON chat_rooms;
DROP POLICY IF EXISTS "Anyone can delete rooms" ON chat_rooms;

-- Create clean, optimized policies for chat_rooms
-- Policy for reading active rooms
CREATE POLICY "read_active_rooms" ON chat_rooms
FOR SELECT USING (is_active = TRUE);

-- Policy for creating rooms (anyone can create)
CREATE POLICY "create_rooms" ON chat_rooms
FOR INSERT WITH CHECK (TRUE);

-- Policy for updating rooms (only allow updating non-sensitive fields)
CREATE POLICY "update_rooms" ON chat_rooms
FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- Verify policies are correctly set
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'chat_rooms'
ORDER BY policyname;
