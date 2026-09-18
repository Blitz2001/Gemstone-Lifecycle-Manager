'use client'

import { VaultHeader } from './vault-header'

interface VaultShellProps {
    children: React.ReactNode
    activeLotsCount?: number
}

export function VaultShell({ children, activeLotsCount = 0 }: VaultShellProps) {
    return (
        <div className="min-h-screen bg-[#080c14] text-slate-100 antialiased selection:bg-amber-500/20 selection:text-amber-200 flex flex-col">
            {/* 1. Top Navigation Bar */}
            <VaultHeader activeLotsCount={activeLotsCount} />

            {/* 2. Main Page Content */}
            <main className="flex-1 flex flex-col">
                {children}
            </main>
        </div>
    )
}
