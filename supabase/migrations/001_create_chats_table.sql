-- Create chats table
CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  messages JSONB NOT NULL DEFAULT '[]'::jsonb,
  share_path TEXT,
  model_id TEXT,
  model_name TEXT,
  model_provider TEXT,
  provider_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index on user_id for faster queries
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);

-- Create index on share_path for shared chats lookup
CREATE INDEX IF NOT EXISTS idx_chats_share_path ON chats(share_path) WHERE share_path IS NOT NULL;

-- Create index on model_id for filtering by model
CREATE INDEX IF NOT EXISTS idx_chats_model_id ON chats(model_id);

-- Create index on provider_id for filtering by provider
CREATE INDEX IF NOT EXISTS idx_chats_provider_id ON chats(provider_id);

-- Enable Row Level Security
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own chats
CREATE POLICY "Users can view their own chats"
  ON chats
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own chats
CREATE POLICY "Users can insert their own chats"
  ON chats
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own chats
CREATE POLICY "Users can update their own chats"
  ON chats
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own chats
CREATE POLICY "Users can delete their own chats"
  ON chats
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Anyone can view shared chats
CREATE POLICY "Anyone can view shared chats"
  ON chats
  FOR SELECT
  USING (share_path IS NOT NULL);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_chats_updated_at
  BEFORE UPDATE ON chats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

