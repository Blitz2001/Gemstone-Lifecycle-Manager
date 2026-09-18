'use client'

import { VaultHeader } from './vault-header'
import { MobileBottomNav } from './mobile-bottom-nav'

interface VaultShellProps {
    children: React.ReactNode
    activeLotsCount?: number
}

export function VaultShell({ children, activeLotsCount = 0 }: VaultShellProps) {
    return (
        <div className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-200 flex flex-col pb-20 md:pb-0">
            {/* 1. Top Navigation Bar */}
            <VaultHeader activeLotsCount={activeLotsCount} />

            {/* 2. Main Page Content */}
            <main className="flex-1 flex flex-col">
                {children}
            </main>

            {/* 3. Floating Mobile Bottom Action Dock (Visible only on < md screens) */}
            <MobileBottomNav />
        </div>
    )
}
