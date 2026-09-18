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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* CARD 1: TOTAL INVESTMENT */}
            <div className="obsidian-card obsidian-card-hover rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-blue-600/10 rounded-full blur-2xl pointer-events-none group-hover:bg-blue-600/20 transition-all" />
                
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-blue-400 uppercase">
                        Total Investment
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <Wallet className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-1">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-serif">
                        {formatCurrency(metrics.total_investment)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                        Cumulative Cost (Active Lots)
                    </p>
                </div>
            </div>

            {/* CARD 2: ACTIVE VALUATION */}
            <div className="obsidian-card obsidian-card-hover rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-amber-500/20 transition-all" />
                
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-amber-400 uppercase">
                        Active Valuation
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                        <Gem className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-1">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight text-amber-300 font-serif">
                        {formatCurrency(metrics.projected_revenue)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        {metrics.pending_sales} {metrics.pending_sales === 1 ? 'Lot' : 'Lots'} Pending Sale
                    </p>
                </div>
            </div>

            {/* CARD 3: REALIZED REVENUE */}
            <div className="obsidian-card obsidian-card-hover rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-28 h-28 bg-sky-500/10 rounded-full blur-2xl pointer-events-none group-hover:bg-sky-500/20 transition-all" />
                
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-mono font-bold tracking-[0.18em] text-sky-400 uppercase">
                        Realized Revenue
                    </span>
                    <div className="w-8 h-8 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                        <ShoppingCart className="w-4 h-4" />
                    </div>
                </div>

                <div className="mt-1">
                    <div className="text-2xl lg:text-3xl font-bold tracking-tight text-white font-serif">
                        {formatCurrency(metrics.realized_revenue)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                        Total Sales Recorded to Date
                    </p>
                </div>
            </div>

            {/* CARD 4: REALIZED PROFIT */}
            <div className="obsidian-card obsidian-card-hover rounded-2xl p-5 relative overflow-hidden group">
                <div className={`absolute top-0 right-0 w-28 h-28 ${isProfitable ? 'bg-emerald-500/10 group-hover:bg-emerald-500/20' : 'bg-rose-500/10 group-hover:bg-rose-500/20'} rounded-full blur-2xl pointer-events-none transition-all`} />
                
                <div className="flex items-center justify-between mb-3">
                    <span className={`text-[10px] font-mono font-bold tracking-[0.18em] uppercase ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        Realized Profit
                    </span>
                    <div className={`w-8 h-8 rounded-xl ${isProfitable ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} border flex items-center justify-center`}>
                        {isProfitable ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                    </div>
                </div>

                <div className="mt-1">
                    <div className={`text-2xl lg:text-3xl font-bold tracking-tight font-serif ${isProfitable ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isProfitable ? '+' : ''}{formatCurrency(metrics.realized_profit)}
                    </div>
                    <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${isProfitable ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        Net Profit on Closed Lots
                    </p>
                </div>
            </div>
        </div>
    )
}
