-- Add migration to add model/agent information to chats table
ALTER TABLE chats ADD COLUMN IF NOT EXISTS model_id TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS model_name TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS model_provider TEXT;
ALTER TABLE chats ADD COLUMN IF NOT EXISTS provider_id TEXT;

-- Create index on model_id for filtering by model
CREATE INDEX IF NOT EXISTS idx_chats_model_id ON chats(model_id);

-- Create index on provider_id for filtering by provider
CREATE INDEX IF NOT EXISTS idx_chats_provider_id ON chats(provider_id);

