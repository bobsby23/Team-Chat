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

-- Policy for read access (everyone can read)
CREATE POLICY "Everyone can read messages" ON messages
FOR SELECT USING (TRUE);

-- Policy for insert access (authenticated users can insert)
-- For this simple app, we'll allow anyone to insert for now,
-- but in a real app, you'd check auth.uid()
CREATE POLICY "Anyone can create messages" ON messages
FOR INSERT WITH CHECK (TRUE);

-- Policy for update access (for reactions)
CREATE POLICY "Anyone can update messages for reactions" ON messages
FOR UPDATE USING (TRUE);

-- Optional: Add an index for faster lookups by created_at
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- Optional: Add an index for faster cleanup of expired messages
CREATE INDEX IF NOT EXISTS idx_messages_expires_at ON messages(expires_at);

-- Optional: Function to delete expired messages (can be run by a cron job)
CREATE OR REPLACE FUNCTION delete_expired_messages()
RETURNS TRIGGER LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM messages WHERE expires_at < NOW();
  RETURN NULL;
END;
$$;

-- Optional: Trigger to run cleanup after every insert (for small scale)
-- For high traffic, a separate cron job is better.
-- CREATE TRIGGER cleanup_messages_after_insert
-- AFTER INSERT ON messages
-- FOR EACH STATEMENT EXECUTE FUNCTION delete_expired_messages();

-- Optional: Realtime setup (enable for 'messages' table in Supabase UI)
-- This will automatically broadcast changes to subscribed clients.
-- Go to Database -> Realtime -> Enable Realtime for 'messages' table
-- Ensure 'INSERT', 'UPDATE', 'DELETE' events are enabled.
