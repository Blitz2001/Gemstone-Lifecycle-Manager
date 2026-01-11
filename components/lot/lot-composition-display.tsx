import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
    const hasComparison = !!currentComposition

    // Helper for diff styling
    const getDiffStyle = (val: number) => {
        if (val === 0) return "text-muted-foreground"
        if (val > 0) return "text-green-600"
        return "text-red-500" // Loss
    }

    return (
        <Card className="col-span-full">
            <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">
                    Composition Analysis {hasComparison ? "(Initial vs Current)" : "(Initial)"}
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-x-auto">
                    {/* Header */}
                    <div className="grid grid-cols-12 gap-2 p-2 border-b bg-muted/50 text-xs font-medium text-muted-foreground min-w-[600px]">
                        <div className="col-span-3">Type</div>
                        <div className="col-span-3 text-right border-l px-2">Initial (Pcs / Cts)</div>
                        {hasComparison && <div className="col-span-3 text-right border-l px-2">Current (Pcs / Cts)</div>}
                        {hasComparison && <div className="col-span-3 text-right border-l px-2">Diff (Cts)</div>}
                    </div>

                    {/* Combine all unique keys from both Initial and Current */}
                    {Array.from(new Set([...Object.keys(composition), ...Object.keys(currentComposition || {})])).sort().map(type => {
                        const initial = composition[type] || { pieces: 0, carats: 0 }
                        const current = currentComposition?.[type] || { pieces: 0, carats: 0 }

                        const diffPcs = hasComparison ? (current.pieces - initial.pieces) : 0
                        const diffCts = hasComparison ? (current.carats - initial.carats) : 0

                        return (
                            <div key={type} className="grid grid-cols-12 gap-2 p-2 text-sm border-b last:border-0 hover:bg-muted/10 min-w-[600px]">
                                <div className="col-span-3 font-medium truncate" title={type}>{type}</div>

                                {/* Initial Data */}
                                <div className={`col-span-3 text-right border-l px-2 tabular-nums ${initial.carats === 0 ? 'text-muted-foreground/50' : ''}`}>
                                    {initial.pieces} / {initial.carats.toFixed(2)}
                                </div>

                                {/* Current Data */}
                                {hasComparison && (
                                    <div className={`col-span-3 text-right border-l px-2 tabular-nums ${current.carats === 0 ? 'text-muted-foreground/50' : ''}`}>
                                        {current.pieces} / {current.carats.toFixed(2)}
                                    </div>
                                )}

                                {/* Diff Data */}
                                {hasComparison && (
                                    <div className="col-span-3 text-right border-l px-2 tabular-nums font-medium">
                                        <span className={getDiffStyle(diffCts)}>{diffCts > 0 ? '+' : ''}{diffCts.toFixed(2)}</span>
                                    </div>
                                )}
                            </div>
                        )
                    })}

                    {/* Totals Row */}
                    <div className="grid grid-cols-12 gap-2 p-2 bg-muted/20 font-semibold text-sm min-w-[600px]">
                        <div className="col-span-3">Total</div>
                        <div className="col-span-3 text-right border-l px-2 tabular-nums">
                            {totalPieces} / {totalCarats.toFixed(2)}
                        </div>
                        {hasComparison && (
                            <div className="col-span-3 text-right border-l px-2 tabular-nums">
                                {Object.values(currentComposition || {}).reduce((a, b) => a + b.pieces, 0)} /
                                {Object.values(currentComposition || {}).reduce((a, b) => a + b.carats, 0).toFixed(2)}
                            </div>
                        )}
                        {hasComparison && (
                            <div className="col-span-3 text-right border-l px-2 tabular-nums">
                                {(() => {
                                    const curCts = Object.values(currentComposition || {}).reduce((a, b) => a + b.carats, 0)
                                    const dC = curCts - totalCarats
                                    return <span className={getDiffStyle(dC)}>{dC > 0 ? '+' : ''}{dC.toFixed(2)}</span>
                                })()}
                            </div>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}
