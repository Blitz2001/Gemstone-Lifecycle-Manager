'use client'

import { useState } from 'react'
import { signup } from '@/lib/actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, AlertCircle, CheckCircle, ShieldCheck, Mail, Lock } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function SignupPage() {
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setLoading(true)
        setError(null)
        setSuccess(null)

        try {
            const result = await signup(formData)
            if (result?.error) {
                setError(result.error)
            } else if (result?.success) {
                setSuccess(result.message || 'Check your email to confirm registration.')
            }
        } catch (e) {
            setError('An unexpected error occurred. Please try again.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#070a12] text-slate-100 px-4 relative overflow-hidden selection:bg-blue-600/30 selection:text-blue-200">
            {/* Ambient Background Glows */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute bottom-10 left-10 w-72 h-72 bg-indigo-600/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-md relative z-10">
                {/* Brand Emblem */}
                <div className="text-center mb-8">
                    <div className="inline-flex relative w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-950/60 to-slate-900 border border-blue-500/30 items-center justify-center p-2.5 shadow-[0_0_25px_rgba(37,99,235,0.25)] mb-4">
                        <Image
                            src="/logo.png"
                            alt="Gemstone Vault Logo"
                            width={52}
                            height={52}
                            className="object-contain"
                            priority
                        />
                    </div>
                    <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-blue-400 font-bold mb-1">
                        Cryptographic Access Enrollment
                    </div>
                    <h1 className="text-3xl font-bold font-serif text-white tracking-tight">
                        Register Account
                    </h1>
                    <p className="text-xs text-slate-400 mt-1 font-sans">
                        Request enrollment in the private gemstone lifecycle network
                    </p>
                </div>

                {/* Form Card */}
                <div className="obsidian-card rounded-2xl p-7 sm:p-8 border border-white/5 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                    {success ? (
                        <div className="text-center py-6 space-y-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="font-serif font-bold text-lg text-white">Enrollment Initiated</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {success}
                                </p>
                            </div>
                            <Link href="/login" className="inline-block mt-4">
                                <Button className="bg-white/[0.05] hover:bg-white/10 text-white border border-white/10 text-xs rounded-xl h-10 px-5">
                                    Return to Vault Sign In
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <form action={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
                                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                                    <div>
                                        <span className="font-semibold block font-serif">Enrollment Failed</span>
                                        <span className="text-[11px] text-rose-300/80">{error}</span>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                                    <Mail className="w-3 h-3 text-blue-400" />
                                    Work Email
                                </Label>
                                <Input
                                    id="email"
                                    name="email"
                                    type="email"
                                    placeholder="operator@gemstone.com"
                                    required
                                    autoComplete="email"
                                    className="bg-slate-900/60 border-white/10 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 rounded-xl h-11"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
                                    <Lock className="w-3 h-3 text-blue-400" />
                                    Create Password
                                </Label>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    placeholder="Minimum 8 characters"
                                    required
                                    autoComplete="new-password"
                                    className="bg-slate-900/60 border-white/10 text-sm text-white placeholder:text-slate-600 focus:border-blue-500/50 rounded-xl h-11"
                                />
                            </div>

                            <Button 
                                type="submit" 
                                disabled={loading} 
                                className="w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-medium text-xs rounded-xl shadow-[0_0_20px_rgba(37,99,235,0.3)] border border-blue-400/30 transition-all flex items-center justify-center gap-2 mt-2"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin text-blue-200" />
                                        <span className="font-mono text-xs tracking-wider">GENERATING CREDENTIALS...</span>
                                    </>
                                ) : (
                                    <>
                                        <ShieldCheck className="h-4 w-4 text-blue-200" />
                                        <span>Create Vault Access</span>
                                    </>
                                )}
                            </Button>

                            <div className="pt-3 border-t border-white/5 text-center text-xs text-slate-400">
                                Already registered?{' '}
                                <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-4">
                                    Sign in here
                                </Link>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer Security Badge */}
                <div className="mt-8 text-center text-[10px] text-slate-500 font-mono flex items-center justify-center gap-2">
                    <ShieldCheck className="w-3 h-3 text-slate-600" />
                    <span>ENC-256 VAULT PROTOCOL • RATNAPURA ASSAY OFFICE</span>
                </div>
            </div>
        </div>
    )
}
