import { Wallet, Gem, ShoppingCart, TrendingUp, TrendingDown } from "lucide-react"

interface DashboardMetricsProps {
    metrics: {
        total_investment: number
        projected_revenue: number
        realized_revenue: number
        realized_profit: number
        pending_sales: number
    }
}

export function DashboardMetrics({ metrics }: DashboardMetricsProps) {
    const isProfitable = (metrics.realized_profit || 0) >= 0

    const formatCurrency = (val: number) => {
        return `LKR ${(val || 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
    }

    return (
        <div className="grid grid-cols-2 gap-2.5 sm:gap-4 lg:grid-cols-4">
            {/* CARD 1: TOTAL INVESTMENT */}
            <div className="obsidian-card obsidian-card-hover rounded-xl sm:rounded-2xl p-3 sm:p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 sm:w-28 h-24 sm:h-28 bg-blue-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />
                
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.14em] sm:tracking-[0.18em] text-blue-400 uppercase truncate pr-1">
                        Total Investment
                    </span>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Wallet className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                </div>

                <div className="mt-0.5 sm:mt-1">
                    <div className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight text-white font-serif truncate">
                        {formatCurrency(metrics.total_investment)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                        <span className="truncate">Active Parcels Cost</span>
                    </p>
                </div>
            </div>

            {/* CARD 2: ACTIVE VALUATION */}
            <div className="obsidian-card obsidian-card-hover rounded-xl sm:rounded-2xl p-3 sm:p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 sm:w-28 h-24 sm:h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.14em] sm:tracking-[0.18em] text-amber-400 uppercase truncate pr-1">
                        Active Valuation
                    </span>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                        <Gem className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                </div>

                <div className="mt-0.5 sm:mt-1">
                    <div className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight text-amber-300 font-serif truncate">
                        {formatCurrency(metrics.projected_revenue)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{metrics.pending_sales} {metrics.pending_sales === 1 ? 'Lot' : 'Lots'} Pending</span>
                    </p>
                </div>
            </div>

            {/* CARD 3: REALIZED REVENUE */}
            <div className="obsidian-card obsidian-card-hover rounded-xl sm:rounded-2xl p-3 sm:p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-24 sm:w-28 h-24 sm:h-28 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all" />
                
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className="text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.14em] sm:tracking-[0.18em] text-sky-400 uppercase truncate pr-1">
                        Realized Revenue
                    </span>
                    <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
                        <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4" />
                    </div>
                </div>

                <div className="mt-0.5 sm:mt-1">
                    <div className="text-base sm:text-2xl lg:text-3xl font-bold tracking-tight text-white font-serif truncate">
                        {formatCurrency(metrics.realized_revenue)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                        <span className="truncate">Total Sales Recorded</span>
                    </p>
                </div>
            </div>

            {/* CARD 4: REALIZED PROFIT */}
            <div className="obsidian-card obsidian-card-hover rounded-xl sm:rounded-2xl p-3 sm:p-5 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-24 sm:w-28 h-24 sm:h-28 ${isProfitable ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'} rounded-full blur-2xl pointer-events-none transition-all`} />
                
                <div className="flex items-center justify-between mb-2 sm:mb-3">
                    <span className={`text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.14em] sm:tracking-[0.18em] uppercase truncate pr-1 ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Realized Profit
                    </span>
                    <div className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl ${isProfitable ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} border flex items-center justify-center shrink-0`}>
                        {isProfitable ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
                    </div>
                </div>

                <div className="mt-0.5 sm:mt-1">
                    <div className={`text-base sm:text-2xl lg:text-3xl font-bold tracking-tight font-serif truncate ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitable ? '+' : ''}{formatCurrency(metrics.realized_profit)}
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-400 mt-1 flex items-center gap-1.5 truncate">
                        <span className={`w-1.5 h-1.5 rounded-full ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'} shrink-0`} />
                        <span className="truncate">Net Profit on Closed</span>
                    </p>
                </div>
            </div>
        </div>
    )
}
