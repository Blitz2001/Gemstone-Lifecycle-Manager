'use client'

import { useState, useEffect } from 'react'
import { getDashboardLots } from '@/lib/actions'
import { LotStage, STAGE_DISPLAY_NAMES, STAGE_SEQUENCE, normalizeStage } from '@/lib/state-machine'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import { Loader2 } from 'lucide-react'

// Define columns strictly by sequence
const COLUMNS = Object.keys(STAGE_SEQUENCE).sort((a, b) => STAGE_SEQUENCE[a as LotStage] - STAGE_SEQUENCE[b as LotStage]) as LotStage[]

export function KanbanBoard() {
    const [lots, setLots] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchLots() {
            try {
                const data = await getDashboardLots()
                setLots(data)
            } catch (error) {
                console.error("Failed to fetch dashboard lots", error)
            } finally {
                setLoading(false)
            }
        }
        fetchLots()
    }, [])

    if (loading) {
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-muted-foreground" /></div>
    }

    return (
        <div className="h-full overflow-x-auto pb-4">
            <div className="flex gap-4 min-w-[1200px]">
                {COLUMNS.map(stage => {
                    const stageLots = lots.filter(l => {
                        const normalizedCurrent = normalizeStage(l.current_stage)

                        // Special Handling for SOLD column
                        if (stage === LotStage.SOLD) {
                            // Include strict SOLD (if any) OR (Sell Ready AND Finalized)
                            if (normalizedCurrent === LotStage.SOLD) return true
                            if (normalizedCurrent === LotStage.SELL_READY && l.is_finalized) return true
                            return false
                        }

                        // Special Handling for SELL_READY column
                        if (stage === LotStage.SELL_READY) {
                            // Exclude if finalized (it moved to SOLD column)
                            if (l.is_finalized) return false
                            return normalizedCurrent === LotStage.SELL_READY
                        }

                        // Standard check for other columns
                        return normalizedCurrent === stage
                    })
                    return (
                        <div key={stage} className="w-[300px] flex-shrink-0 flex flex-col gap-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                                    {STAGE_DISPLAY_NAMES[stage]}
                                </h3>
                                <Badge variant="secondary" className="text-xs font-mono">
                                    {stageLots.length}
                                </Badge>
                            </div>

                            <div className="flex flex-col gap-3 min-h-[200px] bg-muted/30 p-2 rounded-lg border border-dashed border-transparent hover:border-muted-foreground/20 transition-colors">
                                {stageLots.map(lot => (
                                    <Link key={lot.id} href={`/lots/${lot.id}`} className="block">
                                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                                            <CardHeader className="p-4 pb-2">
                                                <div className="flex justify-between items-start">
                                                    <CardTitle className="text-sm font-bold text-primary">
                                                        {lot.lot_code}
                                                    </CardTitle>
                                                    {lot.is_finalized && (
                                                        <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-500">
                                                            SEALED
                                                        </Badge>
                                                    )}
                                                </div>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-2 text-xs text-muted-foreground space-y-1">
                                                <div className="flex justify-between">
                                                    <span>Cost:</span>
                                                    <span className="font-medium text-foreground">
                                                        {(Number(lot.total_cost) || (Number(lot.purchase_price) || 0)).toLocaleString()}
                                                    </span>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    </Link>
                                ))}
                                {stageLots.length === 0 && (
                                    <div className="h-24 flex items-center justify-center text-xs text-muted-foreground italic">
                                        Empty
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
