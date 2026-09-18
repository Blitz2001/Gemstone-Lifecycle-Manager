import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Layers, Scale, Sparkles } from 'lucide-react'

interface CompositionItem {
    pieces: number
    carats: number
}

interface LotCompositionDisplayProps {
    composition: Record<string, CompositionItem>
    currentComposition?: Record<string, CompositionItem>
}

export function LotCompositionDisplay({ composition, currentComposition }: LotCompositionDisplayProps) {
    if (!composition || Object.keys(composition).length === 0) {
        return null
    }

    const totalPieces = Object.values(composition).reduce((acc, item) => acc + item.pieces, 0)
    const totalCarats = Object.values(composition).reduce((acc, item) => acc + item.carats, 0)

    // Check if we have current comparison data and if it differs from initial
    const hasComparison = !!currentComposition && Object.keys(currentComposition).length > 0
    const currentPieces = hasComparison
        ? Object.values(currentComposition).reduce((acc, item) => acc + (Number(item.pieces) || 0), 0)
        : totalPieces
    const currentCarats = hasComparison
        ? Object.values(currentComposition).reduce((acc, item) => acc + (Number(item.carats) || 0), 0)
        : totalCarats

    // Detect if stones have undergone transformation (e.g. Rough -> Cut/Graded)
    const isTransformed = hasComparison && (
        Object.keys(composition).some(type => (composition[type]?.carats || 0) > 0 && !(currentComposition?.[type]?.carats > 0)) ||
        Object.keys(currentComposition || {}).some(type => (currentComposition[type]?.carats || 0) > 0 && !(composition?.[type]?.carats > 0))
    )

    // Helper for direct numeric diff styling
    const getDiffStyle = (val: number) => {
        if (Math.abs(val) < 0.001) return "text-slate-500 font-mono"
        if (val > 0) return "text-emerald-400 font-mono font-semibold"
        return "text-rose-400 font-mono font-semibold" // Loss
    }

    const allTypes = Array.from(new Set([
        ...Object.keys(composition),
        ...Object.keys(currentComposition || {})
    ])).sort()

    return (
        <div className="obsidian-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                        <Layers className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold font-serif text-white">
                            Mineral Composition Analysis {hasComparison ? "(Initial vs Current Stock)" : "(Intake)"}
                        </h3>
                        <p className="text-xs text-slate-400">
                            {hasComparison
                                ? isTransformed
                                    ? "Stones categorized across processing stages from initial rough to faceted stock."
                                    : "Live stone count and carat weight tracking across stages."
                                : "Initial rough stone composition recorded at procurement."}
                        </p>
                    </div>
                </div>

                {hasComparison && totalCarats > 0 && (
                    <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-xs text-slate-400">Total Retention:</span>
                        <span className={cn(
                            "font-mono font-bold px-2.5 py-1 text-xs rounded-full border",
                            (currentCarats / totalCarats) >= 0.4
                                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                : "bg-amber-500/10 text-amber-300 border-amber-500/30"
                        )}>
                            {((currentCarats / totalCarats) * 100).toFixed(1)}% RECOVERED
                        </span>
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="mt-5 rounded-xl border border-white/5 overflow-hidden">
                <div className="overflow-x-auto">
                    {/* Header Row */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-white/[0.03] text-xs font-semibold text-slate-400 min-w-[640px] uppercase font-mono tracking-wider">
                        <div className="col-span-4">Mineral Classification</div>
                        <div className="col-span-3 text-right border-l border-white/5 px-2">Initial (Pcs / Cts)</div>
                        {hasComparison && <div className="col-span-3 text-right border-l border-white/5 px-2">Current Stock</div>}
                        {hasComparison && <div className="col-span-2 text-right border-l border-white/5 px-2">Kerf Variance</div>}
                    </div>

                    {/* Data Rows */}
                    {allTypes.map(type => {
                        const initial = composition[type] || { pieces: 0, carats: 0 }
                        const current = currentComposition?.[type] || { pieces: 0, carats: 0 }

                        const diffCts = hasComparison ? (current.carats - initial.carats) : 0
                        const isProcessedRough = hasComparison && initial.carats > 0 && current.carats === 0
                        const isYieldProduced = hasComparison && initial.carats === 0 && current.carats > 0

                        return (
                            <div key={type} className="grid grid-cols-12 gap-2 p-3 text-sm border-t border-white/5 hover:bg-white/[0.02] items-center min-w-[640px] transition-colors">
                                <div className="col-span-4 font-medium text-slate-200 truncate flex items-center gap-2" title={type}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span>{type}</span>
                                </div>

                                {/* Initial */}
                                <div className={`col-span-3 text-right border-l border-white/5 px-2 font-mono ${initial.carats === 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                                    {initial.pieces} pcs / <strong className="text-white">{initial.carats.toFixed(2)} ct</strong>
                                </div>

                                {/* Current */}
                                {hasComparison && (
                                    <div className={`col-span-3 text-right border-l border-white/5 px-2 font-mono ${current.carats === 0 ? 'text-slate-600' : 'text-slate-300'}`}>
                                        {current.pieces} pcs / <strong className="text-white">{current.carats.toFixed(2)} ct</strong>
                                    </div>
                                )}

                                {/* Status / Diff */}
                                {hasComparison && (
                                    <div className="col-span-2 text-right border-l border-white/5 px-2 text-xs">
                                        {isProcessedRough ? (
                                            <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                                                Processed
                                            </span>
                                        ) : isYieldProduced ? (
                                            <div className="flex items-center justify-end gap-1.5">
                                                <span className="text-emerald-400 font-mono font-bold">
                                                    +{current.carats.toFixed(2)} ct
                                                </span>
                                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                                                    Cut
                                                </span>
                                            </div>
                                        ) : (
                                            <span className={getDiffStyle(diffCts)}>
                                                {diffCts > 0 ? '+' : ''}{diffCts.toFixed(2)} ct
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Totals Row */}
                    <div className="grid grid-cols-12 gap-2 p-3 bg-white/[0.04] font-semibold text-sm min-w-[640px] border-t border-white/10 items-center">
                        <div className="col-span-4 text-white font-serif tracking-wide">Aggregate Total</div>
                        <div className="col-span-3 text-right border-l border-white/5 px-2 font-mono text-slate-300">
                            {totalPieces} pcs / <strong className="text-white font-bold">{totalCarats.toFixed(2)} ct</strong>
                        </div>
                        {hasComparison && (
                            <div className="col-span-3 text-right border-l border-white/5 px-2 font-mono text-slate-300">
                                {currentPieces} pcs / <strong className="text-white font-bold">{currentCarats.toFixed(2)} ct</strong>
                            </div>
                        )}
                        {hasComparison && (
                            <div className="col-span-2 text-right border-l border-white/5 px-2 font-mono text-xs">
                                {(() => {
                                    const netDiff = currentCarats - totalCarats
                                    return (
                                        <span className={cn(
                                            "font-bold",
                                            netDiff < 0 ? "text-amber-400" : netDiff > 0 ? "text-emerald-400" : "text-slate-400"
                                        )}>
                                            {netDiff > 0 ? '+' : ''}{netDiff.toFixed(2)} ct
                                        </span>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Retention Bar at bottom */}
            {hasComparison && totalCarats > 0 && (
                <div className="mt-4 p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs">
                        <span className="font-semibold uppercase tracking-wider text-slate-400 font-mono">
                            Material Kerf &amp; Retention Diagnostic
                        </span>
                        <div className="flex items-center gap-2 font-mono text-slate-300">
                            <span>Yield:</span>
                            <span className="font-bold text-white">
                                {((currentCarats / totalCarats) * 100).toFixed(1)}%
                            </span>
                            <span className="text-slate-600">|</span>
                            <span>Kerf Loss:</span>
                            <span className="text-rose-400 font-bold">
                                {(100 - (currentCarats / totalCarats) * 100).toFixed(1)}%
                            </span>
                        </div>
                    </div>

                    <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div
                            className="h-full bg-emerald-500 rounded-l-full"
                            style={{ width: `${Math.min(100, Math.max(0, (currentCarats / totalCarats) * 100))}%` }}
                        />
                        <div
                            className="h-full bg-rose-500 rounded-r-full"
                            style={{ width: `${Math.max(0, 100 - (currentCarats / totalCarats) * 100)}%` }}
                        />
                    </div>

                    <div className="flex justify-between text-[11px] text-slate-400 font-mono pt-1">
                        <span>Rough Intake: {totalCarats.toFixed(2)} ct ({totalPieces} pcs)</span>
                        <span>Current Faceted Stock: {currentCarats.toFixed(2)} ct ({currentPieces} pcs)</span>
                    </div>
                </div>
            )}
        </div>
    )
}
