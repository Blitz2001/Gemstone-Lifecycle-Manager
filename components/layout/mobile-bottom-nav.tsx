'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Plus, Gem, Calculator, LogOut } from 'lucide-react'
import { logout } from '@/lib/actions'
import { RoiCalculator } from '@/components/tools/roi-calculator'
import { cn } from '@/lib/utils'

export function MobileBottomNav() {
    const pathname = usePathname()
    const isHome = pathname === '/'
    const isNewLot = pathname === '/lots/new'

    return (
        <nav 
            aria-label="Mobile Bottom Navigation"
            className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-[#080c14]/95 backdrop-blur-xl border-t border-white/10 px-3 pt-2 pb-[max(0.6rem,env(safe-area-inset-bottom))] shadow-[0_-10px_30px_rgba(0,0,0,0.9)]"
        >
            <div className="flex items-center justify-around max-w-md mx-auto">
                {/* 1. Production Floor / Home */}
                <Link 
                    href="/" 
                    className={cn(
                        "flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all min-w-[60px]",
                        isHome ? "text-amber-300" : "text-slate-400 hover:text-white"
                    )}
                >
                    <div className={cn(
                        "w-7 h-7 rounded-lg flex items-center justify-center transition-colors",
                        isHome ? "bg-amber-500/15 border border-amber-500/30" : ""
                    )}>
                        <Gem className="w-4 h-4" />
                    </div>
                    <span className="text-[10px] font-mono font-medium tracking-tight">Floor</span>
                </Link>

                {/* 2. New Lot Gold Center Action */}
                <Link 
                    href="/lots/new" 
                    className="flex flex-col items-center -mt-4 group"
                >
                    <div className={cn(
                        "w-12 h-12 rounded-2xl gold-btn flex items-center justify-center shadow-[0_0_20px_rgba(212,161,55,0.4)] border border-amber-300/40 group-active:scale-95 transition-transform",
                        isNewLot ? "ring-2 ring-white/50" : ""
                    )}>
                        <Plus className="w-6 h-6 text-black stroke-[2.5]" />
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 mt-1">New Lot</span>
                </Link>

                {/* 3. ROI Calculator Trigger */}
                <div className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-white min-w-[60px]">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center">
                        <RoiCalculator />
                    </div>
                    <span className="text-[10px] font-mono font-medium tracking-tight -mt-1">ROI Tool</span>
                </div>

                {/* 4. Sign Out */}
                <form action={logout} className="flex flex-col items-center min-w-[60px]">
                    <button 
                        type="submit"
                        className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-slate-400 hover:text-rose-400 active:scale-95 transition-all"
                        title="Sign Out"
                    >
                        <div className="w-7 h-7 rounded-lg flex items-center justify-center">
                            <LogOut className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono font-medium tracking-tight">Sign Out</span>
                    </button>
                </form>
            </div>
        </nav>
    )
}
