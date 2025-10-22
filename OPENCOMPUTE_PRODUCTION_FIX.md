# OpenCompute Production Fix Guide

## Problem Summary

The OpenCompute route was failing in production (Vercel → Azure) but working fine on localhost. The issue was caused by:

1. **CORS Configuration**: The data warehouse CORS policy didn't allow Vercel preview URLs
2. **Missing Environment Variables**: Production environment variables not properly configured
3. **Poor Error Visibility**: Insufficient logging made debugging difficult
4. **Network Connectivity**: Potential network issues between Vercel and Azure

## Changes Made

### 1. Data Warehouse CORS Fix (`data-warehouse/main.py`)

**Before:**
- Only hardcoded specific Vercel URLs
- Would reject requests from preview deployments

**After:**
- Uses regex pattern to allow ALL Vercel preview URLs
- Pattern: `^https://.*\.vercel\.app$|^https://.*\.jori\.health$|^http://localhost:\d+$`
- This allows:
  - All Vercel production deployments
  - All Vercel preview deployments (e.g., `open-compute-website-git-dev-*.vercel.app`)
  - All `*.jori.health` domains
  - All localhost ports for development

### 2. Enhanced Logging (Both Sides)

**Data Warehouse (`opencompute.py`):**
- Added request start logging with patient ID, stages count, LLM provider
- Added response completion logging with duration, success status, resource count
- Added response size tracking
- Added detailed error logging with stack traces
- Added custom headers: `X-Generation-Time`, `X-Resource-Count`

**Next.js API (`route.ts`):**
- Added detailed fetch logging before/after requests
- Added error type and message logging for fetch failures
- Added response header inspection
- Added payload size logging
- Better error boundaries with try/catch around fetch

## Deployment Steps

### Step 1: Deploy Data Warehouse Changes to Azure

1. **Commit the changes:**
   ```bash
   cd /Users/bkyritz/Code/Jori/data-warehouse
   git add main.py app/routes/opencompute.py
   git commit -m "fix: CORS and logging improvements for OpenCompute production"
   git push origin main  # or your deployment branch
   ```

2. **Redeploy to Azure:**
   - Azure should auto-deploy from your connected GitHub repository
   - Or manually deploy using Azure CLI:
     ```bash
     az webapp up --name your-data-warehouse-name --resource-group your-resource-group
     ```

3. **Verify the deployment:**
   - Check Azure App Service logs
   - Test the health endpoint: `https://your-data-warehouse.azurewebsites.net/health`

### Step 2: Deploy Next.js Changes to Vercel

1. **Commit the changes:**
   ```bash
   cd /Users/bkyritz/Code/Jori/open-compute-website
   git add app/api/agents/opencompute/route.ts
   git commit -m "fix: Enhanced error handling and logging for OpenCompute agent"
   git push origin main  # or dev
   ```

2. **Vercel will auto-deploy** from your connected GitHub repository

### Step 3: Configure Environment Variables

#### Vercel Environment Variables (Required)

Go to your Vercel project settings → Environment Variables and ensure these are set:

```bash
# Required: Your Azure data warehouse URL
NEXT_PUBLIC_DATA_WAREHOUSE_URL=https://your-data-warehouse.azurewebsites.net

# Required: Enable chat history saving
ENABLE_SAVE_CHAT_HISTORY=true

# Required: Supabase credentials
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Required: LLM API keys (Groq is used by OpenCompute agent)
GROQ_API_KEY=your-groq-api-key
```

**⚠️ CRITICAL:** The `NEXT_PUBLIC_DATA_WAREHOUSE_URL` must point to your Azure data warehouse, not localhost!

#### Azure Environment Variables (Required)

In Azure App Service → Configuration → Application Settings, ensure these are set:

```bash
# Required: LLM Provider API Keys
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=your-openai-api-key  # fallback if Groq fails

# Optional: Default LLM provider
LLM_PROVIDER=groq  # or openai

# Other environment variables your app needs
AZURE_SERVICE_BUS_CONNECTION_STRING=...
REDIS_URL=...
# etc.
```

### Step 4: Test in Production

1. **Test a simple request:**
   - Go to your production site: `https://open-compute-website.vercel.app`
   - Select "Patient Journey to FHIR" model
   - Send a test message: "58 year old male presents to ER with chest pain"

2. **Monitor the logs:**
   
   **Vercel Logs:**
   ```bash
   vercel logs --follow
   ```
   
   Look for:
   ```
   🌐 CALLING DATA WAREHOUSE
      URL: https://your-data-warehouse.azurewebsites.net/opencompute/...
      Patient ID: patient-xxx
   ✅ BACKEND RESPONSE RECEIVED (XXs)
      Status: 200 OK
   ```

   **Azure Logs:**
   ```bash
   az webapp log tail --name your-data-warehouse-name --resource-group your-resource-group
   ```
   
   Look for:
   ```
   🚀 OpenCompute FHIR Generation Request Received
      Patient ID: patient-xxx
      Stages: 1
   ✅ OpenCompute FHIR Generation Complete
      Duration: XX.XXs
      Resources: X
   ```

3. **Check for errors:**
   - If you see `❌ FETCH ERROR`, it's a network connectivity issue
   - If you see `❌ BACKEND ERROR RESPONSE`, it's an Azure data warehouse error
   - If you see CORS errors, the CORS fix didn't deploy properly

