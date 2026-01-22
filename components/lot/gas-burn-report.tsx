'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LotStage, STAGE_SEQUENCE } from '@/lib/state-machine'

interface GasBurnReportProps {
    lotId: string
    stageData: any // JSONB
    initialComposition?: Record<string, { pieces: number, carats: number }>
    currentComposition?: Record<string, { pieces: number, carats: number }>
    currentStage?: string
}

export function GasBurnReport({ lotId, stageData, initialComposition, currentComposition, currentStage }: GasBurnReportProps) {

    if (!stageData || !stageData.breakdown) {
        return (
            <Card>
                <CardHeader><CardTitle>Gas Burn Analytics</CardTitle></CardHeader>
                <CardContent>No data available for report.</CardContent>
            </Card>
        )
    }

    const rawBreakdown = stageData.breakdown || []

    // --- LOGIC: Historical vs Live ---
    // If the lot has moved PAST 'CUT_POLISH', we should stop trying to sync weights with currentComposition,
    // because currentComposition now reflects Electric Burn (or later) weights/items.
    const currentSeq = currentStage ? STAGE_SEQUENCE[currentStage as LotStage] : 0
    const cutPolishSeq = STAGE_SEQUENCE[LotStage.CUT_POLISH]
    const useLiveWeights = currentSeq <= cutPolishSeq

    // --- WEIGHT ADJUSTMENT LOGIC ---
    // The breakdown is a snapshot at transition. Subsequent updates (measurements) update currentComposition.
    // We must scale the breakdown weights to match currentComposition so the report reflects the latest weights.

    const adjustedBreakdown = rawBreakdown.map((item: any) => {
        if (!useLiveWeights || !initialComposition || !currentComposition) return item

        const isSourceType = initialComposition[item.color] !== undefined
        // Match key generation logic from page.tsx
        const key = isSourceType ? item.color : `${item.color} ${item.clarity}`

        const currentStats = currentComposition[key]

        // If we have current stats, we might need to scale.
        // BUT, complex case: multiple breakdown rows might map to one composition key.
        // We need the TOTAL breakdown weight for this key to calculate the ratio.
        return { ...item, _key: key }
    })

    // Calculate totals per key from the breakdown snapshot
    const breakdownTotals: Record<string, number> = {}
    adjustedBreakdown.forEach((item: any) => {
        if (item._key) {
            breakdownTotals[item._key] = (breakdownTotals[item._key] || 0) + (item.carats || 0)
        }
    })

    // Apply scaling
    const breakdown = adjustedBreakdown.map((item: any) => {
        if (!item._key || !currentComposition || !useLiveWeights) return item

        const currentTotal = currentComposition[item._key]?.carats || 0
        const snapshotTotal = breakdownTotals[item._key] || 0

        // If weights differ significantly (>0.01), scale this item
        if (snapshotTotal > 0 && Math.abs(currentTotal - snapshotTotal) > 0.01) {
            const ratio = currentTotal / snapshotTotal
            return {
                ...item,
                carats: Number((item.carats * ratio).toFixed(2)),
                _original_carats: item.carats // Keep track if needed (optional)
            }
        }
        return item
    })


    // --- YIELD ANALYSIS LOGIC ---
    let yieldRows: any[] = []
    let totalUsed = 0
    let totalYield = 0

    if (initialComposition) {
        // Group breakdown results by source_type (or color if no source specified/remainder)
        // Actually, we want to map from Initial Sources -> Output
        // For each Initial Source Type:
        // 1. Used = Initial Weight - Remainder Weight
        // 2. Yield = Sum of Transformed Stones from this Source

        Object.keys(initialComposition).forEach(sourceKey => {
            const initial = initialComposition[sourceKey]

            // Find Remainder (Item in breakdown where color == sourceKey, or source_type == sourceKey and no color change)
            // Based on our form, Remainder has color = sourceKey
            const remainderItem = breakdown.find((b: any) => b.color === sourceKey)
            const remainderWeight = remainderItem ? (remainderItem.carats || 0) : 0

            const usedWeight = Math.max(0, initial.carats - remainderWeight)

            // Find Yield (Items where source_type == sourceKey AND color != sourceKey)
            // Note: our restored form saves `source_type`.
            const transformedItems = breakdown.filter((b: any) => b.source_type === sourceKey && b.color !== sourceKey)
            const yieldWeight = transformedItems.reduce((sum: number, b: any) => sum + (b.carats || 0), 0)

            if (usedWeight > 0) {
                const loss = usedWeight - yieldWeight
                const lossPct = usedWeight > 0 ? (loss / usedWeight) * 100 : 0

                totalUsed += usedWeight
                totalYield += yieldWeight

                yieldRows.push({
                    source: sourceKey,
                    used: usedWeight,
                    yield: yieldWeight,
                    loss: loss,
                    lossPct: lossPct
                })
            }
        })
    }

    const totalLoss = totalUsed - totalYield
    const totalLossPct = totalUsed > 0 ? (totalLoss / totalUsed) * 100 : 0


    return (
        <Card className="col-span-2">
            <CardHeader>
                <CardTitle>Gas Burn Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* 1. Standard Results Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-left font-medium py-2">Source</th>
                                <th className="text-left font-medium py-2">Color</th>
                                <th className="text-left font-medium py-2">Clarity</th>
                                <th className="text-right font-medium py-2">Weight (ct)</th>
                                <th className="text-right font-medium py-2">Pieces</th>
                            </tr>
                        </thead>
                        <tbody>
                            {breakdown
                                .filter((item: any) => (item.carats || 0) > 0)
                                .map((item: any, idx: number) => (
                                    <tr key={idx} className="border-b last:border-0 hover:bg-muted/50">
                                        <td className="py-2 text-muted-foreground">{item.source_type || '-'}</td>
                                        <td className="py-2 font-medium">{item.color}</td>
                                        {/* Handle empty clarity (legacy or remainder) */}
                                        <td className="py-2">{item.clarity === '-' ? <span className="text-muted-foreground">-</span> : item.clarity}</td>
                                        <td className="py-2 text-right font-mono">{item.carats}</td>
                                        <td className="py-2 text-right font-mono">{item.pieces || '-'}</td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>

                {/* 2. Yield Analysis Table (if data exists) */}
                {yieldRows.length > 0 && (
                    <div className="rounded-md border p-4 bg-slate-50/50">
                        <h4 className="font-semibold text-sm mb-3">Transformation Yield Analysis</h4>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-muted-foreground">
                                    <th className="text-left font-medium py-2 text-xs uppercase">Source</th>
                                    <th className="text-right font-medium py-2 text-xs uppercase">Used (ct)</th>
                                    <th className="text-right font-medium py-2 text-xs uppercase">Yield (ct)</th>
                                    <th className="text-right font-medium py-2 text-xs uppercase">Loss (ct)</th>
                                    <th className="text-right font-medium py-2 text-xs uppercase">Loss %</th>
                                </tr>
                            </thead>
                            <tbody>
                                {yieldRows.map((row, idx) => (
                                    <tr key={idx} className="border-b last:border-0">
                                        <td className="py-2 font-medium">{row.source}</td>
                                        <td className="py-2 text-right font-mono text-muted-foreground">{row.used.toFixed(2)}</td>
                                        <td className="py-2 text-right font-mono text-blue-600 font-semibold">{row.yield.toFixed(2)}</td>
                                        <td className="py-2 text-right font-mono text-red-600">{row.loss.toFixed(2)}</td>
                                        <td className="py-2 text-right font-mono text-red-600">{row.lossPct.toFixed(1)}%</td>
                                    </tr>
                                ))}
                                <tr className="border-t font-semibold bg-slate-100/50">
                                    <td className="py-2">Total</td>
                                    <td className="py-2 text-right font-mono">{totalUsed.toFixed(2)}</td>
                                    <td className="py-2 text-right font-mono text-blue-700">{totalYield.toFixed(2)}</td>
                                    <td className="py-2 text-right font-mono text-red-700">{totalLoss.toFixed(2)}</td>
                                    <td className="py-2 text-right font-mono text-red-700">{totalLossPct.toFixed(1)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}

                {stageData.notes && (
                    <div className="pt-2 border-t">
                        <h4 className="font-semibold mb-2 text-xs uppercase tracking-wide text-muted-foreground">Notes</h4>
                        <p className="text-sm">{stageData.notes}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}
