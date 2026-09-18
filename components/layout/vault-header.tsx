'use client'

import Link from 'next/link'
import Image from 'next/image'
import { RoiCalculator } from '@/components/tools/roi-calculator'
import { logout } from '@/lib/actions'
import { Plus, LogOut, User } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface VaultHeaderProps {
    activeLotsCount?: number
}

export function VaultHeader({ activeLotsCount = 0 }: VaultHeaderProps) {
    return (
        <header className="h-16 border-b border-white/5 bg-[#080c14]/90 backdrop-blur-xl px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40">
            {/* Left: Brand Identity & Logo */}
            <Link href="/" className="flex items-center gap-3 group">
                <div className="relative w-9 h-9 rounded-xl bg-slate-900 border border-amber-500/30 p-1 flex items-center justify-center shadow-[0_0_15px_rgba(212,161,55,0.15)] group-hover:border-amber-500/60 transition-all">
                    <Image
                        src="/logo.png"
                        alt="Gemstone Lifecycle Logo"
                        width={28}
                        height={28}
                        className="object-contain"
                        priority
                    />
                </div>
                <div className="flex flex-col">
                    <span className="font-serif font-bold text-base text-white tracking-tight flex items-center gap-1.5 group-hover:text-amber-300 transition-colors">
                        Gemstone Lifecycle
                    </span>
                    <span className="text-[10px] uppercase font-mono tracking-wider text-slate-400">
                        Production Floor &amp; Vault
                    </span>
                </div>
            </Link>

            {/* Center Status: Active Lots Badge */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.03] border border-white/5 text-xs font-mono text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-white font-bold">{activeLotsCount}</span>
                <span className="text-slate-400">Active {activeLotsCount === 1 ? 'Lot' : 'Lots'}</span>
            </div>

            {/* Right: Action Controls */}
            <div className="flex items-center gap-2.5 sm:gap-3">
                <RoiCalculator />

                <Link href="/lots/new">
                    <button className="gold-btn h-9 px-3.5 sm:px-4 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-[0_0_20px_rgba(212,161,55,0.25)]">
                        <Plus className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">New Lot</span>
                        <span className="sm:hidden">New</span>
                    </button>
                </Link>

                {/* User & Sign Out */}
                <div className="flex items-center gap-1.5 pl-2 border-l border-white/10">
                    <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center text-slate-300" title="Active Session">
                        <User className="w-4 h-4 text-slate-300" />
                    </div>

                    <form action={logout}>
                        <Button 
                            type="submit"
                            variant="ghost" 
                            size="sm"
                            className="text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 h-8 w-8 p-0 rounded-xl"
                            title="Sign Out"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                        </Button>
                    </form>
                </div>
            </div>
        </header>
    )
}
