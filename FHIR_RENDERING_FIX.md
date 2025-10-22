# FHIR Rendering Fix for Production

## Problem Summary

The Patient Journey to FHIR feature was successfully generating FHIR resources on the backend and saving them to the database, but the FHIR graph and download buttons were not rendering in the frontend on production. The feature worked locally but not on Vercel (Next.js) + Azure Web App (data warehouse).

### Backend Logs Showed Success

```
✅ Chat saved successfully to Supabase with FHIR metadata
✅ FHIR bundle saved to storage: fhir-bundles/...
Sending FHIR metadata: bundle: true graph: true
```

### Two Main Issues Identified

#### Issue 1: Initial Rendering During Streaming

When a new query is made, the FHIR metadata is sent via `StreamData.append()` but wasn't rendering correctly in the frontend.

**Root Cause**: The data was being sent correctly from the backend, but we needed better logging and error handling to identify any parsing or rendering issues.

#### Issue 2: Saved Messages Not Rendering FHIR Data

When viewing a past chat from history, the FHIR metadata was saved in the database but wasn't being displayed.

**Root Cause**: The `data` array from the `useChat` hook only contains streaming data. When loading saved messages from the database:

1. Messages are loaded with their `annotations` property containing the FHIR metadata
2. The `data` array remains empty (no streaming happening)
3. Components were only checking the `data` array, not message `annotations`

### Data Flow

#### During Streaming (New Query)

```
Backend → StreamData.append({ type: 'fhir-metadata', ... })
         ↓
Frontend useChat hook → data array
         ↓
RenderMessage → AnswerSection → FHIRAttachments
```

#### Loading Saved Messages

```
Database → getChat() → convertToUIMessages()
         ↓
Messages with annotations property
         ↓
useChat hook (savedMessages) → data array is EMPTY
         ↓
RenderMessage needs to merge annotations + data
         ↓
AnswerSection → FHIRAttachments
```

## Solution

### 1. Enhanced Logging

Added comprehensive logging throughout the rendering pipeline:

- `chat.tsx`: Log when data is received from streaming
- `render-message.tsx`: Log combined data from annotations + streaming
- `answer-section.tsx`: Log when FHIR metadata is found
- `fhir-attachments.tsx`: Log each rendering stage
- `fhir-attachments.tsx` components: Log graph, download, and viewer rendering

### 2. Merge Streaming Data with Message Annotations

Updated `render-message.tsx` to combine both sources of FHIR metadata:

```typescript
const combinedData = useMemo(() => {
  const result = [...(data || [])]

  // Add message annotations (from saved messages) if not already in data
  if (message.annotations) {
    message.annotations.forEach(annotation => {
      const annotationType = (annotation as any)?.type
      // Only add non-related-questions annotations if not already in data
      if (
        annotationType &&
        annotationType !== 'related-questions' &&
        !result.some((item: any) => item?.type === annotationType)
      ) {
        result.push(annotation as JSONValue)
      }
    })
  }

  return result
}, [data, message.annotations])
```

### 3. Improved Error Handling

- Added try-catch blocks in download handlers
- Added loading and error states for graph rendering
- Handle both string and object types for bundle JSON
- Show error messages when parsing fails

### 4. Better Type Handling

Updated `FHIRRawDataViewer` to handle bundle JSON being either a string or object:

```typescript
if (typeof bundleJson === 'object') {
  setParsedBundle(bundleJson)
} else if (typeof bundleJson === 'string') {
  const parsed = JSON.parse(bundleJson)
  setParsedBundle(parsed)
}
```

## Files Modified

1. **`components/chat.tsx`**
   - Uncommented and enhanced logging for data received from backend
   - Added type checking for bundle JSON

2. **`components/render-message.tsx`**
   - Added `combinedData` logic to merge streaming data with message annotations
   - Updated AnswerSection to use `combinedData` instead of just `data`
   - Added debug logging

3. **`components/answer-section.tsx`**
   - Added logging to track when FHIR metadata is received
   - Updated comment to clarify dual source of data

4. **`components/fhir-attachments.tsx`**
   - Added comprehensive logging to all rendering stages
   - Improved error handling in `FHIRRawDataViewer`
   - Added loading and error states with visual feedback
   - Handle both string and object types for bundle JSON
   - Enhanced download handler with try-catch

## Testing Checklist

### New Queries

- [ ] Submit a new patient journey query
- [ ] Verify backend logs show FHIR metadata being sent
- [ ] Verify frontend console shows data being received
- [ ] Verify FHIR graph renders correctly
- [ ] Verify download button works
- [ ] Verify raw data viewer expands and shows JSON

### Saved Queries

- [ ] Navigate to a past chat with FHIR data
- [ ] Verify frontend console shows annotations being merged
- [ ] Verify FHIR graph renders from saved data
- [ ] Verify download button works with saved data
- [ ] Verify raw data viewer shows saved JSON

### Production Environment

- [ ] Deploy to Vercel
- [ ] Test new queries on production
- [ ] Test loading saved chats on production
- [ ] Check browser console for any errors
- [ ] Verify all logging appears in Vercel logs

## Debug Commands

### Check Frontend Console

Look for these log prefixes:

- `[FRONTEND RECEIVED DATA - Patient Journey to FHIR]`
- `[RenderMessage] Combined data:`
- `[AnswerSection] FHIR metadata found:`
- `[FHIRAttachments] Metadata received:`
- `[FHIRGraph] Rendering graph component`
- `[FHIRDownloadButton] Rendering download button`
- `[FHIRRawDataViewer] Attempting to parse bundle JSON`

### Check Backend Logs (Vercel)

Look for:

- `RAW BACKEND RESPONSE - Patient Journey to FHIR`
- `Sending FHIR metadata: bundle: true graph: true`
- `✅ Chat saved successfully to Supabase with FHIR metadata`

### Check Database

Query Supabase to verify messages are saved with annotations:

```sql
SELECT id, title, messages FROM chats WHERE model_id = 'patient-journey-to-fhir' ORDER BY created_at DESC LIMIT 5;
```

Look for messages with role='data' and content containing `type: 'fhir-metadata'`

## Next Steps

1. Deploy these changes to production
2. Test both new queries and loading saved chats
3. Monitor console logs to identify any remaining issues
4. Once confirmed working, remove excessive debug logging
5. Consider adding user-facing error messages if FHIR rendering fails

## Related Documentation

- `docs/PATIENT_JOURNEY_TO_FHIR.md` - Feature documentation
- `app/api/agents/opencompute/route.ts` - Backend API endpoint
- `lib/utils/index.ts` - `convertToUIMessages` function
