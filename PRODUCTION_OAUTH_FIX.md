# Production OAuth Redirect Fix

## Problem
After Google OAuth login in production, Supabase redirects users to `localhost:3000` instead of the production URL.

## Root Cause
The **Site URL** in Supabase Dashboard is set to `http://localhost:3000`, which causes Supabase to always redirect to localhost after OAuth authentication, even in production.

## Solution

### 1. Update Supabase Dashboard - Site URL (CRITICAL)

Go to: https://lscqilyywlgirozpidwt.supabase.co/project/_/auth/url-configuration

**Change Site URL from:**
```
http://localhost:3000
```

**To your production URL:**
```
https://your-production-domain.vercel.app
```
(Replace with your actual Vercel domain or custom domain)

### 2. Update Supabase Dashboard - Redirect URLs

In the same page, under **Redirect URLs**, add BOTH:
```
http://localhost:3000/**
https://your-production-domain.vercel.app/**
```

This allows both local development and production to work.

### 3. Update Google Cloud Console OAuth Client

Go to: https://console.cloud.google.com/apis/credentials

Update your OAuth 2.0 Client:

**Authorized JavaScript origins:**
```
http://localhost:3000
https://your-production-domain.vercel.app
https://lscqilyywlgirozpidwt.supabase.co
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://your-production-domain.vercel.app/auth/callback
https://lscqilyywlgirozpidwt.supabase.co/auth/v1/callback
```

### 4. Verify Vercel Environment Variables

Make sure your Vercel project has these environment variables set:

```env
NEXT_PUBLIC_SUPABASE_URL=https://lscqilyywlgirozpidwt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzY3FpbHl5d2xnaXJvenBpZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODU1NjAsImV4cCI6MjA3NjY2MTU2MH0.97dm_PUAJB1T5Zes5hNdc6bcm4qm5SO4U12YEht_Khs
```

After adding/updating environment variables, **redeploy** your app on Vercel.

## How It Works Now

### Local Development Flow:
1. User clicks "Sign In with Google" on `http://localhost:3000`
2. Code sets `redirectTo` to `http://localhost:3000/auth/callback`
3. Supabase allows this because it's in the Redirect URLs list
4. User completes OAuth and returns to `http://localhost:3000/auth/callback`
5. ✅ Success!

### Production Flow:
1. User clicks "Sign In with Google" on `https://your-app.vercel.app`
2. Code sets `redirectTo` to `https://your-app.vercel.app/auth/callback`
3. Supabase allows this because it's in the Redirect URLs list
4. User completes OAuth and returns to `https://your-app.vercel.app/auth/callback`
5. ✅ Success!

## Testing Steps

### Test Locally:
1. Go to `http://localhost:3000/auth/login`
2. Click "Sign In with Google"
3. Should redirect back to `http://localhost:3000/`

### Test in Production:
1. Deploy to Vercel
2. Go to `https://your-app.vercel.app/auth/login`
3. Click "Sign In with Google"
4. Should redirect back to `https://your-app.vercel.app/`

## Troubleshooting

### Still redirecting to localhost in production?
- Clear Supabase project's build cache
- Redeploy on Vercel
- Clear browser cookies/cache
- Make sure you changed the **Site URL** in Supabase (not just Redirect URLs)

### Getting "redirect_uri_mismatch" error?
- Make sure all redirect URIs are added to Google Cloud Console
- URLs must match exactly (check for trailing slashes, http vs https)

### Environment variable not updating?
- After changing env vars in Vercel, trigger a new deployment
- Environment variables only update on new builds, not automatically

## Code Changes Made

Updated `components/login-form.tsx` to use `window.location.origin` for better clarity and SSR compatibility.

The key insight: `window.location.origin` will automatically be:
- `http://localhost:3000` in local development
- `https://your-app.vercel.app` in production

This means the redirect URL dynamically adapts to the environment without any configuration needed!

