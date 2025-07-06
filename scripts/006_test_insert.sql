-- Step 4: Test with a welcome message
-- Run this to verify everything works

INSERT INTO messages (sender, content, expires_at) 
VALUES (
  'System', 
  'Welcome to Bobsby Chat! Messages auto-delete after 24 hours. 🔒', 
  NOW() + INTERVAL '24 hours'
);

-- Verify the insert worked
SELECT * FROM messages;
