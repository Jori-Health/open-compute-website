import { createClient } from '@/lib/supabase/server'

export default async function TestAuthPage() {
  const supabase = await createClient()
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-2xl font-bold mb-4">Auth Test Page</h1>
        <div className="space-y-4">
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Environment Variables:</h2>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded">
              {JSON.stringify(
                {
                  SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL
                    ? 'Set ✓'
                    : 'Missing ✗',
                  SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
                    ? 'Set ✓'
                    : 'Missing ✗',
                  NODE_ENV: process.env.NODE_ENV
                },
                null,
                2
              )}
            </pre>
          </div>
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Current User:</h2>
            <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-auto">
              {user ? JSON.stringify(user, null, 2) : 'No user logged in'}
            </pre>
          </div>
          <div className="p-4 border rounded">
            <h2 className="font-semibold mb-2">Expected OAuth Callback URL:</h2>
            <p className="text-sm">
              <code className="bg-gray-100 dark:bg-gray-800 p-1 rounded">
                http://localhost:3000/auth/oauth
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
