-- Complete setup script for Bobsby Chat messages table
-- Run this in your Supabase SQL Editor

-- Drop existing policies and functions if they exist to allow re-running the script
DROP POLICY IF EXISTS "Everyone can read messages" ON messages;
DROP POLICY IF EXISTS "Anyone can create messages" ON messages;
DROP POLICY IF EXISTS "Anyone can update messages for reactions" ON messages;
DROP FUNCTION IF EXISTS delete_expired_messages();

-- Drop table if it exists (uncomment next line if you want to start fresh)
-- DROP TABLE IF EXISTS messages;

-- Create messages table for Bobsby Chat
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb
);

-- Enable Row Level Security (RLS)
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Policy for read access (everyone can read messages)
CREATE POLICY "Everyone can read messages" ON messages
FOR SELECT USING (TRUE);

-- Policy for insert access (anyone can create messages)
CREATE POLICY "Anyone can create messages" ON messages
FOR INSERT WITH CHECK (TRUE);

-- Policy for update access (for message reactions)
CREATE POLICY "Anyone can update messages for reactions" ON messages
FOR UPDATE USING (TRUE);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);

-- Function to automatically delete expired messages
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM messages WHERE expires_at < NOW();
  RETURN NULL;
END;
$$;

-- Insert a welcome message to test the table
INSERT INTO messages (sender, content, expires_at) 
VALUES (
  'System', 
  'Welcome to Bobsby Chat! Messages auto-delete after 24 hours for privacy. 🔒', 
  NOW() + INTERVAL '24 hours'
);

-- Verify the table was created successfully
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'messages' 
ORDER BY ordinal_position;
