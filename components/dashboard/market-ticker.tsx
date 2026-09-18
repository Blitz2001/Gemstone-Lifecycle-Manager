'use client'

import { Radio, Flame, Gem, TrendingUp, ShieldCheck, Activity } from 'lucide-react'

export function MarketTicker() {
    const tickerItems = [
        {
            icon: Radio,
            label: "RATNAPURA ASSAY DESK",
            value: "LIVE (UTC+05:30)",
            color: "text-emerald-400",
            dot: "bg-emerald-400 animate-pulse"
        },
        {
            icon: Gem,
            label: "ROYAL BLUE SAPPHIRE SPOT",
            value: "$2,450 / ct",
            trend: "+2.4%",
            color: "text-blue-400",
            trendColor: "text-emerald-400"
        },
        {
            icon: Flame,
            label: "KILN #02 (GAS REDUCTION)",
            value: "1,680°C SOAKING",
            color: "text-amber-400",
            dot: "bg-amber-400 animate-pulse"
        },
        {
            icon: Gem,
            label: "PADPARADSCHA BENCHMARK",
            value: "$8,900 / ct",
            trend: "+4.1%",
            color: "text-pink-400",
            trendColor: "text-emerald-400"
        },
        {
            icon: TrendingUp,
            label: "USD / LKR SPOT",
            value: "308.45",
            trend: "+0.12%",
            color: "text-sky-400",
            trendColor: "text-slate-300"
        },
        {
            icon: ShieldCheck,
            label: "VAULT CUSTODY",
            value: "100% VERIFIED",
            color: "text-indigo-400"
        }
    ]

    return (
        <div className="w-full bg-[#090d16] border-y border-white/5 py-2 px-4 overflow-hidden relative">
            <div className="flex items-center gap-8 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap text-[11px] font-mono">
                {tickerItems.map((item, idx) => {
                    const Icon = item.icon
                    return (
                        <div key={idx} className="inline-flex items-center gap-2 flex-shrink-0">
                            {item.dot ? (
                                <span className={`w-1.5 h-1.5 rounded-full ${item.dot}`} />
                            ) : (
                                <Icon className={`w-3.5 h-3.5 ${item.color}`} />
                            )}
                            <span className="text-slate-400 font-semibold tracking-wider">{item.label}:</span>
                            <span className="text-white font-bold">{item.value}</span>
                            {item.trend && (
                                <span className={`text-[10px] font-bold ${item.trendColor}`}>
                                    {item.trend}
                                </span>
                            )}
                            {idx < tickerItems.length - 1 && (
                                <span className="text-slate-700 ml-4">✦</span>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
