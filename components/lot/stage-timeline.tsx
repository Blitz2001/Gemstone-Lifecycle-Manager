import { LotStage, STAGE_DISPLAY_NAMES } from '@/lib/state-machine'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { History, ArrowDownRight, ArrowUpRight, Scale, Clock, CheckCircle2 } from 'lucide-react'

interface StageTimelineProps {
    currentStage: string
    logs: any[]
    isFinalized?: boolean
    purchaseDate?: string | null
}

export function StageTimeline({ currentStage, logs, isFinalized, purchaseDate }: StageTimelineProps) {
    // Sort logic consistent with display (Newest First) for the timeline, 
    // BUT we need chronological (Oldest First) to calculate deltas.
    const chronologicalLogs = [...logs].sort((a, b) => new Date(a.entered_at).getTime() - new Date(b.entered_at).getTime())

    // Helper to calculate total weight/pieces from a log's data
    const getLogMetrics = (log: any) => {
        let carats = 0
        let pieces = 0

        // 1. Certification Data (verified_carat)
        if (log.data?.verified_carat !== undefined && log.data?.verified_carat !== null) {
            carats = Number(log.data.verified_carat) || 0
            pieces = Number(log.data.verified_pieces) || Number(log.data.pieces) || 0
        }
        // 2. Sell Ready Data (valuations array)
        else if (log.data?.valuations && Array.isArray(log.data.valuations) && log.data.valuations.length > 0) {
            log.data.valuations.forEach((v: any) => {
                carats += Number(v.carats) || 0
                pieces += Number(v.pieces) || 0
            })
        }
        // 3. Electric Burn / Gas Burn Data (breakdown array)
        else if (log.data?.breakdown && Array.isArray(log.data.breakdown) && log.data.breakdown.length > 0) {
            log.data.breakdown.forEach((m: any) => {
                carats += Number(m.carats) || 0
                pieces += Number(m.pieces) || 0
            })
        }
        // 4. Standard Stage Data (measurements map)
        else if (log.data?.measurements && Object.keys(log.data.measurements).length > 0) {
            Object.values(log.data.measurements).forEach((m: any) => {
                carats += Number(m.carats) || 0
                pieces += Number(m.pieces) || 0
            })
        }
        // 5. Procurement Data (rough_composition)
        else if (log.data?.rough_composition && Object.keys(log.data.rough_composition).length > 0) {
            Object.values(log.data.rough_composition).forEach((m: any) => {
                carats += Number(m.carats) || 0
                pieces += Number(m.pieces) || 0
            })
        }

        // 6. Direct new_weight fallback
        if (carats === 0 && log.data?.new_weight) {
            carats = Number(log.data.new_weight) || 0
            pieces = Number(log.data?.pieces) || 0
        }

        return { carats, pieces }
    }

    // Enhance logs with delta (Difference from PREVIOUS log)
    const processedLogs = chronologicalLogs.map((log, index) => {
        const metrics = getLogMetrics(log)
        let delta = null

        if (index > 0) {
            const prevMetrics = getLogMetrics(chronologicalLogs[index - 1])
            // Only calculate delta if strict positive metrics exist to avoid noise
            if (prevMetrics.carats > 0 && metrics.carats > 0) {
                const caratsDelta = metrics.carats - prevMetrics.carats
                const piecesDelta = metrics.pieces - prevMetrics.pieces
                const retentionRate = Number(((metrics.carats / prevMetrics.carats) * 100).toFixed(1))
                delta = {
                    carats: caratsDelta,
                    pieces: piecesDelta,
                    retentionRate
                }
            }
        }
        return { ...log, ...metrics, delta }
    }).reverse() // Reverse back to Newest First for display

    // Helper to get display name
    const getDisplayName = (stage: string) => {
        if ((stage === 'SELL_READY' || stage === LotStage.SELL_READY) && isFinalized) return 'Sold'
        return STAGE_DISPLAY_NAMES[stage as LotStage] || stage
    }

    return (
        <div className="obsidian-card rounded-2xl p-6 border border-white/5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                        <History className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold font-serif text-white">Stage Progression &amp; Audit Trail</h3>
                        <p className="text-xs text-slate-400">Chronological ledger of physical transformations, kerf yields, and costs</p>
                    </div>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-white/[0.03] border border-white/5 px-2.5 py-1 rounded-full">
                    {logs.length} Recorded Steps
                </span>
            </div>

            <div className="relative border-l border-white/10 ml-4 space-y-7">
                {/* Active Stage Indicator */}
                <div className="ml-6 relative">
                    <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-500 ring-4 ring-[#080c14] shadow-[0_0_12px_rgba(59,130,246,0.8)]">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    </span>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white font-serif tracking-wide">
                                {getDisplayName(currentStage)}
                            </span>
                            <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                                ACTIVE STAGE
                            </span>
                        </div>
                        <span className="text-xs text-slate-400 mt-0.5">
                            Under current custody &amp; processing
                        </span>
                    </div>
                </div>

                {/* Past Logs */}
                {processedLogs.map((log) => (
                    <div key={log.id} className="ml-6 relative group">
                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-slate-800 border border-slate-600 ring-4 ring-[#080c14] group-hover:border-blue-400 transition-colors">
                            <CheckCircle2 className="w-2.5 h-2.5 text-slate-400 group-hover:text-blue-400" />
                        </span>
                        
                        <div className="bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 hover:border-white/10 p-4 rounded-xl transition-all space-y-2.5">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                <span className="text-sm font-bold text-slate-200 font-serif">
                                    {getDisplayName(log.stage)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    {(log.stage === 'PROCUREMENT' || log.stage === LotStage.PROCUREMENT) && purchaseDate
                                        ? `Buying Date: ${new Date(purchaseDate).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                                        : `${new Date(log.created_at || log.entered_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                                    }
                                </span>
                            </div>

                            {/* Stage Output and Cost Badges */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                                {log.carats > 0 && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-950/40 border border-blue-500/20 text-blue-300 font-mono">
                                        <Scale className="w-3 h-3 text-blue-400" />
                                        <span>Output: <strong>{log.carats.toFixed(2)} ct</strong></span>
                                        {log.pieces > 0 && <span className="text-slate-400">({log.pieces} pcs)</span>}
                                    </div>
                                )}

                                {log.cost > 0 && (
                                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-950/40 border border-emerald-500/20 text-emerald-300 font-mono">
                                        <span>Stage Cost: <strong>LKR {Number(log.cost).toLocaleString(undefined, { minimumFractionDigits: 0 })}</strong></span>
                                    </div>
                                )}
                            </div>

                            {/* Stage Delta / Yield Impact */}
                            {log.delta && (
                                <div className="mt-2 pt-2 border-t border-white/5 flex flex-wrap items-center gap-4 text-xs font-mono">
                                    <div className="flex items-center gap-1 text-slate-400">
                                        <span>Weight Diff:</span>
                                        <span className={cn(
                                            "font-bold flex items-center",
                                            log.delta.carats < 0 ? "text-rose-400" : "text-emerald-400"
                                        )}>
                                            {log.delta.carats < 0 ? <ArrowDownRight className="w-3 h-3" /> : <ArrowUpRight className="w-3 h-3" />}
                                            {log.delta.carats > 0 ? '+' : ''}{log.delta.carats.toFixed(2)} ct
                                        </span>
                                    </div>

                                    {log.delta.pieces !== 0 && (
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <span>Pieces:</span>
                                            <span className={log.delta.pieces < 0 ? "text-rose-400" : "text-emerald-400"}>
                                                {log.delta.pieces > 0 ? '+' : ''}{log.delta.pieces}
                                            </span>
                                        </div>
                                    )}

                                    {log.delta.retentionRate !== undefined && (
                                        <div className="flex items-center gap-1 text-slate-400">
                                            <span>Yield Retention:</span>
                                            <span className={cn(
                                                "font-bold px-1.5 py-0.5 rounded text-[11px]",
                                                log.delta.retentionRate < 100 
                                                    ? "bg-amber-500/10 border border-amber-500/20 text-amber-300" 
                                                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                                            )}>
                                                {log.delta.retentionRate}%
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
