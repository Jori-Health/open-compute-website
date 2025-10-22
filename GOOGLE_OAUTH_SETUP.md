# Google OAuth Setup Guide

## ✅ Code Changes Complete

All necessary code changes have been implemented. Your OAuth callback route is now at `/auth/callback` and properly handles PKCE flow.

## 🔧 Configuration Steps

### 1. Supabase Dashboard Configuration

Go to: https://lscqilyywlgirozpidwt.supabase.co

#### A. Enable Google Provider
1. Navigate to **Authentication** → **Providers**
2. Find **Google** and click to expand
3. Enable the provider
4. You'll need to add your Google OAuth credentials here (see step 2 below first)

#### B. Configure URL Settings
1. Navigate to **Authentication** → **URL Configuration**
2. Set the following:
   - **Site URL**: `http://localhost:3000` (for local dev)
   - **Redirect URLs**: Add these:
     - `http://localhost:3000/**`
     - `http://localhost:3000/auth/callback`
     - `https://your-production-domain.com/**` (when deploying)
     - `https://your-production-domain.com/auth/callback` (when deploying)

### 2. Google Cloud Console Configuration

Go to: https://console.cloud.google.com/

#### A. Create OAuth 2.0 Client ID (if not already created)
1. Navigate to **APIs & Services** → **Credentials**
2. Click **+ CREATE CREDENTIALS** → **OAuth client ID**
3. Choose **Web application**
4. Give it a name (e.g., "Open Compute Website")

#### B. Configure Authorized URLs

**Authorized JavaScript origins:**
```
http://localhost:3000
https://lscqilyywlgirozpidwt.supabase.co
https://your-production-domain.com (when deploying)
```

**Authorized redirect URIs:**
```
http://localhost:3000/auth/callback
https://lscqilyywlgirozpidwt.supabase.co/auth/v1/callback
https://your-production-domain.com/auth/callback (when deploying)
```

#### C. Get Your Credentials
1. After saving, you'll see your **Client ID** and **Client Secret**
2. Copy both of these

### 3. Connect Google to Supabase

1. Go back to Supabase Dashboard → **Authentication** → **Providers** → **Google**
2. Paste your **Google Client ID**
3. Paste your **Google Client Secret**
4. Click **Save**

### 4. Test the Setup

1. Make sure your dev server is running:
   ```bash
   npm run dev
   ```

2. Open your browser to: http://localhost:3000/auth/login

3. Click **"Sign In with Google"**

4. You should be redirected to Google's login page

5. After authenticating, you should be redirected back to your app at http://localhost:3000/

### 5. Troubleshooting

#### Check Environment Variables
Your `.env.local` should have:
```env
NEXT_PUBLIC_SUPABASE_URL=https://lscqilyywlgirozpidwt.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxzY3FpbHl5d2xnaXJvenBpZHd0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEwODU1NjAsImV4cCI6MjA3NjY2MTU2MH0.97dm_PUAJB1T5Zes5hNdc6bcm4qm5SO4U12YEht_Khs
```

#### Use the Test Page
Visit http://localhost:3000/auth/test to verify:
- Environment variables are set correctly
- Supabase connection is working
- Current authentication status

#### Check Server Logs
Watch your terminal for console.log messages:
- "OAuth callback received" - confirms the callback is being hit
- "OAuth error" - shows any Supabase errors
- "OAuth success" - confirms successful authentication

#### Common Errors

**"ERR_FAILED" or "This site can't be reached"**
- Make sure your dev server is running (`npm run dev`)
- Restart the server after making changes

**"invalid request: both auth code and code verifier should be non-empty"**
- ✅ This is fixed! Make sure you're using the updated `login-form.tsx` with the `/auth/callback` redirect

**"redirect_uri_mismatch"**
- The redirect URI in Google Cloud Console doesn't match
- Make sure you added both:
  - `https://lscqilyywlgirozpidwt.supabase.co/auth/v1/callback`
  - `http://localhost:3000/auth/callback`

## 🚀 OAuth Flow Diagram

```
User clicks "Sign In with Google"
    ↓
Supabase JS SDK (with PKCE)
    ↓
Google OAuth Login Page
    ↓
User authenticates
    ↓
Google redirects to: https://[supabase-project].supabase.co/auth/v1/callback
    ↓
Supabase processes auth (with code verifier)
    ↓
Supabase redirects to: http://localhost:3000/auth/callback?code=xxx
    ↓
Your Next.js route handler exchanges code for session
    ↓
Sets cookies and redirects to: http://localhost:3000/
    ↓
User is logged in! 🎉
```

## 📝 Files Modified

- `/components/login-form.tsx` - Updated to use `/auth/callback` and PKCE flow
- `/app/auth/callback/route.ts` - Renamed from `oauth` to `callback` for standard convention
- `/app/auth/error/page.tsx` - Improved error display with actionable buttons
- `/app/auth/test/page.tsx` - New diagnostic page for testing

## ✅ Ready to Test!

Your OAuth setup is now complete. Follow the testing steps above to verify everything works!

