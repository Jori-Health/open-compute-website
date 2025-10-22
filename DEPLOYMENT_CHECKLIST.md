# OpenCompute Production Fix - Quick Deployment Checklist

## 🚀 Quick Deploy Steps

### 1. Deploy Data Warehouse (Azure)
```bash
cd /Users/bkyritz/Code/Jori/data-warehouse
git add .
git commit -m "fix: CORS and logging for OpenCompute production"
git push origin main
```

### 2. Deploy Next.js (Vercel)
```bash
cd /Users/bkyritz/Code/Jori/open-compute-website
git add .
git commit -m "fix: Enhanced OpenCompute error handling"
git push origin main
```

### 3. Set Vercel Environment Variables

**Required Variables in Vercel Dashboard:**
```bash
NEXT_PUBLIC_DATA_WAREHOUSE_URL=https://your-azure-data-warehouse.azurewebsites.net
GROQ_API_KEY=your-groq-api-key
ENABLE_SAVE_CHAT_HISTORY=true
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

**⚠️ After setting environment variables, redeploy!**

### 4. Verify Azure Environment Variables

In Azure App Service → Configuration → Application Settings:
```bash
GROQ_API_KEY=your-groq-api-key
OPENAI_API_KEY=your-openai-api-key
LLM_PROVIDER=groq
```

### 5. Test Production

1. Go to production site
2. Select "Patient Journey to FHIR" model
3. Send test message: "58 year old male with chest pain"
4. Check logs:
   ```bash
   # Vercel logs
   vercel logs --follow
   
   # Azure logs
   az webapp log tail --name your-data-warehouse --resource-group your-rg
   ```

## ✅ Success Indicators

- [ ] No CORS errors in browser console
- [ ] Vercel logs show: `✅ BACKEND RESPONSE RECEIVED`
- [ ] Azure logs show: `✅ OpenCompute FHIR Generation Complete`
- [ ] Response appears in chat interface
- [ ] Chat saved to Supabase

## ❌ Troubleshooting

| Error | Solution |
|-------|----------|
| CORS error | Restart Azure App Service |
| 500 error | Check Azure logs for detailed error |
| Timeout | Use Groq instead of OpenAI, reduce max_iterations |
| Network error | Verify `NEXT_PUBLIC_DATA_WAREHOUSE_URL` is set correctly |
| Still using localhost | Redeploy Vercel after setting env vars |

## 📊 Key Changes Made

1. **CORS Fix**: Data warehouse now accepts all Vercel preview URLs
2. **Enhanced Logging**: Detailed logs on both Next.js and Python sides
3. **Better Error Handling**: Specific error messages for debugging
4. **Response Headers**: Added timing and resource count headers

## 🔍 Where to Look for Errors

**CORS Issues:**
- Browser DevTools Console
- Look for: "Access-Control-Allow-Origin"

**Network Issues:**
- Vercel function logs
- Look for: `❌ FETCH ERROR`

**Backend Issues:**
- Azure Application logs
- Look for: `❌ OpenCompute Generation Error`

**Environment Issues:**
- Vercel logs showing `http://localhost:5050` = env var not set
- Azure logs showing "API key not configured" = missing API key

## 📞 Need Help?

See `OPENCOMPUTE_PRODUCTION_FIX.md` for detailed troubleshooting guide.

