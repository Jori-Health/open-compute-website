# Model/Agent Tracking Feature

This document explains the model/agent tracking feature added to the chat system.

## Overview

The system now tracks which AI model or agent was used to generate each chat response. This information is stored in the database and can be used for:

- Analytics on model usage
- Debugging which model produced specific outputs
- Ensuring saved chats can be properly rendered with the correct context

## What's Tracked

For each chat, the following model information is stored:

- **model_id**: The unique identifier for the model (e.g., "gpt-4o-mini", "patient-journey-to-fhir")
- **model_name**: The display name (e.g., "GPT-4o mini", "Patient Journey to FHIR")
- **model_provider**: The provider name (e.g., "OpenAI", "Jori Agents")
- **provider_id**: The provider identifier (e.g., "openai", "jori-agents")

## Database Changes

### Schema Updates

Two migration files were created:

1. **`001_create_chats_table.sql`**: Updated to include model fields in the initial table creation
2. **`002_add_model_info.sql`**: Migration for existing databases to add the new columns

### New Columns

```sql
model_id TEXT,
model_name TEXT,
model_provider TEXT,
provider_id TEXT
```

### Indexes

Indexes were added for efficient filtering:

- `idx_chats_model_id`: Filter chats by specific model
- `idx_chats_provider_id`: Filter chats by provider

## Code Changes

### Type Updates

**`lib/types/index.ts`**:

```typescript
export interface Chat {
  // ... existing fields
  modelId?: string
  modelName?: string
  modelProvider?: string
  providerId?: string
}
```

**`lib/types/supabase.ts`**:
Updated database type definitions to include the new fields.

### Data Flow

1. **Streaming Functions** (`create-tool-calling-stream.ts`, `create-manual-tool-stream.ts`):
   - Pass `modelInfo` object to `handleStreamFinish`
   - Extract from the `Model` object passed to the streaming config

2. **Stream Finish Handler** (`handle-stream-finish.ts`):
   - Accepts `modelInfo` parameter
   - Passes it to `saveChat` function

3. **Chat Actions** (`lib/actions/chat.ts`):
   - `saveChat`: Stores model info in database
   - `getChat`, `getChats`, `getChatsPage`: Retrieve model info
   - `shareChat`: Preserves model info when sharing

## Usage

### Querying Chats by Model

You can now filter chats by model in Supabase:

```sql
-- Get all chats using GPT-4o
SELECT * FROM chats WHERE model_id = 'gpt-4o';

-- Get all chats using OpenAI models
SELECT * FROM chats WHERE provider_id = 'openai';

-- Get all chats using Jori Agents
SELECT * FROM chats WHERE provider_id = 'jori-agents';
```

### Accessing Model Info in Code

```typescript
const chat = await getChat(chatId, userId)
console.log(`Chat used: ${chat.modelName} (${chat.modelProvider})`)
```

## Rendering Saved Chats

The saved chat data includes all the necessary information to render responses correctly:

1. **Messages**: Complete conversation history with tool calls and annotations
2. **Model Info**: Which model was used (for display or analytics)
3. **Data**: Any attachments like FHIR bundles, graphs, search results

The frontend `Chat` component automatically handles rendering of saved messages without needing to know which model was used, as all the data is already in the message content.

## Analytics Use Cases

With model tracking, you can now:

1. **Track Model Usage**:

   ```sql
   SELECT model_name, COUNT(*) as usage_count
   FROM chats
   GROUP BY model_name
   ORDER BY usage_count DESC;
   ```

2. **Monitor Agent Performance**:

   ```sql
   SELECT
     provider_id,
     model_id,
     COUNT(*) as total_chats,
     AVG(EXTRACT(EPOCH FROM (updated_at - created_at))) as avg_duration_seconds
   FROM chats
   GROUP BY provider_id, model_id;
   ```

3. **User Preferences**:
   ```sql
   SELECT
     user_id,
     model_name,
     COUNT(*) as times_used
   FROM chats
   GROUP BY user_id, model_name
   ORDER BY user_id, times_used DESC;
   ```

## Backward Compatibility

- Existing chats without model info will have `NULL` values for the model fields
- The system gracefully handles missing model information
- No breaking changes to existing functionality

## Migration Notes

If you already have the chats table created without model fields:

1. Run the migration `002_add_model_info.sql` in Supabase SQL Editor
2. Existing chats will have `NULL` values for model fields
3. New chats will automatically include model information

## Future Enhancements

Potential future improvements:

- Model configuration snapshot (temperature, max_tokens, etc.)
- Cost tracking per model/provider
- A/B testing different models
- Model version tracking for reproducibility
