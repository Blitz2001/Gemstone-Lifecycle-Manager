import { LotStage, STAGE_DISPLAY_NAMES } from '@/lib/state-machine'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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
        <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Stage History</h3>
            <div className="relative border-l border-muted ml-3 space-y-8">
                {/* Active Stage Indicator */}
                <div className="ml-6 relative">
                    <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary ring-4 ring-background" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium leading-none">{getDisplayName(currentStage)}</span>
                        <span className="text-xs text-muted-foreground mt-1">
                            Current Stage
                        </span>
                    </div>
                </div>

                {processedLogs.map((log) => (
                    <div key={log.id} className="ml-6 relative">
                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full bg-muted ring-4 ring-background" />
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-medium leading-none text-muted-foreground">{getDisplayName(log.stage)}</span>
                            <span className="text-xs text-muted-foreground">
                                {(log.stage === 'PROCUREMENT' || log.stage === LotStage.PROCUREMENT) && purchaseDate
                                    ? `Buying Date: ${new Date(purchaseDate).toLocaleDateString(undefined, { dateStyle: 'long' })}`
                                    : `Completed: ${new Date(log.created_at || log.entered_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                                }
                            </span>

                            {/* Stage Output/Yield Display */}
                            {log.carats > 0 && (
                                <span className="text-xs font-medium text-foreground">
                                    Stage Output: <span className="font-semibold font-mono">{log.carats.toFixed(2)} ct</span>
                                    {log.pieces > 0 && <span className="text-muted-foreground font-normal"> ({log.pieces} {log.pieces === 1 ? 'pc' : 'pcs'})</span>}
                                </span>
                            )}

                            {/* Cost Display */}
                            {log.cost > 0 && (
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Cost: LKR {Number(log.cost).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}

                            {/* Stage Loss/Gain Display */}
                            {log.delta && (
                                <div className="mt-1 p-2 bg-muted/30 rounded text-xs grid grid-cols-2 gap-x-4 gap-y-1 w-fit border">
                                    <span className="text-muted-foreground col-span-2 font-medium mb-0.5 border-b pb-0.5">Stage Impact</span>

                                    <span className="text-muted-foreground">Weight:</span>
                                    <span className={cn("font-mono text-right", log.delta.carats < 0 ? "text-red-500" : "text-green-600")}>
                                        {log.delta.carats > 0 ? '+' : ''}{log.delta.carats.toFixed(2)} ct
                                    </span>

                                    <span className="text-muted-foreground">Pieces:</span>
                                    <span className={cn("font-mono text-right", log.delta.pieces < 0 ? "text-red-500" : "text-green-600")}>
                                        {log.delta.pieces > 0 ? '+' : ''}{log.delta.pieces}
                                    </span>

                                    {log.delta.retentionRate !== undefined && (
                                        <>
                                            <span className="text-muted-foreground">Retention:</span>
                                            <span className={cn("font-mono text-right font-medium", log.delta.retentionRate < 100 ? "text-amber-500" : "text-green-600")}>
                                                {log.delta.retentionRate}%
                                            </span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    )
}
