import { NextResponse } from 'next/server'

// The client you created from the Server-Side Auth instructions
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get('next') ?? '/'

  console.log('OAuth callback received:', {
    code: code ? 'present' : 'missing',
    origin
  })

  if (code) {
    try {
      const supabase = await createClient()
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth error:', error)
        return NextResponse.redirect(
          `${origin}/auth/error?error=${encodeURIComponent(error.message)}`
        )
      }

      console.log('OAuth success:', data.user?.email)

      const forwardedHost = request.headers.get('x-forwarded-host') // original origin before load balancer
      const isLocalEnv = process.env.NODE_ENV === 'development'

      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`)
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`)
      } else {
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (error) {
      console.error('OAuth exception:', error)
      return NextResponse.redirect(
        `${origin}/auth/error?error=${encodeURIComponent(String(error))}`
      )
    }
  }

  // return the user to an error page with instructions
  console.log('No code provided in OAuth callback')
  return NextResponse.redirect(`${origin}/auth/error?error=no_code`)
}
