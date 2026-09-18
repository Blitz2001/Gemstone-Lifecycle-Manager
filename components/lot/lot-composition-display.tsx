import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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
        if (Math.abs(val) < 0.001) return "text-muted-foreground"
        if (val > 0) return "text-emerald-600 dark:text-emerald-400 font-medium"
        return "text-red-500 font-medium" // Loss
    }

    const allTypes = Array.from(new Set([
        ...Object.keys(composition),
        ...Object.keys(currentComposition || {})
    ])).sort()

    return (
        <Card className="col-span-full">
            <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                        <CardTitle className="text-base font-semibold">
                            Composition Analysis {hasComparison ? "(Initial vs Current)" : "(Initial)"}
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                            {hasComparison
                                ? isTransformed
                                    ? "Stones categorized across processing stages from initial rough to faceted/treated stock."
                                    : "Live stone count and carat weight tracking across stages."
                                : "Initial rough stone composition recorded at procurement."}
                        </CardDescription>
                    </div>
                    {hasComparison && totalCarats > 0 && (
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                            <span className="text-xs text-muted-foreground">Recovery Yield:</span>
                            <Badge variant="outline" className={cn(
                                "font-mono font-semibold px-2 py-0.5 text-xs",
                                (currentCarats / totalCarats) >= 0.4
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                            )}>
                                {((currentCarats / totalCarats) * 100).toFixed(1)}%
                            </Badge>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="rounded-md border overflow-x-auto">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground min-w-[600px]">
                        <div className="col-span-4">Stone Type / Classification</div>
                        <div className="col-span-3 text-right border-l px-2">Initial (Pcs / Cts)</div>
                        {hasComparison && <div className="col-span-3 text-right border-l px-2">Current (Pcs / Cts)</div>}
                        {hasComparison && <div className="col-span-2 text-right border-l px-2">Status / Variance</div>}
                    </div>

                    {/* Rows */}
                    {allTypes.map(type => {
                        const initial = composition[type] || { pieces: 0, carats: 0 }
                        const current = currentComposition?.[type] || { pieces: 0, carats: 0 }

                        const diffCts = hasComparison ? (current.carats - initial.carats) : 0
                        const isProcessedRough = hasComparison && initial.carats > 0 && current.carats === 0
                        const isYieldProduced = hasComparison && initial.carats === 0 && current.carats > 0

                        return (
                            <div key={type} className="grid grid-cols-12 gap-2 p-2 text-sm border-b last:border-0 hover:bg-muted/10 items-center min-w-[600px]">
                                <div className="col-span-4 font-medium truncate" title={type}>
                                    {type}
                                </div>

                                {/* Initial Data */}
                                <div className={`col-span-3 text-right border-l px-2 tabular-nums ${initial.carats === 0 ? 'text-muted-foreground/40' : ''}`}>
                                    {initial.pieces} / {initial.carats.toFixed(2)}
                                </div>

                                {/* Current Data */}
                                {hasComparison && (
                                    <div className={`col-span-3 text-right border-l px-2 tabular-nums ${current.carats === 0 ? 'text-muted-foreground/40' : ''}`}>
                                        {current.pieces} / {current.carats.toFixed(2)}
                                    </div>
                                )}

                                {/* Status / Diff Data */}
                                {hasComparison && (
                                    <div className="col-span-2 text-right border-l px-2 tabular-nums text-xs">
                                        {isProcessedRough ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-normal">
                                                    Processed
                                                </Badge>
                                            </div>
                                        ) : isYieldProduced ? (
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                                                    +{current.carats.toFixed(2)}
                                                </span>
                                                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-normal">
                                                    Yield
                                                </Badge>
                                            </div>
                                        ) : (
                                            <span className={getDiffStyle(diffCts)}>
                                                {diffCts > 0 ? '+' : ''}{diffCts.toFixed(2)}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Totals Row */}
                    <div className="grid grid-cols-12 gap-2 p-2 bg-muted/20 font-semibold text-sm min-w-[600px] border-t items-center">
                        <div className="col-span-4">Total</div>
                        <div className="col-span-3 text-right border-l px-2 tabular-nums">
                            {totalPieces} / {totalCarats.toFixed(2)}
                        </div>
                        {hasComparison && (
                            <div className="col-span-3 text-right border-l px-2 tabular-nums">
                                {currentPieces} / {currentCarats.toFixed(2)}
                            </div>
                        )}
                        {hasComparison && (
                            <div className="col-span-2 text-right border-l px-2 tabular-nums font-mono text-xs">
                                {(() => {
                                    const netDiff = currentCarats - totalCarats
                                    return (
                                        <span className={cn(
                                            "font-bold",
                                            netDiff < 0 ? "text-amber-600 dark:text-amber-400" : netDiff > 0 ? "text-emerald-600" : "text-muted-foreground"
                                        )}>
                                            {netDiff > 0 ? '+' : ''}{netDiff.toFixed(2)} ct
                                        </span>
                                    )
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* Overall Recovery & Material Retention Summary Card */}
                {hasComparison && totalCarats > 0 && (
                    <div className="p-3.5 rounded-lg bg-muted/30 border space-y-2.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Overall Material Retention
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">Recovery Rate:</span>
                                <span className="font-mono font-bold text-sm text-foreground">
                                    {((currentCarats / totalCarats) * 100).toFixed(1)}%
                                </span>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all",
                                    (currentCarats / totalCarats) >= 0.5 ? "bg-emerald-500" : (currentCarats / totalCarats) >= 0.25 ? "bg-amber-500" : "bg-blue-500"
                                )}
                                style={{ width: `${Math.min(100, Math.max(0, (currentCarats / totalCarats) * 100))}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-[11px] text-muted-foreground font-mono pt-0.5">
                            <span>Initial Rough: {totalCarats.toFixed(2)} ct ({totalPieces} pcs)</span>
                            <span>
                                {currentCarats <= totalCarats
                                    ? `Cut/Process Variance: ${(totalCarats - currentCarats).toFixed(2)} ct (-${(((totalCarats - currentCarats) / totalCarats) * 100).toFixed(1)}%)`
                                    : `Net Gain: +${(currentCarats - totalCarats).toFixed(2)} ct`}
                            </span>
                            <span>Current Stock: {currentCarats.toFixed(2)} ct ({currentPieces} pcs)</span>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
