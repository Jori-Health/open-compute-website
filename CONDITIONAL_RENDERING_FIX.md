# Conditional FHIR Attachments Rendering

## ✅ What Was Fixed

### Problem

The graph and download button were **always being sent** to the frontend, even when:

- FHIR generation failed
- No resources were generated
- The journey extraction was incomplete

This could have resulted in:

- Empty graph rendering attempts
- Download buttons with no data
- Confusing UI when generation fails

### Solution

Added **conditional checks** at multiple levels to ensure attachments only render when valid data exists.

## 🔧 Changes Made

### 1. **Backend Already Handles This Correctly** ✅

The backend (`data-warehouse/app/routes/opencompute.py`) already only generates metadata when resources exist:

```python
# Generate FHIR Bundle JSON for download
bundle_json = None
if result.generated_resources:  # ← Only if resources exist
    bundle = {
        "resourceType": "Bundle",
        # ...
    }
    bundle_json = json.dumps(bundle, indent=2)

# Generate graph visualization data
graph_data = None
if result.generated_resources:  # ← Only if resources exist
    graph_data = generate_fhir_graph(result.generated_resources)
```

### 2. **Frontend API Route** (`app/api/agents/opencompute/route.ts`)

Added conditional check before appending metadata to stream:

```typescript
// Only append FHIR metadata if we have actual data to show
if (fhirResult.bundle_json || fhirResult.graph_data) {
  data.append({
    type: 'fhir-metadata',
    bundleJson: fhirResult.bundle_json,
    graphData: fhirResult.graph_data,
    patientId: journeyData.patient_id
  })
}
```

**Benefits:**

- Metadata is only sent when it exists
- No unnecessary data annotations in stream
- Frontend receives clean data

### 3. **Frontend Component** (`components/fhir-attachments.tsx`)

Added safety check in component:

```typescript
export function FHIRAttachments({ metadata }: FHIRAttachmentsProps) {
  // Don't render anything if there's no valid data
  if (!metadata || (!metadata.bundleJson && !metadata.graphData)) {
    return null
  }

  return (
    <div className="mt-6 space-y-4">
      {metadata.graphData && <FHIRGraph graphData={metadata.graphData} />}
      {metadata.bundleJson && <FHIRDownloadButton ... />}
    </div>
  )
}
```

**Benefits:**

- Component safely handles missing metadata
- No rendering errors if data is null/undefined
- Each attachment (graph/download) renders independently

## 🎯 Now The Flow Is

```
User submits journey
        ↓
Backend processes
        ↓
    ┌─────────────┐
    │ Success?    │
    └─────────────┘
         ↓
    ┌────┴────┐
    │         │
   YES       NO
    │         │
    ↓         ↓
Resources   No resources
generated   generated
    │         │
    ↓         ↓
Bundle &    bundle_json: null
graph_data  graph_data: null
created         │
    │           ↓
    ↓     Frontend checks
Frontend  if (bundle || graph)
checks    → FALSE
if data   → No metadata sent
exists        │
  ↓             ↓
Metadata   Only text response
sent       rendered
  ↓
Graph &
Download
rendered
```

## 📊 Scenarios Handled

### ✅ **Scenario 1: Complete Success**

- Journey extracted correctly
- FHIR resources generated
- Validation passes
- **Result**: Full response + graph + download button

### ✅ **Scenario 2: Partial Success**

- Journey extracted with fallback
- Some FHIR resources generated
- Some validation errors
- **Result**: Response with errors + graph + download button (of partial data)

### ✅ **Scenario 3: Generation Fails**

- Journey extracted
- Backend fails to generate resources
- `result.generated_resources` is empty
- **Result**: Error message only, NO graph or download button

### ✅ **Scenario 4: Complete Failure**

- Journey extraction fails completely
- Backend returns error
- **Result**: Error message only, NO graph or download button

## 🧪 Testing Scenarios

### Test 1: Valid Journey

**Input**: "John Doe, 58M, chest pain. BP 150/95, HR 88. Diagnosed with acute MI."

**Expected**:

- ✅ Full FHIR report
- ✅ Graph with colored nodes
- ✅ Download button

### Test 2: Vague Journey

**Input**: "Patient came in for checkup"

**Expected**:

- ✅ FHIR report (might be minimal)
- ✅ Graph (if resources generated)
- ✅ Download button (if resources generated)
- ⚠️ Might have validation warnings

### Test 3: Nonsense Input

**Input**: "asdfghjkl random text"

**Expected**:

- ✅ Attempt to process with fallback journey
- ⚠️ Might fail to generate resources
- ❌ No graph if generation fails
- ❌ No download button if generation fails

### Test 4: Backend Error

**Input**: Any valid journey, but backend is down

**Expected**:

- ❌ Error message
- ❌ No graph
- ❌ No download button

## 🔒 Safety Guarantees

1. **No undefined errors**: All checks prevent accessing properties on null/undefined
2. **No empty downloads**: Download button only appears if `bundle_json` exists
3. **No empty graphs**: Graph only renders if `graph_data` exists
4. **Graceful degradation**: Each component can appear independently
5. **Clean UI**: No empty containers or loading states for missing data

## 🎨 User Experience

### Before Fix

- Empty graph container might appear
- Download button might download empty file
- Confusing UI on failures

### After Fix

- Clean, professional appearance
- Only shows what's available
- Clear error messages when things fail
- No misleading UI elements

## 🚀 Ready to Test!

The fix is complete and both servers are running. Try different scenarios to see how it handles various inputs!
