'use client'

import { useState, useEffect } from 'react'
import { getDashboardLots } from '@/lib/actions'
import { LotStage, STAGE_DISPLAY_NAMES, STAGE_SEQUENCE, normalizeStage } from '@/lib/state-machine'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from 'next/link'
import { Badge } from "@/components/ui/badge"
import { Loader2, Search } from 'lucide-react'
import { Input } from "@/components/ui/input"

// Define columns strictly by sequence
const COLUMNS = Object.keys(STAGE_SEQUENCE).sort((a, b) => STAGE_SEQUENCE[a as LotStage] - STAGE_SEQUENCE[b as LotStage]) as LotStage[]

export function KanbanBoard() {
    const [lots, setLots] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

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
        return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-white/50" /></div>
    }

    // Filter lots
    const filteredLots = lots.filter(lot =>
        lot.lot_code.toLowerCase().includes(searchQuery.toLowerCase())
    )

    return (
        <div className="h-full flex flex-col gap-4">
            {/* Search Bar */}
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-white/50" />
                <Input
                    type="search"
                    placeholder="Search Lots..."
                    className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:bg-white/10 transition-colors backdrop-blur-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="flex-1 overflow-y-auto pb-4 pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                    {COLUMNS.map(stage => {
                        const stageLots = filteredLots.filter(l => {
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
                            <div key={stage} className="flex flex-col gap-3 h-full">
                                <div className="flex items-center justify-between px-1">
                                    <h3 className="font-semibold text-sm text-white/70 uppercase tracking-wider">
                                        {STAGE_DISPLAY_NAMES[stage]}
                                    </h3>
                                    <Badge variant="outline" className="text-xs font-mono border-white/20 text-white/80 bg-white/5">
                                        {stageLots.length}
                                    </Badge>
                                </div>

                                <div className="flex flex-col gap-3 min-h-[200px] bg-white/5 border border-white/5 p-2 rounded-xl backdrop-blur-sm transition-colors">
                                    {stageLots.map(lot => (
                                        <Link key={lot.id} href={`/lots/${lot.id}`} className="block">
                                            <Card className="hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer bg-white/5 border-white/10 shadow-lg">
                                                <CardHeader className="p-4 pb-2">
                                                    <div className="flex justify-between items-start">
                                                        <CardTitle className="text-sm font-bold text-white drop-shadow-sm">
                                                            {lot.lot_code}
                                                        </CardTitle>
                                                        {lot.is_finalized && (
                                                            <Badge variant="outline" className="text-[10px] border-emerald-500/50 text-emerald-400 bg-emerald-500/10 backdrop-blur-md">
                                                                SEALED
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </CardHeader>
                                                <CardContent className="p-4 pt-2 text-xs text-white/60 space-y-1">
                                                    <div className="flex justify-between">
                                                        <span>Cost:</span>
                                                        <span className="font-medium text-white/90">
                                                            {(Number(lot.total_cost) || (Number(lot.purchase_price) || 0)).toLocaleString()}
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))}
                                    {stageLots.length === 0 && (
                                        <div className="h-24 flex items-center justify-center text-xs text-white/30 italic">
                                            Empty
                                        </div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
