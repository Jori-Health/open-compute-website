# Simplified Model Selector - Only Jori Agents

## Changes Made

I've configured your Open Compute website to show **only** the "Patient Journey to FHIR" model from the Jori Agents section.

### Files Modified

1. **`lib/config/default-models.json`**
   - Removed all other model providers (OpenAI, Anthropic, Google, etc.)
   - Kept only the Patient Journey to FHIR model

2. **`public/config/models.json`**
   - Updated the public models file to match
   - Ensures consistency across environments

3. **`components/model-selector.tsx`**
   - Added auto-selection logic
   - The Patient Journey to FHIR model is now selected by default
   - Users don't need to manually select it on first visit

## What You'll See

### Before
- Long dropdown with dozens of models grouped by provider
- Multiple sections: OpenAI, Anthropic, Google, Groq, xAI, etc.
- User had to scroll and select the model

### After
- **Only one option**: Patient Journey to FHIR (Jori Agents)
- **Automatically selected** on first visit
- Cleaner, simpler interface
- No scrolling or searching needed

## Model Details

The remaining model configuration:

```json
{
  "id": "patient-journey-to-fhir",
  "name": "Patient Journey to FHIR",
  "provider": "Jori Agents",
  "providerId": "jori-agents",
  "enabled": true,
  "toolCallType": "native"
}
```

## How to Test

### 1. Restart the Frontend

```bash
cd /Users/bkyritz/Code/Jori/open-compute-website
npm run dev
```

### 2. Clear Browser Cookies (Optional)

To see the auto-selection in action, clear your browser cookies or open an incognito window:

```
Application → Storage → Cookies → localhost:3000 → Clear All
```

### 3. Visit the Site

```
http://localhost:3000
```

You should see:
- The model selector shows "Patient Journey to FHIR" with the Jori Agents logo
- It's already selected (no need to choose)
- The dropdown only shows this one option

## Adding More Models Later

When you're ready to add more Jori Agents models:

### Step 1: Add to `lib/config/default-models.json`

```json
{
  "models": [
    {
      "id": "patient-journey-to-fhir",
      "name": "Patient Journey to FHIR",
      "provider": "Jori Agents",
      "providerId": "jori-agents",
      "enabled": true,
      "toolCallType": "native"
    },
    {
      "id": "your-new-agent",
      "name": "Your New Agent Name",
      "provider": "Jori Agents",
      "providerId": "jori-agents",
      "enabled": true,
      "toolCallType": "native"
    }
  ]
}
```

### Step 2: Update `public/config/models.json`

Add the same model there too for consistency.

### Step 3: Create API Route

Create the corresponding API route at:
```
app/api/agents/your-new-agent/route.ts
```

### Step 4: Update Chat Router

Update `app/api/chat/route.ts` to route to your new agent:

```typescript
function getAgentEndpoint(agentId: string): string | null {
  const agentEndpoints: Record<string, string> = {
    'patient-journey-to-fhir': '/api/agents/opencompute',
    'your-new-agent': '/api/agents/your-new-agent'
  }
  return agentEndpoints[agentId] || null
}
```

## Benefits

### For Users
- ✅ Simpler interface - no confusion about which model to use
- ✅ Faster start - no need to select from a long list
- ✅ Focused experience - clear that this is for FHIR generation

### For Development
- ✅ Cleaner testing - always know which model is being used
- ✅ Better demos - streamlined user experience
- ✅ Easier to explain - "it just works"

## Technical Details

### Model Selection Logic

```typescript
// components/model-selector.tsx
useEffect(() => {
  const savedModel = getCookie('selectedModel')
  if (savedModel) {
    // Use saved model if exists
    setValue(createModelId(JSON.parse(savedModel)))
  } else if (models.length > 0) {
    // Default to first model (Patient Journey to FHIR)
    const defaultModel = models[0]
    setValue(createModelId(defaultModel))
    setCookie('selectedModel', JSON.stringify(defaultModel))
  }
}, [models])
```

### Provider Grouping

Since you only have one provider now, the dropdown will show:

```
Jori Agents
  └─ Patient Journey to FHIR
```

### Logo Display

The model selector uses the existing logo:
```
/public/providers/logos/jori-agents.svg
```

## Rollback (If Needed)

To restore all models, you can:

1. Restore the original files from git:
```bash
cd /Users/bkyritz/Code/Jori/open-compute-website
git checkout lib/config/default-models.json
git checkout public/config/models.json
git checkout components/model-selector.tsx
```

2. Or manually add back models to the JSON files

## Testing Checklist

- [ ] Frontend restarts without errors
- [ ] Model selector shows only "Patient Journey to FHIR"
- [ ] Model is auto-selected on first visit
- [ ] Clicking the model dropdown shows only Jori Agents section
- [ ] Making a request works correctly
- [ ] Graph visualization appears
- [ ] Download button works

## Next Steps

1. **Test the simplified interface**
   ```bash
   cd /Users/bkyritz/Code/Jori/open-compute-website
   npm run dev
   ```

2. **Make a test request**
   - Visit http://localhost:3000
   - Enter a patient journey
   - Confirm it uses the Patient Journey to FHIR model

3. **Verify auto-selection**
   - Clear cookies
   - Refresh page
   - Confirm model is already selected

## Screenshots Expected

### Model Selector
```
[Jori Logo] Patient Journey to FHIR  ▼
```

### Dropdown (when opened)
```
┌─────────────────────────────────┐
│ Search models...                │
├─────────────────────────────────┤
│ Jori Agents                     │
│   [Logo] Patient Journey to FHIR│
│                              ✓  │
└─────────────────────────────────┘
```

## Summary

✅ **Removed**: All other model providers (OpenAI, Anthropic, Google, Groq, xAI, DeepSeek, Fireworks, Azure, Ollama, OpenAI Compatible)

✅ **Kept**: Only Patient Journey to FHIR (Jori Agents)

✅ **Auto-selected**: The model is selected by default

✅ **Clean UI**: Simple, focused interface

Your open-compute website now has a streamlined model selector showing only your Jori Agents option! 🎉

