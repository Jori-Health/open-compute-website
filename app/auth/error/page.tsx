import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function Page({
  searchParams
}: {
  searchParams: Promise<{ error: string }>
}) {
  const params = await searchParams

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Authentication Error</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {params?.error ? (
                  <p className="text-sm text-muted-foreground">
                    Error: {decodeURIComponent(params.error)}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    An unspecified error occurred during authentication.
                  </p>
                )}
                <div className="flex gap-2">
                  <Button asChild variant="default" className="flex-1">
                    <Link href="/auth/login">Try Again</Link>
                  </Button>
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/">Go Home</Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
