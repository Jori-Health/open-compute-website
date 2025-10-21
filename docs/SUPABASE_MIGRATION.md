# Supabase Database Migration Guide

This guide explains how to set up Supabase PostgreSQL for chat history storage, replacing Redis.

## Overview

This migration replaces Redis with Supabase PostgreSQL for storing:

- Chat history
- Chat messages
- User ownership of chats
- Shared chat links
- **Model/Agent tracking** (which AI model was used for each response)

## Step 1: Run the Database Migration

### Option A: Using Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy and paste the contents of `supabase/migrations/001_create_chats_table.sql`
5. Click **Run** to execute the migration

### Option B: Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# Link to your project (if not already linked)
supabase link --project-ref your-project-ref

# Run the migration
supabase db push
```

## Step 2: Update Environment Variables

Update your `.env.local` file:

```bash
# Enable chat history saving
ENABLE_SAVE_CHAT_HISTORY=true

# Supabase credentials (you should already have these for auth)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# You can now REMOVE these Redis variables:
# USE_LOCAL_REDIS=false
# UPSTASH_REDIS_REST_URL=
# UPSTASH_REDIS_REST_TOKEN=
# LOCAL_REDIS_URL=
```

## Step 3: Verify the Setup

### Check Database Tables

1. Go to Supabase Dashboard → **Table Editor**
2. You should see a `chats` table with the following columns:
   - `id` (text, primary key)
   - `title` (text)
   - `user_id` (uuid, foreign key to auth.users)
   - `path` (text)
   - `messages` (jsonb)
   - `share_path` (text, nullable)
   - **`model_id` (text, nullable)** - Which model was used
   - **`model_name` (text, nullable)** - Display name of the model
   - **`model_provider` (text, nullable)** - Provider name (e.g., "OpenAI", "Jori Agents")
   - **`provider_id` (text, nullable)** - Provider ID (e.g., "openai", "jori-agents")
   - `created_at` (timestamp)
   - `updated_at` (timestamp)

### Check Row Level Security (RLS)

1. Go to Supabase Dashboard → **Table Editor** → `chats` table
2. Click on **RLS is enabled** indicator
3. You should see the following policies:
   - "Users can view their own chats"
   - "Users can insert their own chats"
   - "Users can update their own chats"
   - "Users can delete their own chats"
   - "Anyone can view shared chats"

## What Changed

### Database Schema

- **Table**: `chats`
- **Indexes**: On `user_id`, `created_at`, `share_path`, `model_id`, and `provider_id`
- **RLS Policies**: Ensure users can only access their own chats (unless shared)
- **Trigger**: Automatically updates `updated_at` timestamp
- **Model Tracking**: Stores which AI model/agent was used for each chat

### Code Changes

1. **`lib/actions/chat.ts`**: Completely rewritten to use Supabase instead of Redis
2. **`lib/types/supabase.ts`**: New file with TypeScript types for the database
3. **`lib/types/index.ts`**: Updated Chat interface to include model tracking fields
4. **`lib/streaming/handle-stream-finish.ts`**: Updated to save model information
5. **`lib/streaming/create-tool-calling-stream.ts`**: Passes model info to handler
6. **`lib/streaming/create-manual-tool-stream.ts`**: Passes model info to handler
7. **API routes**: Already compatible, no changes needed

### Features

✅ **User Ownership**: Chats are now owned by user accounts  
✅ **Row Level Security**: Users can only see/edit their own chats  
✅ **Shared Chats**: Anyone with the link can view shared chats  
✅ **Model Tracking**: Know which AI model/agent was used for each response  
✅ **Better Queries**: Use SQL for more advanced filtering/sorting  
✅ **Built-in Backups**: Supabase handles backups automatically  
✅ **No Redis Required**: One less service to manage

For more details on model tracking, see [`MODEL_TRACKING.md`](./MODEL_TRACKING.md).

## Migration Notes

### Anonymous Users

- Anonymous users (`user_id = 'anonymous'`) cannot save chats in the new system
- This is by design for security and data integrity
- Users must be logged in to save chat history

### Existing Redis Data

If you had data in Redis, it will **not** be automatically migrated. Options:

1. **Fresh start**: Users start with empty chat history (recommended)
2. **Manual migration**: Export from Redis and import to Supabase (requires custom script)

## Troubleshooting

### "Cannot save chats for anonymous user" error

This is expected. Users must be logged in to save chats. Ensure:

- Supabase Auth is properly configured
- Users are authenticated before attempting to save chats

### RLS Policy violations

If users can't see their chats:

1. Check that the user is properly authenticated
2. Verify the `user_id` column matches `auth.uid()`
3. Check the RLS policies are enabled

### Migration fails

If the migration fails, check:

1. You have proper permissions in Supabase
2. The `auth.users` table exists (it should by default)
3. There are no naming conflicts with existing tables

## Testing

After setup, test the following:

1. **Create a chat**: Send a message and verify it's saved
2. **View chat history**: Refresh the page and check the sidebar
3. **Share a chat**: Click share and verify the link works
4. **Delete a chat**: Remove a chat and verify it's gone
5. **User isolation**: Log in as different users and verify they only see their own chats

## Need Help?

If you encounter issues:

1. Check the Supabase Dashboard logs
2. Check browser console for errors
3. Check server logs for API errors
