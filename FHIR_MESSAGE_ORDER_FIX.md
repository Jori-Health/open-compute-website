# FHIR Rendering Fix - Message Order Issue

## Critical Bug Found and Fixed

The FHIR metadata was being saved to the database correctly, but **in the wrong order**, preventing it from being loaded when viewing saved chats.

## The Problem

### How `convertToUIMessages` Works

```typescript
// convertToUIMessages processes messages sequentially:
1. Encounters 'data' role → Adds to pendingAnnotations
2. Encounters 'assistant' role → Attaches pendingAnnotations and clears
3. Any data messages AFTER assistant messages are lost!
```

### Original Broken Code

```typescript
// In app/api/agents/opencompute/route.ts
const updatedMessages = [
  ...coreMessages,           // [user message]
  ...result.response.messages // [assistant message]
]

// ❌ WRONG: Added AFTER assistant message
updatedMessages.push({
  role: 'data',
  content: { type: 'fhir-metadata', ... }
})

// Result: [user, assistant, data]
//         convertToUIMessages processes assistant,
//         then clears pendingAnnotations,
//         then sees data but has nowhere to attach it!
```

### Message Flow Diagram

**BROKEN:**

```
Database → [user, assistant, data]
           ↓
convertToUIMessages:
  - Process user → add to messages
  - Process assistant → attach pendingAnnotations (empty), clear
  - Process data → add to pendingAnnotations
  - No more assistant messages → annotations lost!
           ↓
UI Messages → [user, assistant] (no annotations ❌)
```

**FIXED:**

```
Database → [user, data, assistant]
           ↓
convertToUIMessages:
  - Process user → add to messages
  - Process data → add to pendingAnnotations
  - Process assistant → attach pendingAnnotations ✅, clear
           ↓
UI Messages → [user, assistant with annotations ✅]
```

## The Fix

### Updated Code

```typescript
// In app/api/agents/opencompute/route.ts
const updatedMessages = [...coreMessages, ...result.response.messages]

// ✅ FIXED: Insert BEFORE the last assistant message
if (fhirResult.bundle_json || fhirResult.graph_data) {
  const lastAssistantIndex = updatedMessages.length - 1

  const dataMessage = {
    role: 'data',
    content: {
      type: 'fhir-metadata',
      bundleJson: fhirResult.bundle_json,
      graphData: fhirResult.graph_data,
      patientId: journeyData.patient_id
    }
  } as any

  // Insert BEFORE assistant message
  updatedMessages.splice(lastAssistantIndex, 0, dataMessage)
}

// Result: [user, data, assistant] ✅
```

## Additional Debugging

Added comprehensive logging in `app/search/[id]/page.tsx` to track message loading:

```typescript
// Log raw messages from database
console.log('🔍 [SearchPage] Raw messages from DB:', chat?.messages?.length)
chat.messages.forEach((msg, idx) => {
  console.log(`🔍 [SearchPage] Message ${idx}:`, {
    role: msg.role,
    contentType: typeof msg.content,
    hasType: msg.content?.type
  })
})

// Log converted UI messages
console.log('🔍 [SearchPage] Converted UI messages:', messages.length)
messages.forEach((msg, idx) => {
  console.log(`🔍 [SearchPage] UI Message ${idx}:`, {
    role: msg.role,
    hasAnnotations: !!msg.annotations,
    annotationCount: msg.annotations?.length,
    annotationTypes: msg.annotations?.map(a => a.type)
  })
})
```

## Why This Happened

1. **Initial Implementation**: During streaming, `data.append()` sends data to the frontend immediately, so order doesn't matter
2. **Database Save**: Messages are saved in the order they're added to the array
3. **Database Load**: `convertToUIMessages` expects data messages BEFORE the assistant messages they annotate
4. **The Bug**: We were appending data messages after assistant messages

## Testing

### Before Fix

```bash
# Navigate to saved chat
Console shows:
🔍 [SearchPage] Message 0: {role: 'user', ...}
🔍 [SearchPage] Message 1: {role: 'assistant', ...}
🔍 [SearchPage] Message 2: {role: 'data', hasType: 'fhir-metadata'}  ❌ WRONG ORDER
🔍 [SearchPage] UI Message 0: {role: 'user', ...}
🔍 [SearchPage] UI Message 1: {role: 'assistant', annotationTypes: []}  ❌ NO ANNOTATIONS
```

### After Fix

```bash
# Navigate to saved chat
Console shows:
🔍 [SearchPage] Message 0: {role: 'user', ...}
🔍 [SearchPage] Message 1: {role: 'data', hasType: 'fhir-metadata'}  ✅ CORRECT ORDER
🔍 [SearchPage] Message 2: {role: 'assistant', ...}
🔍 [SearchPage] UI Message 0: {role: 'user', ...}
🔍 [SearchPage] UI Message 1: {role: 'assistant', annotationTypes: ['fhir-metadata']}  ✅ HAS ANNOTATIONS
[RenderMessage] Combined data: [{type: 'fhir-metadata', ...}]  ✅
[FHIRAttachments] Rendering components...  ✅
```

## Files Modified

1. **`app/api/agents/opencompute/route.ts`** ⭐ **CRITICAL FIX**
   - Changed from `updatedMessages.push()` to `updatedMessages.splice()`
   - Insert data message BEFORE assistant message
   - Added logging

2. **`app/search/[id]/page.tsx`**
   - Added comprehensive logging for raw and converted messages
   - Helps debug message order issues

3. **`lib/utils/index.ts`** (from previous fix)
   - Fixed to handle flat annotation structures
   - Added logging

4. **`components/render-message.tsx`** (from previous fix)
   - Merges streaming data with annotations
   - Added logging

## Important Notes

### For Future Agents

When saving data annotations to the database:

```typescript
// ❌ WRONG: After assistant message
updatedMessages.push({ role: 'data', content: {...} })

// ✅ CORRECT: Before assistant message
const lastAssistantIndex = updatedMessages.length - 1
updatedMessages.splice(lastAssistantIndex, 0, { role: 'data', content: {...} })
```

### General Pattern

```typescript
// Always insert data messages BEFORE the message they annotate
const messages = [user, assistant]

// To annotate the assistant message:
messages.splice(1, 0, dataMessage) // Insert at index 1 (before assistant)

// Result: [user, data, assistant] ✅
```

## Deployment

1. ✅ Deploy changes to Vercel
2. ✅ Create a NEW patient journey query (message order will be correct)
3. ✅ Navigate to the saved chat - should see graph and download button
4. ⚠️ OLD saved chats (before this fix) will still have wrong order and won't render FHIR data
   - Option 1: Accept this and let users re-generate
   - Option 2: Write a migration script to reorder messages in database

## Related Files

- `app/api/agents/opencompute/route.ts` - Message saving logic
- `app/search/[id]/page.tsx` - Message loading logic
- `lib/utils/index.ts` - Message conversion logic
- `components/render-message.tsx` - Annotation merging logic
- `FHIR_SAVED_CHATS_FIX.md` - Previous fix documentation
