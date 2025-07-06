-- Simple script to create messages table
-- Run this step by step in Supabase SQL Editor

-- Step 1: Create the messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb
);