## Common Issues and Solutions

### Issue 1: Still Getting CORS Errors

**Symptoms:**
- Browser console shows: `CORS policy: No 'Access-Control-Allow-Origin' header`
- Vercel logs show fetch errors

**Solution:**
1. Verify the data warehouse changes deployed to Azure
2. Check Azure logs to ensure the new CORS middleware is active
3. Restart the Azure App Service:
   ```bash
   az webapp restart --name your-data-warehouse-name --resource-group your-resource-group
   ```

### Issue 2: 500 Error from Data Warehouse

**Symptoms:**
- Vercel logs show: `❌ BACKEND ERROR RESPONSE - Status: 500`
- Azure logs show errors

**Solution:**
1. Check Azure logs for the detailed error with stack trace
2. Common causes:
   - Missing `GROQ_API_KEY` or `OPENAI_API_KEY` in Azure
   - OpenCompute package not installed: Run `pip install open-compute` on Azure
   - Missing dependencies: Check `requirements.txt` is complete

### Issue 3: Timeout Errors

**Symptoms:**
- Vercel logs show: `❌ FETCH ERROR - Error type: AbortError`
- Message: "The backend request timed out"

**Solution:**
1. The FHIR generation is taking > 4.5 minutes (Vercel limit is 5 minutes on Enterprise)
2. Options:
   - Simplify the patient journey (fewer stages)
   - Reduce `max_iterations` parameter
   - Use Groq instead of OpenAI (much faster)
   - Upgrade Vercel plan for longer timeouts

### Issue 4: Network Connectivity Issues

**Symptoms:**
- Vercel logs show: `❌ FETCH ERROR - Error type: TypeError`
- Message: "fetch failed" or "network error"

**Solution:**
1. Verify the Azure data warehouse is running:
   ```bash
   curl https://your-data-warehouse.azurewebsites.net/health
   ```
2. Check Azure App Service is not paused or stopped
3. Verify `NEXT_PUBLIC_DATA_WAREHOUSE_URL` environment variable in Vercel is correct
4. Test the endpoint directly:
   ```bash
   curl -X POST https://your-data-warehouse.azurewebsites.net/opencompute/generate-fhir-from-patient-journey \
     -H "Content-Type: application/json" \
     -d '{"patient_id":"test","summary":"test","stages":[{"name":"test","description":"test"}]}'
   ```

### Issue 5: Environment Variable Not Set

**Symptoms:**
- Vercel logs show: `Data warehouse URL: http://localhost:5050` (in production!)
- Requests fail because localhost isn't accessible from Vercel

**Solution:**
1. Set `NEXT_PUBLIC_DATA_WAREHOUSE_URL` in Vercel environment variables
2. Redeploy after setting (environment variables require a new deployment)
3. Verify in Vercel logs that the URL is correct

## Verification Checklist

- [ ] Data warehouse changes deployed to Azure
- [ ] Next.js changes deployed to Vercel
- [ ] `NEXT_PUBLIC_DATA_WAREHOUSE_URL` set in Vercel environment variables
- [ ] `GROQ_API_KEY` set in both Vercel and Azure environment variables
- [ ] Test request completes successfully in production
- [ ] Vercel logs show successful backend response
- [ ] Azure logs show successful FHIR generation
- [ ] No CORS errors in browser console
- [ ] Chat history saved to Supabase

## Additional Monitoring

### Enable Detailed Logging

The new logging will automatically appear in:
- **Vercel**: Function logs (visible in Vercel dashboard or via `vercel logs`)
- **Azure**: Application logs (visible in Azure Portal or via `az webapp log tail`)

### What to Look For

**Successful Request Pattern:**
```
Next.js:
  🌐 CALLING DATA WAREHOUSE
  ✅ BACKEND RESPONSE RECEIVED (30s)
  📦 Response contains: bundle: true, graph: true, resources: 5
  ✅ Chat saved successfully to Supabase

Data Warehouse:
  🚀 OpenCompute FHIR Generation Request Received
  ✅ OpenCompute FHIR Generation Complete
     Duration: 28.5s
     Resources: 5
```

**Failed Request Pattern:**
```
Next.js:
  🌐 CALLING DATA WAREHOUSE
  ❌ FETCH ERROR (after 2.5s)
     Error type: TypeError
     Error message: fetch failed
```

## Performance Optimization

If you notice slow performance:

1. **Use Groq instead of OpenAI:**
   - Groq is 10-20x faster for FHIR generation
   - Set `llm_provider: "groq"` in the model configuration
   - Ensure `GROQ_API_KEY` is set

2. **Reduce iterations:**
   - Default is 3 iterations for refinement
   - Set `max_iterations: 1` for faster generation with less refinement

3. **Cache results:**
   - Consider caching FHIR bundles in Supabase
   - Check if similar patient journeys already exist

## Contact and Support

If issues persist after following this guide:
1. Check both Vercel and Azure logs for detailed error messages
2. Verify all environment variables are set correctly
3. Test the data warehouse endpoint directly (using curl)
4. Check Azure App Service is running and healthy

The enhanced logging should now make it much easier to diagnose exactly where and why requests are failing.

