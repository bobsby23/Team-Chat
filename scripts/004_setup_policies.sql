-- Step 2: Enable RLS and create policies
-- Run this after the table is created

-- Enable Row Level Security
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read messages
CREATE POLICY "Everyone can read messages" ON messages
FOR SELECT USING (TRUE);

-- Allow anyone to insert messages
CREATE POLICY "Anyone can create messages" ON messages
FOR INSERT WITH CHECK (TRUE);

-- Allow anyone to update messages (for reactions)
CREATE POLICY "Anyone can update messages for reactions" ON messages
FOR UPDATE USING (TRUE);
