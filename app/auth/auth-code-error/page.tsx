import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, ArrowLeft, RefreshCw, KeyRound } from 'lucide-react'

export const metadata = {
    title: 'Authentication Error - Gemstone Lifecycle Manager',
    description: 'The authentication link has expired or is invalid.'
}

export default function AuthCodeErrorPage() {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-muted/30 px-4 py-12">
            <Card className="w-full max-w-md shadow-lg border-border">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/50 text-red-600 dark:text-red-400">
                        <AlertCircle className="h-7 w-7" />
                    </div>
                    <CardTitle className="text-xl font-bold tracking-tight">Authentication Link Expired</CardTitle>
                    <CardDescription className="text-sm text-muted-foreground mt-1">
                        We were unable to verify your session using the provided code or link.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4 pt-2">
                    <div className="rounded-lg border bg-card p-3.5 text-xs text-muted-foreground space-y-2">
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                            Common reasons this happens:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                            <li>The magic link or OTP expired (typically after 10-15 minutes).</li>
                            <li>The link was already used in a previous session or tab.</li>
                            <li>The URL was modified or truncated by an email scanner.</li>
                        </ul>
                    </div>

                    <p className="text-xs text-center text-muted-foreground">
                        Please return to the login screen and request a fresh login link or enter your credentials again.
                    </p>
                </CardContent>

                <CardFooter className="flex flex-col gap-2 pt-2">
                    <Button asChild className="w-full">
                        <Link href="/login" className="flex items-center justify-center gap-2">
                            <ArrowLeft className="w-4 h-4" />
                            Return to Sign In
                        </Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                        <Link href="/login" className="flex items-center justify-center gap-2">
                            <RefreshCw className="w-4 h-4" />
                            Try Again
                        </Link>
                    </Button>
                </CardFooter>
            </Card>
        </div>
    )
}
