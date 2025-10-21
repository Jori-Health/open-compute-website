# Setup Instructions for Supabase Chat Storage with Model Tracking

## Quick Start

### 1. Run the SQL Migration

Go to your Supabase Dashboard → **SQL Editor** and run:

```sql
-- Copy and paste the entire contents of:
-- supabase/migrations/001_create_chats_table.sql
```

### 2. Update Environment Variables

In your `.env.local`:

```bash
# Enable chat history
ENABLE_SAVE_CHAT_HISTORY=true

# Your Supabase credentials (should already be set for auth)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. Deploy & Test

```bash
npm run dev
```

Test by:

1. Logging in as a user
2. Sending a message/query
3. Refreshing the page - your chat should still be there
4. Check Supabase Table Editor - you should see the chat saved with model info!

## What You Get

✅ **Persistent Chat History** - Chats saved to PostgreSQL  
✅ **User Ownership** - Each user only sees their chats  
✅ **Model Tracking** - Know which AI/agent was used  
✅ **Shareable Chats** - Share results with a link  
✅ **No Redis Needed** - One less service to manage

## Database Structure

Your `chats` table will have:

- User's messages and AI responses
- Which model/agent was used (e.g., "GPT-4o", "Patient Journey to FHIR")
- Timestamps, share links, and more

## Need Help?

See detailed guides:

- [`SUPABASE_MIGRATION.md`](./SUPABASE_MIGRATION.md) - Full migration guide
- [`MODEL_TRACKING.md`](./MODEL_TRACKING.md) - Model tracking details
