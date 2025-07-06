-- Step 3: Add performance indexes
-- Run this after policies are created

CREATE INDEX idx_messages_created_at ON messages(created_at);
CREATE INDEX idx_messages_expires_at ON messages(expires_at);
