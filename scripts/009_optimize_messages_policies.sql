-- Also optimize messages table policies to prevent future duplicates
-- Run this after the chat_rooms policies are fixed

-- Drop existing policies on messages table
DROP POLICY IF EXISTS "Everyone can read messages" ON messages;
DROP POLICY IF EXISTS "Everyone can read messages in active rooms" ON messages;
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages for reactions" ON messages;

-- Create optimized policies for messages
-- Policy for reading messages (only in active rooms)
CREATE POLICY "read_messages_in_active_rooms" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = messages.room_id 
    AND chat_rooms.is_active = TRUE
  )
);

-- Policy for creating messages (anyone can create in active rooms)
CREATE POLICY "create_messages" ON messages
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = messages.room_id 
    AND chat_rooms.is_active = TRUE
  )
);

-- Policy for updating messages (for reactions only)
CREATE POLICY "update_message_reactions" ON messages
FOR UPDATE USING (TRUE) WITH CHECK (TRUE);

-- Verify messages policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'messages'
ORDER BY policyname;
