-- Enhanced database schema for public and private chat rooms
-- Run this in Supabase SQL Editor

-- Create chat_rooms table
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('public', 'private')),
  invite_code TEXT UNIQUE,
  encryption_key TEXT, -- For private rooms
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- Optional expiry for private rooms
  max_participants INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE
);

-- Update messages table to include room_id
ALTER TABLE messages ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES chat_rooms(id) ON DELETE CASCADE;

-- Create default public room
INSERT INTO chat_rooms (name, type, invite_code) 
VALUES ('Public Chat', 'public', 'public')
ON CONFLICT (invite_code) DO NOTHING;

-- Update existing messages to belong to public room
UPDATE messages 
SET room_id = (SELECT id FROM chat_rooms WHERE invite_code = 'public')
WHERE room_id IS NULL;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_chat_rooms_invite_code ON chat_rooms(invite_code);
CREATE INDEX IF NOT EXISTS idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id);

-- RLS policies for chat_rooms
ALTER TABLE chat_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can read active rooms" ON chat_rooms
FOR SELECT USING (is_active = TRUE);

CREATE POLICY "Anyone can create rooms" ON chat_rooms
FOR INSERT WITH CHECK (TRUE);

-- Update messages policies to include room-based access
DROP POLICY IF EXISTS "Everyone can read messages" ON messages;
CREATE POLICY "Everyone can read messages in active rooms" ON messages
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM chat_rooms 
    WHERE chat_rooms.id = messages.room_id 
    AND chat_rooms.is_active = TRUE
  )
);
